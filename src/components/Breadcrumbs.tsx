import { navigate } from '@/lib/router';

export interface BreadcrumbItem {
  label: string;
  path: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

/**
 * Visual breadcrumb trail. Kept in sync with the BreadcrumbList JSON-LD
 * generated in src/lib/seo.ts for the same route — the same real path
 * segments should be reflected both to users and to search engines.
 */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="breadcrumbs" aria-label="breadcrumb">
      <ol>
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={item.path} aria-current={isLast ? 'page' : undefined}>
              {isLast ? (
                <span>{item.label}</span>
              ) : (
                <a
                  href={item.path}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(item.path);
                  }}
                >
                  {item.label}
                </a>
              )}
              {!isLast && <i className="fa-solid fa-chevron-right breadcrumb-sep" aria-hidden="true"></i>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
