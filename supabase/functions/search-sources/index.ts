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
// Usage: POST { query: string, sources: string[] }

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
    const results = settled.flat();

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
  const res = await fetch(url, { headers: { 'User-Agent': 'immaculate-ai-search', ...headers } });
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
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&srlimit=5&origin=*`;
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
  return (data?.documents ?? []).slice(0, 5).map((d: any) => ({
    source: 'mdn',
    title: d.title,
    url: `https://developer.mozilla.org${d.mdn_url}`,
    snippet: d.summary ?? '',
  }));
}

async function searchNpm(q: string): Promise<SourceResult[]> {
  const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(q)}&size=5`;
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
        snippet: (data.info.summary ?? '').slice(0, 200),
      },
    ];
  } catch {
    return [];
  }
}

async function searchGithub(q: string): Promise<SourceResult[]> {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=5`;
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
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)}&fl[]=identifier&fl[]=title&fl[]=description&rows=5&page=1&output=json`;
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
  const url = `https://gitlab.com/api/v4/projects?search=${encodeURIComponent(q)}&order_by=star_count&sort=desc&per_page=5`;
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
      if (results.length >= 5) break;
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

  return results.slice(0, 5);
}

async function searchStackOverflow(q: string): Promise<SourceResult[]> {
  let url = `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=${encodeURIComponent(q)}&site=stackoverflow&pagesize=5`;
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
  const url = `https://crates.io/api/v1/crates?q=${encodeURIComponent(q)}&per_page=5`;
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
