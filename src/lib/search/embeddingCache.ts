const CACHE_KEY = 'iai_embed_cache_v1';
const MAX_ENTRIES = 2000;

interface CacheEntry {
  hash: string;
  vec: number[];
}

type CacheMap = Record<string, CacheEntry>;

function loadCache(): CacheMap {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CacheMap) : {};
  } catch {
    return {};
  }
}

function saveCache(cache: CacheMap) {
  try {
    const entries = Object.entries(cache);
    // Simple size cap: if we exceed the limit, drop the oldest half.
    const trimmed =
      entries.length > MAX_ENTRIES ? Object.fromEntries(entries.slice(-MAX_ENTRIES / 2)) : cache;
    localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed));
  } catch {
    /* storage full or unavailable — non-fatal, cache just won't persist */
  }
}

// Small, fast string hash (djb2) — good enough to detect content changes.
function hashString(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

export function getCachedEmbedding(id: string, content: string): Float32Array | null {
  const cache = loadCache();
  const entry = cache[id];
  if (!entry) return null;
  if (entry.hash !== hashString(content)) return null;
  return new Float32Array(entry.vec);
}

export function setCachedEmbedding(id: string, content: string, vec: Float32Array) {
  const cache = loadCache();
  cache[id] = { hash: hashString(content), vec: Array.from(vec) };
  saveCache(cache);
}
