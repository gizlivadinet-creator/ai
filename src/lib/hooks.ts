import { useEffect, useState } from 'react';
import { supabase, fetchAllRows, escapeIlikeValue } from '@/lib/supabase';
import { slugify } from '@/lib/utils';
import { generateProjectRemote, GenerationError } from '@/lib/aiClient';
import type { Project } from '@/lib/types';

export function useGenerate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState(false);
  const [result, setResult] = useState<Project | null>(null);

  async function generate(prompt: string): Promise<Project | null> {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setError('prompt_required');
      return null;
    }
    setLoading(true);
    setError(null);
    setDuplicate(false);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setError('login_required_generate');
        return null;
      }

      // The knowledge pool is meant to deduplicate identical requests
      // (see AboutView / i18n "duplicate_found") — previously nothing
      // actually checked for this and every submission created a new row.
      //
      // The prompt is escaped before being used as an `ilike` pattern: a
      // raw, unescaped prompt containing a literal `%` or `_` (e.g. "50%
      // faster script" or "my_bot") would otherwise be interpreted as a
      // SQL wildcard, causing this exact-match lookup to either miss a
      // real duplicate or, worse, match a completely different prompt.
      const { data: existing, error: lookupError } = await supabase
        .from('projects')
        .select('*')
        .ilike('prompt', escapeIlikeValue(trimmed))
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (lookupError) {
        console.error('generate(): duplicate lookup failed:', lookupError.message);
        throw lookupError;
      }

      if (existing) {
        setDuplicate(true);
        setResult(existing as Project);
        return existing as Project;
      }

      const slug = slugify(trimmed) + '-' + Date.now().toString(36).slice(-6);
      const generated = await generateProjectRemote(trimmed);

      const { data, error: insertError } = await supabase
        .from('projects')
        .insert({
          slug,
          title: generated.title,
          description: generated.description,
          prompt: trimmed,
          category: generated.category,
          primary_language: generated.primary_language,
          file_structure: generated.file_structure,
          files: generated.files,
          install_guide: generated.install_guide,
          tags: generated.tags,
          performance_analysis: generated.performance_analysis,
          seo_analysis: generated.seo_analysis,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setResult(data as Project);
      return data as Project;
    } catch (e) {
      // Never surface raw driver/network error text to the UI (it can be
      // technical, in the wrong language, or leak backend details) —
      // always fall back to a known, translated error key.
      console.error('generate() failed:', e);
      if (e instanceof GenerationError) {
        setError(e.code);
      } else {
        setError('error_generate');
      }
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { loading, error, duplicate, result, generate, setResult };
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchProjects(category?: string, search?: string) {
    setLoading(true);
    setError(null);
    try {
      // Previously capped at `.limit(100)`, so once the library grew past
      // 100 projects the client-side hybrid search in LibraryView (which
      // ranks whatever this hook loaded) silently had no way to ever
      // surface anything older — looking like broken/incomplete/"random"
      // search results even though the search logic itself was fine.
      // fetchAllRows pages through the entire table instead.
      const { rows, truncated } = await fetchAllRows<Project>((from, to) => {
        let query = supabase
          .from('projects')
          .select('*')
          .order('created_at', { ascending: false });

        if (category && category !== 'all') {
          query = query.eq('category', category);
        }
        if (search && search.trim()) {
          // Escaped + double-quote-wrapped: a raw search string containing
          // `%`, `_`, a comma, or parentheses used to either act as an
          // unintended wildcard or break the `.or()` filter syntax
          // outright (commas are field separators in `.or()`), producing
          // wrong or truncated matches.
          const safe = escapeIlikeValue(search.trim());
          query = query.or(
            `title.ilike."%${safe}%",description.ilike."%${safe}%",prompt.ilike."%${safe}%"`,
          );
        }
        return query.range(from, to);
      });

      if (truncated) {
        console.warn('fetchProjects: result set was truncated by the safety ceiling.');
      }
      setProjects(rows);
    } catch (e) {
      console.error('fetchProjects() failed:', e);
      setError(e instanceof Error ? e.message : 'error_generic');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProjects();
  }, []);

  return { projects, loading, error, fetchProjects };
}

export function useProject(slug: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      try {
        const { data, error: fetchError } = await supabase
          .from('projects')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();
        if (fetchError) throw fetchError;
        setProject(data as Project | null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'error_generic');
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [slug]);

  return { project, loading, error };
}

export function useStats() {
  const [stats, setStats] = useState({
    total: 0,
    categories: 0,
    languages: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const { count } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true });
        // Paginated rather than a single unbounded select — PostgREST's
        // default row cap would otherwise silently under-count distinct
        // categories/languages once the table passed that cap.
        const { rows: catData } = await fetchAllRows<{ id: string; category: string; primary_language: string }>(
          (from, to) => supabase.from('projects').select('id, category, primary_language').range(from, to),
        );
        const categories = new Set(catData.map((d) => d.category)).size;
        const languages = new Set(catData.map((d) => d.primary_language)).size;
        setStats({
          total: count || 0,
          categories,
          languages,
        });
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  return { stats, loading };
}

export async function deleteProject(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('deleteProject() failed:', e);
    return false;
  }
}
