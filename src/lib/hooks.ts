import { useEffect, useState } from 'react';
import { supabase, getOwnerToken } from '@/lib/supabase';
import { slugify } from '@/lib/utils';
import { generateProject } from '@/lib/generator';
import type { GenerationResult, Project } from '@/lib/types';

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
      // The knowledge pool is meant to deduplicate identical requests
      // (see AboutView / i18n "duplicate_found") — previously nothing
      // actually checked for this and every submission created a new row.
      const { data: existing, error: lookupError } = await supabase
        .from('projects')
        .select('*')
        .ilike('prompt', trimmed)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (lookupError) throw lookupError;

      if (existing) {
        setDuplicate(true);
        setResult(existing as Project);
        return existing as Project;
      }

      const slug = slugify(trimmed) + '-' + Date.now().toString(36).slice(-6);
      const generated: GenerationResult = generateProject(trimmed);

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
          owner_token: getOwnerToken(),
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
      setError('error_generate');
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
    try {
      let query = supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (category && category !== 'all') {
        query = query.eq('category', category);
      }
      if (search) {
        query = query.or(
          `title.ilike.%${search}%,description.ilike.%${search}%,prompt.ilike.%${search}%`,
        );
      }
      const { data, error: fetchError } = await query.limit(100);
      if (fetchError) throw fetchError;
      setProjects((data as Project[]) || []);
    } catch (e) {
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
        const { data: catData } = await supabase
          .from('projects')
          .select('category, primary_language');
        const categories = new Set(catData?.map((d: { category: string }) => d.category)).size;
        const languages = new Set(catData?.map((d: { primary_language: string }) => d.primary_language)).size;
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
