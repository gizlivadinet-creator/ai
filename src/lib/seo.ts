import type { Route } from '@/lib/router';
import { absoluteUrl, routeToPath } from '@/lib/router';
import type { Project } from '@/lib/types';

const SITE_NAME = 'Immaculate AI';
const DEFAULT_DESCRIPTION =
  'Immaculate AI - Yeni nesil yapay zekâ kod üretim platformu. Python, JavaScript, TypeScript, React, Next.js, PHP, Laravel, Node.js, Express, Java, C#, Go, Rust, SQL, API, otomasyon ve yüzlerce teknoloji için eksiksiz, optimize edilmiş ve çalışmaya hazır kod üretir.';
const DEFAULT_IMAGE = absoluteUrl('/og-image.webp');

interface SeoInput {
  title: string;
  description: string;
  path: string;
  image?: string;
  noindex?: boolean;
  jsonLd?: object[];
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/** Replaces the route-specific JSON-LD block. The base Organization/WebSite
 *  graph in index.html is left untouched; this is an additional block. */
function upsertJsonLd(id: string, data: object[] | undefined) {
  const existing = document.getElementById(id);
  if (existing) existing.remove();
  if (!data || data.length === 0) return;
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = id;
  script.textContent = JSON.stringify(data.length === 1 ? data[0] : { '@context': 'https://schema.org', '@graph': data });
  document.head.appendChild(script);
}

function applySeo({ title, description, path, image = DEFAULT_IMAGE, noindex = false, jsonLd }: SeoInput) {
  const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;
  const url = absoluteUrl(path);

  document.title = fullTitle;
  upsertMeta('name', 'description', description);
  upsertMeta(
    'name',
    'robots',
    noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
  );
  upsertLink('canonical', url);

  upsertMeta('property', 'og:title', fullTitle);
  upsertMeta('property', 'og:description', description);
  upsertMeta('property', 'og:url', url);
  upsertMeta('property', 'og:image', image);
  upsertMeta('name', 'twitter:title', fullTitle);
  upsertMeta('name', 'twitter:description', description);
  upsertMeta('name', 'twitter:image', image);

  upsertJsonLd('route-jsonld', jsonLd);
}

function breadcrumbList(items: { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/**
 * Applies per-route SEO metadata. Called from App.tsx on every route change.
 * `project` is only needed (and only available) for the 'project' route, so
 * ProjectResult-owning code passes it in once it has finished loading.
 */
export function applyRouteSeo(route: Route, opts: { project?: Project; lang?: 'tr' | 'en' } = {}) {
  const path = routeToPath(route);

  switch (route.name) {
    case 'home':
      applySeo({
        title: `${SITE_NAME} - AI Coding Platform`,
        description: DEFAULT_DESCRIPTION,
        path,
        jsonLd: [
          { '@type': 'WebPage', name: SITE_NAME, url: absoluteUrl(path), description: DEFAULT_DESCRIPTION },
          breadcrumbList([{ name: 'Ana Sayfa', path: '/' }]),
        ],
      });
      return;

    case 'library':
      applySeo({
        title: route.query ? `"${route.query}" için sonuçlar - Kütüphane` : 'Proje Kütüphanesi',
        description:
          'Immaculate AI ile üretilen tüm projeleri keşfedin: Python, JavaScript, React, PHP ve daha fazlası için hazır, çalıştırılabilir kaynak kod örnekleri.',
        path,
        jsonLd: [
          { '@type': 'CollectionPage', name: 'Proje Kütüphanesi', url: absoluteUrl(path) },
          breadcrumbList([
            { name: 'Ana Sayfa', path: '/' },
            { name: 'Kütüphane', path: '/library' },
          ]),
        ],
      });
      return;

    case 'about':
      applySeo({
        title: 'Hakkında',
        description: `${SITE_NAME} hakkında: nasıl çalışır, hangi teknolojileri destekler ve neden tercih edilir.`,
        path,
        jsonLd: [breadcrumbList([{ name: 'Ana Sayfa', path: '/' }, { name: 'Hakkında', path: '/about' }])],
      });
      return;

    case 'admin':
      // Internal/authenticated surface — never index or share.
      applySeo({ title: 'Yönetim Paneli', description: 'Yönetim paneli', path, noindex: true });
      return;

    case 'not-found':
      applySeo({
        title: 'Sayfa Bulunamadı',
        description: 'Aradığınız sayfa bulunamadı.',
        path,
        noindex: true,
      });
      return;

    case 'project': {
      const p = opts.project;
      if (!p) {
        // Loading state: keep it non-committal and non-indexable until the
        // real project data (title/description) is available, so we never
        // publish placeholder text as if it were the real page content.
        applySeo({ title: 'Yükleniyor…', description: 'Proje yükleniyor…', path, noindex: true });
        return;
      }
      const description = p.description || p.prompt?.slice(0, 160) || DEFAULT_DESCRIPTION;
      applySeo({
        title: p.title,
        description,
        path,
        jsonLd: [
          {
            // Multi-typed: `programmingLanguage` is only valid on
            // SoftwareSourceCode per schema.org (schema.org/programmingLanguage
            // lists SoftwareSourceCode/WebAPI/ComputerLanguage as its domain,
            // not Article/TechArticle). Combining both types keeps the
            // article semantics while making every property below valid,
            // instead of the validator flagging an unrecognized-property
            // warning on TechArticle.
            '@type': ['TechArticle', 'SoftwareSourceCode'],
            headline: p.title,
            description,
            articleSection: p.category,
            keywords: (p.tags || []).join(', '),
            programmingLanguage: p.primary_language,
            datePublished: p.created_at,
            dateModified: p.updated_at,
            url: absoluteUrl(path),
            author: { '@type': 'Organization', name: SITE_NAME },
            publisher: { '@type': 'Organization', name: SITE_NAME, url: absoluteUrl('/') },
            mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(path) },
          },
          breadcrumbList([
            { name: 'Ana Sayfa', path: '/' },
            { name: 'Kütüphane', path: '/library' },
            { name: p.title, path },
          ]),
        ],
      });
      return;
    }
  }
}
