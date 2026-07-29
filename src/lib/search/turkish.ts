/**
 * Turkish-aware text handling for search.
 *
 * Two real, well-documented bugs this fixes:
 *
 * 1. Dotted/dotless I: JS's default (locale-less) `.toLowerCase()` does NOT
 *    apply Turkish case-folding rules. `"İstanbul".toLowerCase()` produces
 *    "i̇stanbul" (a combining-dot-above character), not "istanbul" — so a
 *    plain lowercase compare silently fails to match perfectly normal
 *    Turkish text. `toLocaleLowerCase('tr-TR')` folds this correctly.
 *
 * 2. Keyboard/typing variance: many users type Turkish without diacritics
 *    (no Turkish keyboard layout, muscle memory from English, mobile
 *    autocorrect, etc.) — "sifre" for "şifre", "kullanici" for "kullanıcı".
 *    A pure fuzzy-distance search treats every missing diacritic as an
 *    edit, which adds up fast on longer words and pushes real matches out
 *    of Fuse's threshold. Comparing on a diacritic-stripped form fixes this
 *    without weakening exact-match ranking (that's still handled by Fuse
 *    on the original text).
 */

const TR_LOWER_MAP: Record<string, string> = {
  İ: 'i', I: 'ı', Ç: 'ç', Ğ: 'ğ', Ö: 'ö', Ş: 'ş', Ü: 'ü',
};

/** Correct Turkish lowercasing (handles the İ/I/ı distinction). */
export function turkishLowerCase(s: string): string {
  return s.toLocaleLowerCase('tr-TR');
}

const DEASCIIFY_MAP: Record<string, string> = {
  ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', I: 'i', İ: 'i',
  ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u',
};

/**
 * Normalizes text for tolerant comparison: correct Turkish lowercasing,
 * then strips Turkish diacritics down to their plain-ASCII base letter.
 * Use this to build a secondary, forgiving index — never as the only form,
 * since it deliberately loses information (ş/s become indistinguishable).
 */
export function foldTurkish(s: string): string {
  let out = '';
  for (const ch of s) {
    out += DEASCIIFY_MAP[ch] ?? ch;
  }
  return turkishLowerCase(out);
}

/**
 * Small domain synonym dictionary for this app's content (coding/tech
 * terms in Turkish + common EN/TR pairs). Bidirectional: looking up any
 * member of a group returns the whole group. Kept intentionally small and
 * curated rather than a huge generic thesaurus, since irrelevant synonym
 * expansion just adds noise to ranking.
 */
const SYNONYM_GROUPS: string[][] = [
  ['hızlı', 'performanslı', 'performans', 'optimize', 'optimizasyon', 'fast'],
  ['güvenlik', 'güvenli', 'security', 'secure'],
  ['resim', 'görsel', 'fotoğraf', 'image', 'picture'],
  ['video', 'film', 'klip'],
  ['ses', 'audio', 'sound'],
  ['site', 'web sitesi', 'website', 'internet sitesi'],
  ['uygulama', 'app', 'application', 'yazılım', 'program'],
  ['api', 'arayüz', 'servis', 'service'],
  ['veritabanı', 'database', 'db', 'veri tabanı'],
  ['otomasyon', 'automation', 'bot'],
  ['mobil', 'mobile', 'telefon'],
  ['ödeme', 'payment', 'ödeme sistemi', 'checkout'],
  ['giriş', 'login', 'oturum açma', 'kimlik doğrulama', 'authentication', 'auth'],
  ['kayıt', 'signup', 'register', 'kayıt ol'],
  ['e-ticaret', 'eticaret', 'ecommerce', 'e-commerce', 'online mağaza', 'mağaza'],
  ['sohbet', 'chat', 'mesajlaşma', 'messaging'],
  ['yapay zeka', 'yapay zekâ', 'ai', 'ml', 'makine öğrenmesi'],
  ['oyun', 'game'],
  ['blog', 'makale', 'içerik'],
  ['gösterge paneli', 'dashboard', 'panel'],
  ['dosya', 'file', 'belge', 'document'],
  ['takvim', 'calendar', 'ajanda'],
  ['harita', 'map', 'konum', 'location'],
  ['bildirim', 'notification', 'uyarı'],
  ['arama', 'search', 'sorgu', 'query'],
  ['şifre', 'parola', 'password', 'sifre'],
  ['kullanıcı', 'user', 'üye', 'member'],
];

const synonymIndex = new Map<string, Set<string>>();
for (const group of SYNONYM_GROUPS) {
  const folded = group.map(foldTurkish);
  const all = new Set(folded);
  for (const term of folded) {
    const existing = synonymIndex.get(term);
    if (existing) {
      for (const t of all) existing.add(t);
    } else {
      synonymIndex.set(term, new Set(all));
    }
  }
}

/**
 * Expands a raw query into itself plus any known synonym terms found
 * within it, each as a separate alternate query string. Word-boundary
 * substitution only (won't rewrite "e-ticaret" inside "e-ticaretim" oddly,
 * since it works on tokenized words, not substrings).
 */
export function expandSynonyms(query: string): string[] {
  const folded = foldTurkish(query);
  const words = folded.split(/\s+/).filter(Boolean);
  const variants = new Set<string>([query]);

  for (const word of words) {
    const group = synonymIndex.get(word);
    if (!group) continue;
    for (const synonym of group) {
      if (synonym === word) continue;
      // Swap just that one word into the original query, preserving the
      // rest of it, so e.g. "hızlı e-ticaret sitesi" also tries
      // "performanslı e-ticaret sitesi".
      const rebuilt = folded.split(/\s+/).map((w) => (w === word ? synonym : w)).join(' ');
      variants.add(rebuilt);
    }
  }

  return Array.from(variants);
}
