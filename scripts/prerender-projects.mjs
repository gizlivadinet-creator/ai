/**
 * prerender-projects.mjs
 *
 * Neden gerekli:
 * GitHub Pages sunucu taraflı yönlendirme yapamadığı için /p/<slug> gibi
 * "temiz" proje URL'leri, public/404.html içindeki script ile index.html'e
 * geri yönlendirilip istemci tarafında (React Router) render ediliyordu.
 * Bu, normal tarayıcılar için çalışsa da iki ciddi soruna yol açıyordu:
 *
 *   1) GitHub Pages, 404.html'i servis ederken HTTP durum kodu olarak
 *      gerçekten 404 döndürüyor. Schema.org Validator, Google Rich Results
 *      Test gibi araçlar ve JavaScript çalıştırmayan her crawler, sayfayı
 *      hiç görmeden "200 durum kodu döndürmüyor" diyerek reddediyor.
 *   2) JSON-LD / meta etiketleri yalnızca React mount olduktan sonra
 *      src/lib/seo.ts tarafından DOM'a ekleniyordu — JS çalıştırmayan
 *      hiçbir araç bu veriyi hiç görmüyordu.
 *
 * Bu script `vite build` çıktısı üzerinde çalışır ve public/data/projects.json
 * (build sırasında dist/data/projects.json olarak kopyalanır) içindeki her
 * proje için gerçek bir dosya olan dist/p/<slug>/index.html üretir. Bu dosya:
 *   - Doğrudan bir dosya olduğundan GitHub Pages onu gerçek bir 200 ile servis eder.
 *   - Doğru <title>, meta description, canonical, OG/Twitter etiketlerini
 *     ve TechArticle + BreadcrumbList JSON-LD'sini ham HTML içinde barındırır.
 *   - dist/index.html ile birebir aynı script/asset referanslarını korur,
 *     böylece sayfa açılır açılmaz normal React uygulaması mount olup
 *     etkileşimli hale gelir (src/lib/seo.ts daha sonra canlı veriyle bu
 *     etiketleri günceller — burada üretilenler sadece ilk, crawler'ın
 *     gördüğü anlık görüntüdür).
 *
 * NOT: Buradaki title/description/JSON-LD alanları src/lib/seo.ts
 * içindeki `applyRouteSeo`'nun 'project' dalıyla birebir aynı mantığı
 * izler. O dosyada bir alan değişirse burası da güncellenmelidir.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DIST_DIR = resolve(ROOT, 'dist');
const INDEX_HTML_PATH = resolve(DIST_DIR, 'index.html');
const PROJECTS_JSON_PATH = resolve(DIST_DIR, 'data', 'projects.json');

const SITE_URL = 'https://immaculate.eu.cc';
const SITE_NAME = 'Immaculate AI';
const DEFAULT_DESCRIPTION =
  'Immaculate AI - Yeni nesil yapay zekâ kod üretim platformu. Python, JavaScript, TypeScript, React, Next.js, PHP, Laravel, Node.js, Express, Java, C#, Go, Rust, SQL, API, otomasyon ve yüzlerce teknoloji için eksiksiz, optimize edilmiş ve çalışmaya hazır kod üretir.';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.webp`;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/** Safely embeds a JSON value inside a <script type="application/ld+json">
 *  block: escapes "</" so a value containing that sequence can never
 *  prematurely close the surrounding <script> tag. */
function toJsonLdScript(id, data) {
  const json = JSON.stringify(data).replace(/<\//g, '<\\/');
  return `<script type="application/ld+json" id="${id}">${json}</script>`;
}

function absoluteUrl(path) {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function breadcrumbList(items) {
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

/** Mirrors the 'project' case of applyRouteSeo() in src/lib/seo.ts. */
function buildProjectMeta(project, path) {
  const description = project.description || (project.prompt ? project.prompt.slice(0, 160) : '') || DEFAULT_DESCRIPTION;
  const title = project.title || SITE_NAME;
  const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;
  const url = absoluteUrl(path);

  const jsonLd = [
    {
      // Keep in sync with src/lib/seo.ts: multi-typed because
      // `programmingLanguage` is only a valid property on SoftwareSourceCode
      // per schema.org, not on Article/TechArticle alone.
      '@type': ['TechArticle', 'SoftwareSourceCode'],
      headline: title,
      description,
      articleSection: project.category,
      keywords: Array.isArray(project.tags) ? project.tags.join(', ') : '',
      programmingLanguage: project.primary_language,
      datePublished: project.created_at,
      dateModified: project.updated_at,
      url,
      author: { '@type': 'Organization', name: SITE_NAME },
      publisher: { '@type': 'Organization', name: SITE_NAME, url: absoluteUrl('/') },
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    },
    breadcrumbList([
      { name: 'Ana Sayfa', path: '/' },
      { name: 'Kütüphane', path: '/library' },
      { name: title, path },
    ]),
  ];

  return { title: fullTitle, description, url, jsonLd };
}

function replaceTag(html, pattern, replacement) {
  if (!pattern.test(html)) {
    console.warn(`Uyarı: beklenen kalıp index.html içinde bulunamadı: ${pattern}`);
    return html;
  }
  return html.replace(pattern, replacement);
}

function renderProjectHtml(baseHtml, project, path) {
  const meta = buildProjectMeta(project, path);
  let html = baseHtml;

  html = replaceTag(html, /<title>[^<]*<\/title>/, `<title>${escapeHtml(meta.title)}</title>`);
  html = replaceTag(
    html,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
  );
  html = replaceTag(
    html,
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/>/,
    `<link rel="canonical" href="${escapeHtml(meta.url)}" />`,
  );
  html = replaceTag(
    html,
    /<meta\s+property="og:type"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:type" content="article" />`,
  );
  html = replaceTag(
    html,
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:url" content="${escapeHtml(meta.url)}" />`,
  );
  html = replaceTag(
    html,
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
  );
  html = replaceTag(
    html,
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
  );
  html = replaceTag(
    html,
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/>/,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
  );
  html = replaceTag(
    html,
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/>/,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
  );

  // Route-specific JSON-LD, appended right before </head>. Uses the same
  // element id ("route-jsonld") that src/lib/seo.ts looks for, so once
  // React mounts and refreshes SEO tags with live data it cleanly replaces
  // this block instead of duplicating it.
  const jsonLdScript = toJsonLdScript('route-jsonld', {
    '@context': 'https://schema.org',
    '@graph': meta.jsonLd,
  });
  html = html.replace('</head>', `  ${jsonLdScript}\n  </head>`);

  return html;
}

function main() {
  if (!existsSync(INDEX_HTML_PATH)) {
    console.error(`dist/index.html bulunamadı (${INDEX_HTML_PATH}). Önce "npm run build" çalıştırılmalı.`);
    process.exit(1);
  }
  if (!existsSync(PROJECTS_JSON_PATH)) {
    console.warn(`dist/data/projects.json bulunamadı (${PROJECTS_JSON_PATH}). Prerender atlanıyor.`);
    process.exit(0);
  }

  // Defensive: strip any pre-existing "route-jsonld" script from the base
  // template first. index.html should never already contain one, but this
  // guarantees renderProjectHtml() can never end up inserting a second copy
  // alongside a leftover one, whatever produced it.
  const rawBaseHtml = readFileSync(INDEX_HTML_PATH, 'utf-8');
  const baseHtml = rawBaseHtml.replace(
    /\s*<script type="application\/ld\+json" id="route-jsonld">[\s\S]*?<\/script>/,
    '',
  );

  const manifest = JSON.parse(readFileSync(PROJECTS_JSON_PATH, 'utf-8'));
  const allProjects = Array.isArray(manifest.projects) ? manifest.projects : [];

  // Defensive: de-duplicate by slug. Two rows sharing a slug would otherwise
  // both write to the same dist/p/<slug>/index.html; keeping only the most
  // recently updated one avoids ambiguity about which project's data "wins".
  const bySlug = new Map();
  for (const project of allProjects) {
    if (!project || !project.slug) continue;
    const existing = bySlug.get(project.slug);
    if (!existing || new Date(project.updated_at || 0) >= new Date(existing.updated_at || 0)) {
      bySlug.set(project.slug, project);
    }
  }
  const projects = [...bySlug.values()];
  if (projects.length !== allProjects.filter((p) => p && p.slug).length) {
    console.warn(
      `Uyarı: aynı slug'a sahip yinelenen proje kayıtları bulundu ve tekilleştirildi (${allProjects.length} -> ${projects.length}).`,
    );
  }

  let written = 0;
  for (const project of projects) {
    if (!project || !project.slug) continue;

    const path = `/p/${encodeURIComponent(project.slug)}`;
    const html = renderProjectHtml(baseHtml, project, path);

    const outDir = resolve(DIST_DIR, 'p', project.slug);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(resolve(outDir, 'index.html'), html, 'utf-8');
    written += 1;
  }

  console.log(`Prerender tamam: ${written}/${projects.length} proje sayfası dist/p/<slug>/index.html olarak yazıldı.`);
}

main();
