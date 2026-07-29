import { createClient } from '@supabase/supabase-js';

// The anon key is designed to be public (protected by RLS), so it is safe to
// embed in the frontend bundle.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://dcjyoqhuzelsmtdqxosp.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjanlvcWh1emVsc210ZHF4b3NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNjI0NDEsImV4cCI6MjEwMDYzODQ0MX0.JSxw08a5K_jHjOyDIsBRensd-KCyF6-MmeSuboBff4g';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'immaculate-auth',
  },
});

// PostgREST caps any single response at its own `max-rows` setting
// (commonly 1000), and several call sites in this app additionally applied
// a hard `.limit(...)` well below that. Both effectively made the app
// invisibly drop rows once a table grew past the cap — search would look
// "wrong" or "incomplete" simply because it was never shown the rest of
// the data. `fetchAllRows` walks the full table in fixed-size pages via
// `.range()` until a short page confirms the end, and de-duplicates by
// primary key defensively (in case the same row is ever returned twice,
// e.g. a page boundary lands mid-insert under concurrent writes).
const PAGE_SIZE = 500;
// Safety ceiling so a misbehaving query (one that always returns a full
// page, e.g. due to a bad filter) can't loop forever.
const MAX_PAGES = 400; // 400 * 500 = 200,000 rows

export interface FetchAllRowsResult<T> {
  rows: T[];
  /** true if the safety ceiling was hit before reaching the last page — the result may be incomplete. */
  truncated: boolean;
}

/**
 * Runs `buildQuery` repeatedly over `.range(from, to)` windows until a page
 * comes back shorter than PAGE_SIZE, collecting every row along the way.
 *
 * `buildQuery(from, to)` must return the query itself (not yet awaited)
 * with `.range(from, to)` applied, e.g.:
 *
 *   fetchAllRows<Project>((from, to) =>
 *     supabase.from('projects').select('*').order('created_at', { ascending: false }).range(from, to)
 *   )
 */
export async function fetchAllRows<T>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  idKey: keyof T = 'id' as keyof T,
): Promise<FetchAllRowsResult<T>> {
  const rows: T[] = [];
  const seen = new Set<unknown>();
  let from = 0;

  for (let page = 0; page < MAX_PAGES; page++) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await buildQuery(from, to);
    if (error) {
      console.error(`fetchAllRows: page ${page} (rows ${from}-${to}) failed:`, error.message);
      throw new Error(error.message);
    }

    const batch = data ?? [];
    for (const row of batch) {
      const key = row[idKey];
      if (!seen.has(key)) {
        seen.add(key);
        rows.push(row);
      }
    }

    if (batch.length < PAGE_SIZE) {
      return { rows, truncated: false };
    }
    from += PAGE_SIZE;
  }

  console.warn(
    `fetchAllRows: hit the ${MAX_PAGES}-page safety ceiling (${MAX_PAGES * PAGE_SIZE} rows) — result may be incomplete.`,
  );
  return { rows, truncated: true };
}

/**
 * Escapes a raw, user-typed string so it can be safely embedded inside a
 * PostgREST `ilike.` filter value:
 *  1. Escapes LIKE metacharacters (`%`, `_`, `\`) so the user's own text is
 *     matched literally instead of being interpreted as a wildcard —
 *     without this, a search for e.g. "50% off" or "my_script" could
 *     silently match unrelated rows.
 *  2. Escapes double quotes so the value can be safely wrapped in `"..."`
 *     when used inside `.or(...)`, which PostgREST requires whenever the
 *     value might contain a comma or parenthesis (both are structural
 *     separators in `.or()`'s mini-syntax) — otherwise a search containing
 *     a comma silently truncates the filter or throws a parse error.
 */
export function escapeIlikeValue(raw: string): string {
  return raw
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/"/g, '\\"');
}

/** Starts the Google OAuth sign-in flow (redirects back to the current hash route). */
export async function signInWithGoogle() {
  const redirectTo = window.location.origin + window.location.pathname;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: { access_type: 'online', prompt: 'select_account' },
    },
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
