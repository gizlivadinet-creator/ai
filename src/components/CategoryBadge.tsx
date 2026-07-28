import { t } from '@/lib/i18n';
import type { Language, ProjectCategory } from '@/lib/types';

interface CategoryBadgeProps {
  category: ProjectCategory;
  lang: Language;
}

export function CategoryBadge({ category, lang }: CategoryBadgeProps) {
  // Font Awesome ships several icon *styles* (brands, solid, regular) and an
  // icon only renders if you pair it with the style it actually belongs to.
  // python/javascript/php are real vendor "brand" glyphs (fa-brands), but
  // web/api/automation/prompt are generic "solid" glyphs (fa-solid) — mixing
  // them up (e.g. fa-brands + fa-globe) silently renders as a broken/missing
  // icon box instead of an error, which is what was happening here.
  const icons: Record<ProjectCategory, { name: string; style: 'fa-brands' | 'fa-solid' }> = {
    python: { name: 'fa-python', style: 'fa-brands' },
    javascript: { name: 'fa-js', style: 'fa-brands' },
    php: { name: 'fa-php', style: 'fa-brands' },
    web: { name: 'fa-globe', style: 'fa-solid' },
    api: { name: 'fa-server', style: 'fa-solid' },
    automation: { name: 'fa-gears', style: 'fa-solid' },
    prompt: { name: 'fa-comment-dots', style: 'fa-solid' },
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

  const icon = icons[category];

  return (
    <span className={`category-badge ${colors[category]}`}>
      <i className={`${icon.style} ${icon.name}`}></i>
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
