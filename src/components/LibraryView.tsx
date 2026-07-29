import { useEffect, useMemo, useState } from 'react';
import { t } from '@/lib/i18n';
import type { Language, Project } from '@/lib/types';
import { navigate } from '@/lib/router';
import { useProjects } from '@/lib/hooks';
import { CategoryBadge, CategoryFilter } from './CategoryBadge';
import { Breadcrumbs } from './Breadcrumbs';
import { formatDate, timeAgo } from '@/lib/utils';
import { deleteProject } from '@/lib/hooks';
import { hybridSearch, type LocalSearchResult } from '@/lib/search/localSearch';
import { ExternalSourcesPanel } from './ExternalSourcesPanel';

interface LibraryViewProps {
  lang: Language;
  initialSearch?: string;
}

// Debounce helper so we don't re-run the (semantic) search on every keystroke.
function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export function LibraryView({ lang, initialSearch = '' }: LibraryViewProps) {
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState(initialSearch);
  const debouncedSearch = useDebounced(search, 300);
  const { projects: allProjects, loading, error, fetchProjects } = useProjects();

  const [rankedResults, setRankedResults] = useState<LocalSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);

  function handleCategoryChange(c: string) {
    setCategory(c);
    fetchProjects(c); // category filtering still happens server-side; search is local now
  }

  function handleSearchChange(q: string) {
    setSearch(q);
  }

  // Hybrid (fuzzy + semantic) search runs entirely client-side over the
  // already-fetched category slice — free, no extra API calls, works
  // offline once the embedding model is cached.
  useEffect(() => {
    let cancelled = false;
    if (!debouncedSearch.trim()) {
      setRankedResults(null);
      return;
    }
    setSearching(true);
    hybridSearch(allProjects, debouncedSearch).then((results) => {
      if (!cancelled) {
        setRankedResults(results);
        setSearching(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, allProjects]);

  const projects = useMemo(() => {
    if (!rankedResults) return allProjects;
    return rankedResults.map((r) => r.project);
  }, [rankedResults, allProjects]);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (confirm(t('confirm_delete', lang))) {
      const ok = await deleteProject(id);
      if (ok) fetchProjects(category, search);
    }
  }

  return (
    <div className="library-view">
      <div className="container">
        <Breadcrumbs
          items={[
            { label: lang === 'tr' ? 'Ana Sayfa' : 'Home', path: '/' },
            { label: t('nav_library', lang), path: '/library' },
          ]}
        />
        <div className="library-header">
          <h1 className="page-title">
            <i className="fa-solid fa-folder-tree"></i>
            {t('nav_library', lang)}
          </h1>
          <p className="page-subtitle">
            {t('knowledge_pool', lang)} — {projects.length} {t('stats_projects', lang)}
          </p>
        </div>

        <CategoryFilter active={category} onChange={handleCategoryChange} lang={lang} />

        <div className="library-search">
          <i className={`fa-solid ${searching ? 'fa-circle-notch fa-spin' : 'fa-magnifying-glass'}`}></i>
          <input
            type="search"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t('search_placeholder', lang)}
            aria-label={t('search_placeholder', lang)}
          />
        </div>

        <ExternalSourcesPanel query={debouncedSearch} />

        {loading && (
          <div className="library-loading">
            <i className="fa-solid fa-circle-notch fa-spin"></i>
            {t('loading', lang)}
          </div>
        )}

        {error && (
          <div className="error-banner">
            <i className="fa-solid fa-circle-exclamation"></i>
            {t('error_generic', lang)}
          </div>
        )}

        {!loading && projects.length === 0 && (
          <div className="empty-state">
            <i className="fa-solid fa-folder-open fa-3x"></i>
            <h3>{t('empty_title', lang)}</h3>
            <p>{t('empty_desc', lang)}</p>
            <button className="btn-generate" onClick={() => navigate('/')}>
              <i className="fa-solid fa-wand-magic-sparkles"></i>
              {t('nav_new', lang)}
            </button>
          </div>
        )}

        {!loading && projects.length > 0 && (
          <div className="projects-grid">
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                lang={lang}
                onClick={() => navigate(`/p/${p.slug}`)}
                onDelete={(e) => handleDelete(p.id, e)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ProjectCardProps {
  project: Project;
  lang: Language;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

function ProjectCard({ project, lang, onClick, onDelete }: ProjectCardProps) {
  return (
    <article className="project-card" onClick={onClick} role="button" tabIndex={0}>
      <div className="project-card-header">
        <CategoryBadge category={project.category} lang={lang} />
        <button className="card-delete" onClick={onDelete} aria-label={t('delete', lang)}>
          <i className="fa-solid fa-trash"></i>
        </button>
      </div>
      <h3 className="project-card-title">{project.title}</h3>
      <p className="project-card-desc">{project.description}</p>
      <div className="project-card-footer">
        <div className="project-card-meta">
          <span><i className="fa-solid fa-code"></i> {project.primary_language}</span>
          <span><i className="fa-regular fa-file"></i> {project.files.length} {t('files', lang)}</span>
        </div>
        <span className="project-card-time" title={formatDate(project.created_at, lang)}>
          <i className="fa-regular fa-clock"></i> {timeAgo(project.created_at, lang)}
        </span>
      </div>
    </article>
  );
}
