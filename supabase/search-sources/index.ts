// Supabase Edge Function: search-sources
//
// Proxies search queries out to a set of FREE, key-less public APIs so the
// frontend can query them without hitting CORS restrictions and without
// exposing any credentials (none are needed — all sources below are free
// and anonymous). No LLM calls here, no cost.
//
// Supported `source` values: wikipedia, mdn, npm, pypi, github,
// stackoverflow, rust (crates.io), laravel, microsoft
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
