import Fuse, { type IFuseOptions } from 'fuse.js';
import type { Project } from '@/lib/types';
import { embedText, cosineSimilarity } from './embeddings';
import { getCachedEmbedding, setCachedEmbedding } from './embeddingCache';

export interface LocalSearchResult {
  project: Project;
  score: number; // 0..1, higher is better
  matchType: 'semantic' | 'fuzzy' | 'both';
}

function projectContent(p: Project): string {
  return [p.title, p.description, p.prompt, ...(p.tags || [])].filter(Boolean).join(' \n ');
}

const fuseOptions: IFuseOptions<Project> = {
  keys: [
    { name: 'title', weight: 0.4 },
    { name: 'description', weight: 0.25 },
    { name: 'tags', weight: 0.2 },
    { name: 'prompt', weight: 0.15 },
  ],
  threshold: 0.4, // 0 = exact match only, 1 = match anything
  ignoreLocation: true,
  includeScore: true,
};

/**
 * Fast, always-available fuzzy search (typo-tolerant). Runs synchronously
 * over whatever project list is already loaded — no network, no model.
 */
export function fuzzySearch(projects: Project[], query: string, limit = 30): LocalSearchResult[] {
  if (!query.trim()) return [];
  const fuse = new Fuse(projects, fuseOptions);
  return fuse
    .search(query)
    .slice(0, limit)
    .map((r) => ({
      project: r.item,
      score: 1 - (r.score ?? 0), // Fuse: lower score = better match, so invert
      matchType: 'fuzzy' as const,
    }));
}

// Cosine similarity between two arbitrary, unrelated MiniLM sentence
// embeddings still tends to land around 0.1-0.3 (it is *never* near zero),
// simply because the model shares general "this is English text" structure
// across everything. Without a floor, semanticSearch used to score and
// return *every* project no matter how unrelated, and hybridSearch below
// blended that noise into every result with a fixed 0.6 weight — so a
// completely unrelated project could outrank a real fuzzy/title match.
// This threshold is what actually correlates with a topical match for this
// model in practice.
const SEMANTIC_MIN_SIMILARITY = 0.35;

/**
 * Semantic search using free, local (in-browser) embeddings. Slower on
 * first call per project (has to embed), then cached. Falls back silently
 * to an empty result set if the model can't load (e.g. offline). Results
 * below SEMANTIC_MIN_SIMILARITY are dropped as noise rather than returned.
 */
export async function semanticSearch(
  projects: Project[],
  query: string,
  limit = 30,
): Promise<LocalSearchResult[]> {
  if (!query.trim() || projects.length === 0) return [];

  try {
    const queryVec = await embedText(query);

    const scored: LocalSearchResult[] = [];
    for (const project of projects) {
      const content = projectContent(project);
      let vec = getCachedEmbedding(project.id, content);
      if (!vec) {
        vec = await embedText(content);
        setCachedEmbedding(project.id, content, vec);
      }
      const score = cosineSimilarity(queryVec, vec);
      if (score >= SEMANTIC_MIN_SIMILARITY) {
        scored.push({ project, score, matchType: 'semantic' });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  } catch (err) {
    console.warn('Semantic search unavailable, falling back to fuzzy only:', err);
    return [];
  }
}

/**
 * Hybrid search: combines fuzzy (fast, exact-ish) and semantic (meaning-based)
 * results, merging and re-ranking by a weighted score. This is what the UI
 * should call — it degrades gracefully to fuzzy-only if the semantic model
 * hasn't loaded yet.
 */
export async function hybridSearch(
  projects: Project[],
  query: string,
  opts: { limit?: number; semanticWeight?: number } = {},
): Promise<LocalSearchResult[]> {
  const { limit = 30, semanticWeight = 0.6 } = opts;
  if (!query.trim()) return [];

  // Defensive de-dup: if the caller's list ever contains the same project
  // twice (e.g. a stale realtime update landed alongside a fresh fetch),
  // don't let it appear twice in results.
  const seen = new Set<string>();
  const uniqueProjects = projects.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  const fuzzyResults = fuzzySearch(uniqueProjects, query, uniqueProjects.length);
  const semanticResults = await semanticSearch(uniqueProjects, query, uniqueProjects.length);

  const byId = new Map<string, LocalSearchResult>();

  for (const r of fuzzyResults) {
    byId.set(r.project.id, { ...r, score: r.score * (1 - semanticWeight) });
  }
  for (const r of semanticResults) {
    const existing = byId.get(r.project.id);
    if (existing) {
      byId.set(r.project.id, {
        project: r.project,
        score: existing.score + r.score * semanticWeight,
        matchType: 'both',
      });
    } else {
      byId.set(r.project.id, { ...r, score: r.score * semanticWeight });
    }
  }

  return Array.from(byId.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
