import { t } from '@/lib/i18n';
import type { Language, ProjectCategory } from '@/lib/types';

interface CategoryBadgeProps {
  category: ProjectCategory;
  lang: Language;
}

export function CategoryBadge({ category, lang }: CategoryBadgeProps) {
  const icons: Record<ProjectCategory, string> = {
    python: 'fa-python',
    javascript: 'fa-js',
    php: 'fa-php',
    web: 'fa-globe',
    api: 'fa-server',
    automation: 'fa-gears',
    prompt: 'fa-comment-dots',
  };
  const colors: Record<ProjectCategory, string> = {
    python: 'cat-python',
    javascript: 'cat-js',
    php: 'cat-php',
    web: 'cat-web',
    api: 'cat-api',
    automation: 'cat-automation',
    prompt: 'cat-prompt',
  };

  return (
    <span className={`category-badge ${colors[category]}`}>
      <i className={`fa-brands ${icons[category]}`}></i>
      {t(`cat_${category}`, lang)}
    </span>
  );
}

interface CategoryFilterProps {
  active: string;
  onChange: (c: string) => void;
  lang: Language;
}

export function CategoryFilter({ active, onChange, lang }: CategoryFilterProps) {
  const cats: ProjectCategory[] = ['python', 'javascript', 'php', 'web', 'api', 'automation', 'prompt'];
  return (
    <div className="category-filter" role="tablist">
      <button
        className={`cat-filter-btn ${active === 'all' ? 'active' : ''}`}
        onClick={() => onChange('all')}
        role="tab"
        aria-selected={active === 'all'}
      >
        {t('all_categories', lang)}
      </button>
      {cats.map((c) => (
        <button
          key={c}
          className={`cat-filter-btn ${active === c ? 'active' : ''}`}
          onClick={() => onChange(c)}
          role="tab"
          aria-selected={active === c}
        >
          {t(`cat_${c}`, lang)}
        </button>
      ))}
    </div>
  );
}
