// Supabase Edge Function: search-sources
//
// Proxies search queries out to a set of FREE, key-less public APIs so the
// frontend can query them without hitting CORS restrictions and without
// exposing any credentials (none are needed — all sources below are free
// and anonymous). No LLM calls here, no cost.
//
// Supported `source` values: wikipedia, duckduckgo, google, mdn, npm, pypi,
// github, gitlab, bitbucket, gist, codepen, archive, stackoverflow,
// rust (crates.io), laravel, microsoft
//
// Note on honesty: every handler below either calls a REAL free/key-less
// public API (github, gitlab, bitbucket, archive, npm, pypi, wikipedia,
// duckduckgo, stackoverflow, crates.io, mdn) or — where no such free API
// exists (google, gist, codepen, laravel, microsoft) — returns a direct
// deep-link into that site's own search instead of fabricating results or
// scraping HTML in violation of the site's Terms of Service.
//
// Usage: POST { query: string, sources: string[] }

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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
  // MDN's public site-search JSON endpoint (used by developer.mozilla.org itself).
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
  // PyPI has no official search JSON API anymore; the single-package
  // metadata endpoint is free/key-less and works well for exact package names.
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
  // Unauthenticated GitHub Search API — free, ~10 req/min rate limit.
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=5`;
  const data = await fetchJson(url, { Accept: 'application/vnd.github+json' });
  return (data?.items ?? []).map((r: any) => ({
    source: 'github',
    title: r.full_name,
    url: r.html_url,
    snippet: r.description ?? '',
  }));
}

async function searchBitbucket(q: string): Promise<SourceResult[]> {
  // Bitbucket Cloud REST API 2.0 — free, key-less for public repositories.
  const url = `https://api.bitbucket.org/2.0/repositories?q=${encodeURIComponent(`name~"${q}"`)}&sort=-updated_on&pagelen=5`;
  const data = await fetchJson(url);
  return (data?.values ?? []).map((r: any) => ({
    source: 'bitbucket',
    title: r.full_name ?? r.name,
    url: r.links?.html?.href ?? `https://bitbucket.org/${r.full_name}`,
    snippet: r.description ?? '',
  }));
}

async function searchArchive(q: string): Promise<SourceResult[]> {
  // Internet Archive's advanced search API — free, key-less, real full-text
  // search across archived sites, software, and files.
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

// GitHub Gist has no free, key-less "search across all public gists" API —
// the only anonymous gist endpoints let you fetch a *specific known* gist by
// ID, not search by keyword. Real full-text gist search requires an
// authenticated GitHub account token. So — same honest approach as
// Laravel/Microsoft — this deep-links into GitHub's own gist search UI
// rather than faking results.
async function searchGist(q: string): Promise<SourceResult[]> {
  return [
    {
      source: 'gist',
      title: `GitHub Gist: "${q}"`,
      url: `https://gist.github.com/search?q=${encodeURIComponent(q)}`,
      snippet: 'Opens GitHub Gist search results for this query in a new tab.',
    },
  ];
}

// CodePen has no public, free, key-less search API at all (no official API
// for this exists; scraping their search results page would violate their
// Terms of Service and break silently whenever their frontend changes). So
// this deep-links into CodePen's own search instead of faking results.
async function searchCodepen(q: string): Promise<SourceResult[]> {
  return [
    {
      source: 'codepen',
      title: `CodePen: "${q}"`,
      url: `https://codepen.io/search/pens?q=${encodeURIComponent(q)}`,
      snippet: 'Opens CodePen search results (HTML/CSS/JS pens) for this query in a new tab.',
    },
  ];
}

async function searchGitlab(q: string): Promise<SourceResult[]> {
  // GitLab's public projects search API — free, key-less, anonymous.
  const url = `https://gitlab.com/api/v4/projects?search=${encodeURIComponent(q)}&order_by=star_count&sort=desc&per_page=5`;
  const data = await fetchJson(url);
  return (Array.isArray(data) ? data : []).map((p: any) => ({
    source: 'gitlab',
    title: p.path_with_namespace ?? p.name,
    url: p.web_url,
    snippet: p.description ?? '',
  }));
}

// Google does not expose a free, key-less search API (the official Custom
// Search JSON API needs an API key + billing-linked quota, and scraping
// google.com/search violates Google's Terms of Service). So — same approach
// as Laravel/Microsoft below — we return a direct deep-link into Google's
// own results page instead of faking scraped results.
async function searchGoogle(q: string): Promise<SourceResult[]> {
  return [
    {
      source: 'google',
      title: `Google: "${q}"`,
      url: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
      snippet: 'Opens Google search results for this query in a new tab.',
    },
  ];
}

// DuckDuckGo Instant Answer API — free, key-less, no scraping. It is NOT a
// full web-index search (no API on earth offers that for free without a
// key), it mostly returns abstract/infobox data plus related-topic links,
// but when it has something it's a real, live result — not a guess.
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
    // Some entries are { Text, FirstURL }, others are { Name, Topics: [...] } groups.
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
  const url = `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=${encodeURIComponent(q)}&site=stackoverflow&pagesize=5`;
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

// Laravel and Microsoft Learn do not expose free, stable, key-less JSON
// search APIs, so we return a single deep-link result to their own search
// instead of scraping HTML (which is fragile and against most ToS).
async function searchLaravel(q: string): Promise<SourceResult[]> {
  return [
    {
      source: 'laravel',
      title: `Laravel docs: "${q}"`,
      url: `https://laravel.com/docs/search?query=${encodeURIComponent(q)}`,
      snippet: 'Opens the official Laravel documentation search.',
    },
  ];
}

async function searchMicrosoft(q: string): Promise<SourceResult[]> {
  return [
    {
      source: 'microsoft',
      title: `Microsoft Learn: "${q}"`,
      url: `https://learn.microsoft.com/en-us/search/?terms=${encodeURIComponent(q)}`,
      snippet: 'Opens Microsoft Learn documentation search.',
    },
  ];
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '');
}
