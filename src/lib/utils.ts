export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

const OWNER_TOKEN_KEY = 'immaculate-owner-token';

/**
 * Returns a stable per-browser identifier used to prove ownership of
 * anonymously-created rows (see the `owner_token` column + RLS policies on
 * `projects`). Generated once and persisted in localStorage; sent on every
 * Supabase request via the `x-owner-token` header (see lib/supabase.ts) and
 * stamped onto rows this browser inserts (see lib/hooks.ts).
 */
export function getOwnerToken(): string {
  try {
    let token = localStorage.getItem(OWNER_TOKEN_KEY);
    if (!token) {
      token =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `ot_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(OWNER_TOKEN_KEY, token);
    }
    return token;
  } catch {
    // localStorage unavailable (private mode, etc.) — fall back to a
    // session-only token so writes still work, just without persistence.
    return `ot_session_${Math.random().toString(36).slice(2)}`;
  }
}

export function slugify(text: string): string {
  const map: Record<string, string> = {
    ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u',
    Ç: 'c', Ğ: 'g', İ: 'i', Ö: 'o', Ş: 's', Ü: 'u',
  };
  return text
    .split('')
    .map((ch) => map[ch] || ch)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

export function formatDate(iso: string, lang: 'tr' | 'en' = 'tr'): string {
  const d = new Date(iso);
  const locale = lang === 'tr' ? 'tr-TR' : 'en-US';
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatTime(iso: string, lang: 'tr' | 'en' = 'tr'): string {
  const d = new Date(iso);
  const locale = lang === 'tr' ? 'tr-TR' : 'en-US';
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(iso: string, lang: 'tr' | 'en' = 'tr'): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (lang === 'tr') {
    if (days > 0) return `${days} gün önce`;
    if (hours > 0) return `${hours} saat önce`;
    if (minutes > 0) return `${minutes} dakika önce`;
    return 'az önce';
  }
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'just now';
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    py: 'python', js: 'javascript', jsx: 'javascript', ts: 'typescript',
    tsx: 'typescript', php: 'php', html: 'html', css: 'css', json: 'json',
    md: 'markdown', sh: 'bash', yml: 'yaml', yaml: 'yaml', sql: 'sql',
    txt: 'text', env: 'ini', xml: 'xml', go: 'go', rs: 'rust', java: 'java',
    c: 'c', cpp: 'cpp', rb: 'ruby', vue: 'vue', scss: 'scss', toml: 'toml',
  };
  return map[ext] || 'text';
}
