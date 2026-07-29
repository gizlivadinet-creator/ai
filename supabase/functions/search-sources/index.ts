// Supabase Edge Function: search-sources
//
// Proxies search queries out to a set of public sources so the frontend can
// query them without hitting CORS restrictions.
//
// Supported `source` values: wikipedia, duckduckgo, google, mdn, npm, pypi,
// github, gitlab, bitbucket, gist, codepen, archive, stackoverflow,
// rust (crates.io), laravel, microsoft, yandex
//
// Optional Edge Function secrets (all optional — every handler still works
// key-less if the matching secret is not set; this only unlocks higher rate
// limits / better results where the upstream service actually supports it):
//   GITHUB_API        - GitHub personal access token -> raises the search
//                        rate limit from ~10/min (anonymous) to ~30/min and
//                        includes private repos the token can see.
//   GITLAB_API        - GitLab personal access token (sent as PRIVATE-TOKEN).
//   BITBUCKET_API     - Bitbucket access token (sent as Bearer).
//   STACKOVERFLOW_API - Stack Exchange "app key" -> raises the daily quota
//                        from 300 to 10,000 requests (sent as ?key=).
//   GOOGLE_URL, YANDEX_URL, GIST_URL, CODEPEN_URL, LARAVEL_URL,
//   MICROSOFT_URL     - override the deep-link search URL template used for
//                        sources that have no free JSON search API. Value
//                        can contain a literal `{q}` placeholder (replaced
//                        with the encoded query) or, if omitted, the query
//                        is appended to the end of the value.
//
// Note on honesty: WIKIPEDIA_API, MDN_API, NPM_API, PYPI_API, ARCHIVE_API,
// DUCKDUCKGO_API and CRATESIO_API secrets are intentionally NOT read here —
// none of those upstream services has an API-key mechanism for search, so
// wiring a "key" into them would do nothing. Those endpoints are free and
// anonymous by nature; setting a secret for them is harmless but has no
// effect. Everything else below either calls a REAL public API or — where
// no free search API exists — returns a direct deep-link into that site's
// own search instead of fabricating results or scraping HTML.
//
// TWO MODES:
//   1. { query: string, sources: string[] }
//      Runs the search across the given sources and returns a short,
//      Turkish-translated {title, description} per hit (fast — used for the
//      result list). `snippet` is kept as an alias of `description` for
//      backward compatibility with older frontend builds.
//   2. { mode: 'content', url: string, source?: string }
//      Fetches the FULL page at `url` (no truncation beyond the safety
//      ceiling needed to keep the function from timing out/OOMing on a
//      pathological page), strips it down to readable text, and returns the
//      complete {title, description, content} translated into Turkish. This
//      is what powers "tam içeriği getir" (fetch full content) in the UI —
//      it deliberately does NOT summarize: every paragraph of extracted
//      text is translated and returned, chunk by chunk.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Optional auth/config secrets — read once at cold start, same pattern as
// generate-code/index.ts. Every one of these is allowed to be undefined.
const GITHUB_API = Deno.env.get('GITHUB_API') || '';
const GITLAB_API = Deno.env.get('GITLAB_API') || '';
const BITBUCKET_API = Deno.env.get('BITBUCKET_API') || '';
const STACKOVERFLOW_API = Deno.env.get('STACKOVERFLOW_API') || '';
const GOOGLE_URL = Deno.env.get('GOOGLE_URL') || '';
const YANDEX_URL = Deno.env.get('YANDEX_URL') || '';
const GIST_URL = Deno.env.get('GIST_URL') || '';
const CODEPEN_URL = Deno.env.get('CODEPEN_URL') || '';
const LARAVEL_URL = Deno.env.get('LARAVEL_URL') || '';
const MICROSOFT_URL = Deno.env.get('MICROSOFT_URL') || '';

interface SourceResult {
  source: string;
  title: string;
  url: string;
  snippet: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  try {
    const body = await req.json().catch(() => ({}));
    const mode: string = (body?.mode ?? 'search').toString();

    // --- Mode 2: full-content fetch for a single result -------------------
    if (mode === 'content') {
      const url: string = (body?.url ?? '').toString().trim();
      if (!url) return json({ error: 'url_required' }, 400);
      if (!/^https?:\/\//i.test(url)) return json({ error: 'invalid_url' }, 400);

      const repo = parseGithubRepoUrl(url);
      if (repo) {
        try {
          const repoContent = await fetchFullGithubRepo(repo.owner, repo.repo);
          const [title, description] = await Promise.all([
            translateToTurkish(repoContent.title),
            translateToTurkish(repoContent.description),
          ]);
          // The repository's actual source code is left UNTRANSLATED on
          // purpose — machine-translating code/identifiers would corrupt
          // it and make it unusable. Only the natural-language title and
          // repo description are translated; every file's real content
          // (including README prose) is returned exactly as committed so
          // nothing is altered or lost.
          return json({
            result: {
              title: title || repoContent.title,
              description: description || repoContent.description,
              content: repoContent.content,
              url,
            },
          });
        } catch (err) {
          console.error('search-sources github repo fetch failed:', err);
          // Fall through to the generic single-page fetch below so the
          // user still gets *something* (the repo's landing-page text)
          // instead of a hard failure.
        }
      }

      try {
        const page = await fetchFullPageText(url);
        const [title, description, content] = await Promise.all([
          translateToTurkish(page.title),
          translateToTurkish(page.description),
          translateToTurkish(page.text),
        ]);
        return json({
          result: {
            title: title || page.title,
            description: description || page.description,
            content: content || page.text,
            url,
          },
        });
      } catch (err) {
        console.error('search-sources content-fetch failed:', err);
        return json({ error: 'content_fetch_failed' }, 502);
      }
    }

    // --- Mode 1: search across sources -------------------------------------
    const query: string = (body?.query ?? '').toString().trim();
    const sources: string[] = Array.isArray(body?.sources) ? body.sources : [];

    if (!query) return json({ error: 'query_required' }, 400);
    if (query.length > 300) return json({ error: 'query_too_long' }, 400);
    if (sources.length === 0) return json({ error: 'sources_required' }, 400);

    const handlers: Record<string, (q: string) => Promise<SourceResult[]>> = {
      wikipedia: searchWikipedia,
      mdn: searchMdn,
      npm: searchNpm,
      pypi: searchPypi,
      github: searchGithub,
      gitlab: searchGitlab,
      bitbucket: searchBitbucket,
      gist: searchGist,
      codepen: searchCodepen,
      archive: searchArchive,
      google: searchGoogle,
      duckduckgo: searchDuckDuckGo,
      stackoverflow: searchStackOverflow,
      rust: searchCratesIo,
      laravel: searchLaravel,
      microsoft: searchMicrosoft,
      yandex: searchYandex,
    };

    const jobs = sources
      .filter((s) => handlers[s])
      .map((s) =>
        handlers[s](query).catch((err) => {
          console.error(`search-sources: ${s} failed`, err);
          return [] as SourceResult[];
        }),
      );

    const settled = await Promise.all(jobs);
    const rawResults = settled.flat();

    // Translate every hit's title + description to Turkish so the result
    // list is fully in the user's language, not just the linked-out pages.
    // Kept fast: this only translates the short title/snippet, never the
    // full page (that happens on-demand in mode "content").
    const results = await Promise.all(
      rawResults.map(async (r) => {
        const [title, description] = await Promise.all([
          translateToTurkish(r.title),
          translateToTurkish(r.snippet),
        ]);
        return {
          source: r.source,
          title: title || r.title,
          url: r.url,
          description: description || r.snippet,
          // Alias kept for older frontend builds that still read `snippet`.
          snippet: description || r.snippet,
        };
      }),
    );

    return json({ results });
  } catch (err) {
    console.error('search-sources error:', err);
    return json({ error: 'internal_error' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

async function fetchJson(url: string, headers: Record<string, string> = {}) {
  // Timed out (rather than left to hang indefinitely): a single slow/dead
  // upstream API used to be able to stall the whole search-sources call
  // since all source jobs are awaited together in Deno.serve.
  const res = await fetchWithTimeout(url, { headers: { 'User-Agent': 'immaculate-ai-search', ...headers } }, 8000);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

// Builds a deep-link URL from an optional secret override. If the secret
// contains a literal `{q}` placeholder, the query is substituted in place;
// otherwise the encoded query is appended to the end of the value. Falls
// back to `defaultUrl` (already a complete URL) when no secret is set.
function buildDeepLink(secretValue: string, defaultUrl: string, q: string): string {
  if (!secretValue) return defaultUrl;
  const encoded = encodeURIComponent(q);
  return secretValue.includes('{q}') ? secretValue.replace('{q}', encoded) : `${secretValue}${encoded}`;
}

// --- Free, key-less public APIs ------------------------------------------------

async function searchWikipedia(q: string): Promise<SourceResult[]> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&srlimit=8&origin=*`;
  const data = await fetchJson(url);
  return (data?.query?.search ?? []).map((r: any) => ({
    source: 'wikipedia',
    title: r.title,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, '_'))}`,
    snippet: stripHtml(r.snippet ?? ''),
  }));
}

async function searchMdn(q: string): Promise<SourceResult[]> {
  const url = `https://developer.mozilla.org/api/v1/search?q=${encodeURIComponent(q)}&locale=en-US`;
  const data = await fetchJson(url);
  return (data?.documents ?? []).slice(0, 8).map((d: any) => ({
    source: 'mdn',
    title: d.title,
    url: `https://developer.mozilla.org${d.mdn_url}`,
    snippet: d.summary ?? '',
  }));
}

async function searchNpm(q: string): Promise<SourceResult[]> {
  const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(q)}&size=8`;
  const data = await fetchJson(url);
  return (data?.objects ?? []).map((o: any) => ({
    source: 'npm',
    title: `${o.package.name}@${o.package.version}`,
    url: o.package.links?.npm ?? `https://www.npmjs.com/package/${o.package.name}`,
    snippet: o.package.description ?? '',
  }));
}

async function searchPypi(q: string): Promise<SourceResult[]> {
  try {
    const data = await fetchJson(`https://pypi.org/pypi/${encodeURIComponent(q)}/json`);
    return [
      {
        source: 'pypi',
        title: `${data.info.name} ${data.info.version}`,
        url: data.info.package_url,
        snippet: data.info.summary ?? '',
      },
    ];
  } catch {
    return [];
  }
}

async function searchGithub(q: string): Promise<SourceResult[]> {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=8`;
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
  if (GITHUB_API) headers.Authorization = `Bearer ${GITHUB_API}`;
  const data = await fetchJson(url, headers);
  return (data?.items ?? []).map((r: any) => ({
    source: 'github',
    title: r.full_name,
    url: r.html_url,
    snippet: r.description ?? '',
  }));
}

// ---------------------------------------------------------------------------
// Full GitHub repository fetch ("GitHub deposuna ne varsa tümünü eksiksiz
// çek") — pulls the ENTIRE file tree of the repo's default branch and the
// real text content of every non-binary file, not just the landing page.
// Uses the keyless (or, if GITHUB_API is set, higher-rate-limited) REST API
// for metadata/tree, and raw.githubusercontent.com for the actual file
// bytes (faster than the base64 Contents API and doesn't burn its rate
// limit budget separately).
// ---------------------------------------------------------------------------

interface GithubRepoRef {
  owner: string;
  repo: string;
}

// Recognizes a repo URL (https://github.com/{owner}/{repo}[/...]) and
// rejects non-repo GitHub URLs (profiles, search, topics, etc.) so those
// fall through to the generic single-page fetch instead.
function parseGithubRepoUrl(url: string): GithubRepoRef | null {
  try {
    const u = new URL(url);
    if (!/(^|\.)github\.com$/i.test(u.hostname)) return null;
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    const [owner, repoRaw] = parts;
    const NON_REPO_SEGMENTS = new Set([
      'search', 'topics', 'marketplace', 'sponsors', 'orgs', 'settings',
      'notifications', 'issues', 'pulls', 'explore', 'trending', 'collections',
    ]);
    if (NON_REPO_SEGMENTS.has(owner.toLowerCase())) return null;
    const repo = repoRaw.replace(/\.git$/, '');
    return { owner, repo };
  } catch {
    return null;
  }
}

const GITHUB_BINARY_EXT = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'bmp', 'avif',
  'woff', 'woff2', 'ttf', 'eot', 'otf',
  'mp3', 'mp4', 'mov', 'avi', 'webm', 'ogg', 'wav', 'flac',
  'zip', 'tar', 'gz', '7z', 'rar', 'jar', 'war',
  'pdf', 'psd', 'ai', 'sketch', 'fig',
  'exe', 'dll', 'so', 'dylib', 'bin', 'wasm', 'class', 'pyc',
]);

const GITHUB_SKIP_PATH_SEGMENTS = [
  'node_modules/', 'vendor/', 'dist/', 'build/', '.git/', 'coverage/',
  '.next/', '.nuxt/', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
];

// Safety ceilings — exist only so a single enormous monorepo can't time out
// or OOM the edge function. Every real-world small/medium repo (the vast
// majority of what people search for) is fetched 100% completely; these
// numbers are far above a typical repo's total text size.
const GITHUB_MAX_FILES = 150;
const GITHUB_MAX_FILE_BYTES = 80_000; // skip any single file bigger than this (almost always generated/vendored)
const GITHUB_MAX_TOTAL_BYTES = 1_200_000; // whole-repo cap across all files combined
const GITHUB_FETCH_CONCURRENCY = 10;

interface GithubFullRepo {
  title: string;
  description: string;
  content: string;
}

async function fetchFullGithubRepo(owner: string, repo: string): Promise<GithubFullRepo> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
  if (GITHUB_API) headers.Authorization = `Bearer ${GITHUB_API}`;

  const meta = await fetchJson(`https://api.github.com/repos/${owner}/${repo}`, headers);
  const defaultBranch: string = meta?.default_branch || 'main';

  const treeData = await fetchJson(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`,
    headers,
  );

  const allBlobs: { path: string; size: number }[] = (treeData?.tree ?? [])
    .filter((n: any) => n.type === 'blob')
    .map((n: any) => ({ path: n.path as string, size: (n.size as number) ?? 0 }));

  const truncatedTree = treeData?.truncated === true;

  const candidates = allBlobs.filter((f) => {
    const lower = f.path.toLowerCase();
    if (GITHUB_SKIP_PATH_SEGMENTS.some((seg) => lower.includes(seg))) return false;
    const ext = lower.includes('.') ? lower.split('.').pop()! : '';
    if (GITHUB_BINARY_EXT.has(ext)) return false;
    if (f.size > GITHUB_MAX_FILE_BYTES) return false;
    return true;
  });

  // README and top-level docs first, so if the total-size ceiling is ever
  // hit on a huge repo, the most important files are already included.
  candidates.sort((a, b) => {
    const rank = (p: string) => {
      const lower = p.toLowerCase();
      if (/^readme/.test(lower)) return 0;
      if (!lower.includes('/')) return 1;
      if (/^(docs|documentation)\//.test(lower)) return 2;
      return 3;
    };
    return rank(a.path) - rank(b.path) || a.path.localeCompare(b.path);
  });

  const selected = candidates.slice(0, GITHUB_MAX_FILES);
  const fileTexts: { path: string; text: string }[] = [];
  let totalBytes = 0;
  let skippedForSize = 0;

  for (let i = 0; i < selected.length; i += GITHUB_FETCH_CONCURRENCY) {
    if (totalBytes >= GITHUB_MAX_TOTAL_BYTES) {
      skippedForSize += selected.length - i;
      break;
    }
    const batch = selected.slice(i, i + GITHUB_FETCH_CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (f) => {
        try {
          const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(defaultBranch)}/${f.path
            .split('/')
            .map(encodeURIComponent)
            .join('/')}`;
          const res = await fetchWithTimeout(rawUrl, {}, 10000);
          if (!res.ok) return null;
          const text = await res.text();
          return { path: f.path, text };
        } catch {
          return null;
        }
      }),
    );
    for (const r of batchResults) {
      if (!r) continue;
      if (totalBytes + r.text.length > GITHUB_MAX_TOTAL_BYTES) {
        skippedForSize++;
        continue;
      }
      fileTexts.push(r);
      totalBytes += r.text.length;
    }
  }

  // NOTE: file contents are intentionally NOT translated (machine-
  // translating source code would corrupt identifiers/syntax and make it
  // unusable) — they're returned byte-for-byte as committed to the repo.
  const parts = fileTexts.map((f) => `\n\n### ${f.path}\n\n${f.text.trim()}`);
  const content =
    `Depo: ${meta?.full_name ?? `${owner}/${repo}`}\n` +
    `Varsayılan dal: ${defaultBranch}\n` +
    `Yıldız: ${meta?.stargazers_count ?? 0} · Fork: ${meta?.forks_count ?? 0} · Ana dil: ${meta?.language ?? 'bilinmiyor'}\n` +
    `Ağaçta toplam ${allBlobs.length} dosya bulundu; ikili/çok büyük/üretilmiş dosyalar hariç tutularak ${fileTexts.length} dosyanın tam içeriği aşağıdadır` +
    (skippedForSize > 0 ? ` (toplam boyut güvenlik sınırı nedeniyle ${skippedForSize} dosya bu sefer atlandı)` : '') +
    (truncatedTree ? '\n(Not: GitHub API bu depoyu çok büyük bulup dosya ağacını kendi tarafında kısaltmış olabilir.)' : '') +
    parts.join('');

  return {
    title: meta?.full_name ?? `${owner}/${repo}`,
    description: meta?.description ?? '',
    content,
  };
}

async function searchBitbucket(q: string): Promise<SourceResult[]> {
  const url = `https://api.bitbucket.org/2.0/repositories?q=${encodeURIComponent(`name~"${q}"`)}&sort=-updated_on&pagelen=5`;
  const headers: Record<string, string> = {};
  if (BITBUCKET_API) headers.Authorization = `Bearer ${BITBUCKET_API}`;
  const data = await fetchJson(url, headers);
  return (data?.values ?? []).map((r: any) => ({
    source: 'bitbucket',
    title: r.full_name ?? r.name,
    url: r.links?.html?.href ?? `https://bitbucket.org/${r.full_name}`,
    snippet: r.description ?? '',
  }));
}

async function searchGist(q: string): Promise<SourceResult[]> {
  const url = buildDeepLink(GIST_URL, `https://gist.github.com/search?q=${encodeURIComponent(q)}`, q);
  return [
    {
      source: 'gist',
      title: `GitHub Gist: "${q}"`,
      url,
      snippet: 'Opens GitHub Gist search results for this query in a new tab.',
    },
  ];
}

async function searchCodepen(q: string): Promise<SourceResult[]> {
  const url = buildDeepLink(CODEPEN_URL, `https://codepen.io/search/pens?q=${encodeURIComponent(q)}`, q);
  return [
    {
      source: 'codepen',
      title: `CodePen: "${q}"`,
      url,
      snippet: 'Opens CodePen search results (HTML/CSS/JS pens) for this query in a new tab.',
    },
  ];
}

async function searchArchive(q: string): Promise<SourceResult[]> {
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)}&fl[]=identifier&fl[]=title&fl[]=description&rows=8&page=1&output=json`;
  const data = await fetchJson(url);
  const docs: any[] = data?.response?.docs ?? [];
  return docs.map((d: any) => ({
    source: 'archive',
    title: d.title || d.identifier,
    url: `https://archive.org/details/${d.identifier}`,
    snippet: Array.isArray(d.description) ? d.description.join(' ') : (d.description ?? ''),
  }));
}

async function searchGitlab(q: string): Promise<SourceResult[]> {
  const url = `https://gitlab.com/api/v4/projects?search=${encodeURIComponent(q)}&order_by=star_count&sort=desc&per_page=8`;
  const headers: Record<string, string> = {};
  if (GITLAB_API) headers['PRIVATE-TOKEN'] = GITLAB_API;
  const data = await fetchJson(url, headers);
  return (Array.isArray(data) ? data : []).map((p: any) => ({
    source: 'gitlab',
    title: p.path_with_namespace ?? p.name,
    url: p.web_url,
    snippet: p.description ?? '',
  }));
}

async function searchGoogle(q: string): Promise<SourceResult[]> {
  const url = buildDeepLink(GOOGLE_URL, `https://www.google.com/search?q=${encodeURIComponent(q)}`, q);
  return [
    {
      source: 'google',
      title: `Google: "${q}"`,
      url,
      snippet: 'Opens Google search results for this query in a new tab.',
    },
  ];
}

async function searchYandex(q: string): Promise<SourceResult[]> {
  const url = buildDeepLink(YANDEX_URL, `https://yandex.com/search/?text=${encodeURIComponent(q)}`, q);
  return [
    {
      source: 'yandex',
      title: `Yandex: "${q}"`,
      url,
      snippet: 'Opens Yandex search results for this query in a new tab.',
    },
  ];
}

async function searchDuckDuckGo(q: string): Promise<SourceResult[]> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`;
  const data = await fetchJson(url);
  const results: SourceResult[] = [];

  if (data?.AbstractText && data?.AbstractURL) {
    results.push({
      source: 'duckduckgo',
      title: data.Heading || q,
      url: data.AbstractURL,
      snippet: data.AbstractText,
    });
  }

  const topics: any[] = Array.isArray(data?.RelatedTopics) ? data.RelatedTopics : [];
  for (const topic of topics) {
    const nested = Array.isArray(topic?.Topics) ? topic.Topics : [topic];
    for (const t of nested) {
      if (results.length >= 8) break;
      if (t?.FirstURL && t?.Text) {
        results.push({
          source: 'duckduckgo',
          title: t.Text.split(' - ')[0].slice(0, 120),
          url: t.FirstURL,
          snippet: t.Text,
        });
      }
    }
  }

  return results.slice(0, 8);
}

async function searchStackOverflow(q: string): Promise<SourceResult[]> {
  let url = `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=${encodeURIComponent(q)}&site=stackoverflow&pagesize=8`;
  if (STACKOVERFLOW_API) url += `&key=${encodeURIComponent(STACKOVERFLOW_API)}`;
  const data = await fetchJson(url);
  return (data?.items ?? []).map((it: any) => ({
    source: 'stackoverflow',
    title: it.title,
    url: it.link,
    snippet: `${it.is_answered ? 'Answered' : 'Unanswered'} · score ${it.score}`,
  }));
}

async function searchCratesIo(q: string): Promise<SourceResult[]> {
  const url = `https://crates.io/api/v1/crates?q=${encodeURIComponent(q)}&per_page=8`;
  const data = await fetchJson(url);
  return (data?.crates ?? []).map((c: any) => ({
    source: 'rust',
    title: `${c.name} ${c.max_version}`,
    url: `https://crates.io/crates/${c.name}`,
    snippet: c.description ?? '',
  }));
}

async function searchLaravel(q: string): Promise<SourceResult[]> {
  const url = buildDeepLink(LARAVEL_URL, `https://laravel.com/docs/search?query=${encodeURIComponent(q)}`, q);
  return [
    {
      source: 'laravel',
      title: `Laravel docs: "${q}"`,
      url,
      snippet: 'Opens the official Laravel documentation search.',
    },
  ];
}

async function searchMicrosoft(q: string): Promise<SourceResult[]> {
  const url = buildDeepLink(MICROSOFT_URL, `https://learn.microsoft.com/en-us/search/?terms=${encodeURIComponent(q)}`, q);
  return [
    {
      source: 'microsoft',
      title: `Microsoft Learn: "${q}"`,
      url,
      snippet: 'Opens Microsoft Learn documentation search.',
    },
  ];
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '');
}

// ---------------------------------------------------------------------------
// Full-page content extraction ("çekilen tüm içeriği eksiksiz ve sınırsız
// çek" — fetch the complete content, not a summary).
//
// Fetches the raw HTML of an arbitrary result URL and reduces it to plain
// readable text: strips <script>/<style>/<noscript> blocks entirely (never
// translated, never shown — it's not content), strips all remaining tags,
// decodes the handful of HTML entities that show up in real prose, and
// collapses whitespace. Nothing is summarized or cut short except for a
// generous safety ceiling (CONTENT_SAFETY_CEILING) that exists purely to
// keep a single pathological page (e.g. a multi-megabyte SPA bundle
// masquerading as a doc page) from timing out or OOMing the function —
// ordinary articles/READMEs/questions are far below it.
// ---------------------------------------------------------------------------

const CONTENT_SAFETY_CEILING = 120_000; // characters; a real article/README is a few KB-tens of KB

interface FullPage {
  title: string;
  description: string;
  text: string;
}

async function fetchFullPageText(url: string): Promise<FullPage> {
  const res = await fetchWithTimeout(url, { headers: { 'User-Agent': 'immaculate-ai-search/1.0' } }, 12000);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  const html = await res.text();

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const descMatch =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["']/i) ||
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([\s\S]*?)["']/i);

  const title = decodeEntities(stripHtml(titleMatch?.[1] ?? '')).trim() || url;
  const description = decodeEntities(stripHtml(descMatch?.[1] ?? '')).trim();

  const bodyOnly = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    // Block-level tags become paragraph breaks so the extracted text stays
    // readable instead of one giant run-on line.
    .replace(/<\/(p|div|li|tr|h[1-6]|section|article|br)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n');

  let text = decodeEntities(stripHtml(bodyOnly))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n')
    .trim();

  if (text.length > CONTENT_SAFETY_CEILING) {
    text = text.slice(0, CONTENT_SAFETY_CEILING) + '\n\n[İçerik çok uzun olduğu için güvenlik sınırında kesildi.]';
  }

  return { title, description, text };
}

const ENTITY_MAP: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp|ndash|mdash|hellip|rsquo|lsquo|rdquo|ldquo);/g, (_, name) => ENTITY_MAP[name] ?? _);
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Free, keyless machine translation to Turkish, via Google Translate's
// public web-frontend endpoint (the same unofficial endpoint used by
// libraries like googletrans). No API key, no summarization — every chunk
// of the source text is translated and reassembled in order, so arbitrarily
// long content is translated in full rather than truncated.
// ---------------------------------------------------------------------------

const TRANSLATE_CHUNK_SIZE = 1800; // stay comfortably under the endpoint's per-request query-length limit
const TRANSLATE_CONCURRENCY = 4; // parallel chunk requests, so long pages don't translate strictly serially

// Splits text into chunks no longer than `max`, preferring to break on a
// paragraph or sentence boundary so translated chunks read naturally when
// rejoined, instead of splitting mid-word.
function chunkText(text: string, max: number): string[] {
  if (text.length <= max) return text ? [text] : [];
  const chunks: string[] = [];
  let rest = text;
  while (rest.length > max) {
    let cut = rest.lastIndexOf('\n\n', max);
    if (cut < max * 0.5) cut = rest.lastIndexOf('. ', max);
    if (cut < max * 0.5) cut = rest.lastIndexOf(' ', max);
    if (cut < 1) cut = max;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

async function translateChunkToTurkish(chunk: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=tr&dt=t&q=${encodeURIComponent(chunk)}`,
      {},
      8000,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const translated = (data?.[0] || [])
      .map((seg: unknown[]) => seg?.[0])
      .filter((s: unknown) => typeof s === 'string')
      .join('');
    return translated || null;
  } catch {
    return null;
  }
}

async function translateChunkViaMyMemory(chunk: string): Promise<string | null> {
  try {
    const truncated = chunk.slice(0, 490); // MyMemory's free tier caps ~500 bytes/request
    const res = await fetchWithTimeout(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(truncated)}&langpair=auto|tr`,
      {},
      8000,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const translated = data?.responseData?.translatedText;
    if (!translated || typeof translated !== 'string') return null;
    if (/MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(translated)) return null;
    return translated;
  } catch {
    return null;
  }
}

/**
 * Translates arbitrarily long text to Turkish in full — no summarizing, no
 * dropping content. Splits into ordered chunks, translates them with bounded
 * concurrency (so one huge page doesn't fire hundreds of simultaneous
 * requests), and rejoins in original order. Any chunk that fails translation
 * (rate limit, network blip) falls back to its original-language text rather
 * than being silently dropped, so the result is always complete even if not
 * every sentence made it through translation.
 */
async function translateToTurkish(text: string): Promise<string> {
  const clean = (text ?? '').toString().trim();
  if (!clean) return '';

  const chunks = chunkText(clean, TRANSLATE_CHUNK_SIZE);
  const translated: string[] = new Array(chunks.length);

  for (let i = 0; i < chunks.length; i += TRANSLATE_CONCURRENCY) {
    const batch = chunks.slice(i, i + TRANSLATE_CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (chunk) => (await translateChunkToTurkish(chunk)) ?? (await translateChunkViaMyMemory(chunk)) ?? chunk),
    );
    batchResults.forEach((r, j) => (translated[i + j] = r));
  }

  return translated.join(chunks.length > 1 ? '\n\n' : '');
}
