import { supabase } from '@/lib/supabase';

export interface ExternalSourceResult {
  source: string;
  title: string;
  url: string;
  snippet: string;
}

export const EXTERNAL_SOURCES = [
  { id: 'wikipedia', label: 'Wikipedia' },
  { id: 'github', label: 'GitHub' },
  { id: 'mdn', label: 'MDN' },
  { id: 'stackoverflow', label: 'StackOverflow' },
  { id: 'npm', label: 'npm' },
  { id: 'pypi', label: 'PyPI' },
  { id: 'rust', label: 'Rust Docs' },
  { id: 'laravel', label: 'Laravel Docs' },
  { id: 'microsoft', label: 'Microsoft Docs' },
] as const;

export type ExternalSourceId = (typeof EXTERNAL_SOURCES)[number]['id'];

export async function searchExternalSources(
  query: string,
  sources: ExternalSourceId[],
): Promise<ExternalSourceResult[]> {
  if (!query.trim() || sources.length === 0) return [];

  const { data, error } = await supabase.functions.invoke('search-sources', {
    body: { query, sources },
  });

  if (error) {
    console.warn('search-sources unavailable:', error);
    return [];
  }

  return (data?.results as ExternalSourceResult[]) ?? [];
}
