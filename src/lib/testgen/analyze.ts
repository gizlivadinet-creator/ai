import type { GeneratedFile } from '@/lib/types';

export interface DetectedSymbol {
  name: string;
  kind: 'function' | 'class' | 'route' | 'component';
  meta?: string; // e.g. HTTP method for routes
}

export interface FileAnalysis {
  file: GeneratedFile;
  lang: 'python' | 'javascript' | 'typescript' | 'php' | 'unknown';
  symbols: DetectedSymbol[];
}

function detectLang(file: GeneratedFile): FileAnalysis['lang'] {
  const p = file.path.toLowerCase();
  if (p.endsWith('.py')) return 'python';
  if (p.endsWith('.ts') || p.endsWith('.tsx')) return 'typescript';
  if (p.endsWith('.js') || p.endsWith('.jsx') || p.endsWith('.mjs')) return 'javascript';
  if (p.endsWith('.php')) return 'php';
  return 'unknown';
}

// Skip config/build/markup files — nothing meaningful to unit-test there.
const SKIP_PATTERNS = [
  /package(-lock)?\.json$/,
  /\.(md|txt|yml|yaml|toml|ini|cfg|lock)$/,
  /\.(html|css|scss)$/,
  /node_modules\//,
  /^tests?\//,
  /\.test\.|\.spec\./,
];

export function shouldGenerateTestsFor(file: GeneratedFile): boolean {
  return !SKIP_PATTERNS.some((re) => re.test(file.path));
}

export function analyzeFile(file: GeneratedFile): FileAnalysis {
  const lang = detectLang(file);
  const symbols: DetectedSymbol[] = [];
  const content = file.content;

  if (lang === 'python') {
    for (const m of content.matchAll(/^def\s+([a-zA-Z_]\w*)\s*\(/gm)) {
      if (!m[1].startsWith('_')) symbols.push({ name: m[1], kind: 'function' });
    }
    for (const m of content.matchAll(/^class\s+([A-Z]\w*)/gm)) {
      symbols.push({ name: m[1], kind: 'class' });
    }
    // Flask/FastAPI-style route decorators
    for (const m of content.matchAll(/@(?:app|router)\.(get|post|put|delete|patch)\(["']([^"']+)["']/gm)) {
      symbols.push({ name: m[2], kind: 'route', meta: m[1].toUpperCase() });
    }
  } else if (lang === 'javascript' || lang === 'typescript') {
    for (const m of content.matchAll(/export\s+function\s+([a-zA-Z_]\w*)\s*\(/gm)) {
      symbols.push({ name: m[1], kind: 'function' });
    }
    for (const m of content.matchAll(/export\s+const\s+([a-zA-Z_]\w*)\s*=\s*(?:async\s*)?\(/gm)) {
      symbols.push({ name: m[1], kind: 'function' });
    }
    for (const m of content.matchAll(/export\s+class\s+([A-Z]\w*)/gm)) {
      symbols.push({ name: m[1], kind: 'class' });
    }
    // Express-style routes
    for (const m of content.matchAll(/(?:app|router)\.(get|post|put|delete|patch)\(\s*["']([^"']+)["']/gm)) {
      symbols.push({ name: m[2], kind: 'route', meta: m[1].toUpperCase() });
    }
    // React function components (capitalized export function/const returning JSX-ish)
    for (const m of content.matchAll(/export\s+(?:default\s+)?function\s+([A-Z]\w*)/gm)) {
      symbols.push({ name: m[1], kind: 'component' });
    }
  } else if (lang === 'php') {
    for (const m of content.matchAll(/function\s+([a-zA-Z_]\w*)\s*\(/gm)) {
      if (!m[1].startsWith('__')) symbols.push({ name: m[1], kind: 'function' });
    }
    for (const m of content.matchAll(/class\s+([A-Z]\w*)/gm)) {
      symbols.push({ name: m[1], kind: 'class' });
    }
    // Laravel-style routes
    for (const m of content.matchAll(/Route::(get|post|put|delete|patch)\(\s*["']([^"']+)["']/gm)) {
      symbols.push({ name: m[2], kind: 'route', meta: m[1].toUpperCase() });
    }
  }

  // De-duplicate by name+kind
  const seen = new Set<string>();
  const unique = symbols.filter((s) => {
    const key = `${s.kind}:${s.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { file, lang, symbols: unique };
}

export function analyzeProject(files: GeneratedFile[]): FileAnalysis[] {
  return files
    .filter(shouldGenerateTestsFor)
    .map(analyzeFile)
    .filter((a) => a.lang !== 'unknown');
}
