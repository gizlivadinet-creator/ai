import { createClient } from '@supabase/supabase-js';
import { getOwnerToken } from '@/lib/utils';

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
    // IMPORTANT: this app uses a hash-based router (`#/library`, `#/p/slug`,
    // see lib/router.ts). The default browser client uses the *implicit*
    // grant, which returns the OAuth tokens as a URL hash fragment
    // (`#access_token=...&refresh_token=...`). That collides directly with
    // our own router reading/writing `window.location.hash`, so the tokens
    // were being dropped and the user was bounced back to a logged-out
    // state after "successfully" signing in with Google.
    // PKCE returns the auth code as a query string (`?code=...`) instead,
    // which never touches the hash, so it is immune to that collision.
    flowType: 'pkce',
  },
  global: {
    // Lets Postgres RLS policies (see supabase/migrations) verify that a
    // write to an anonymously-owned row comes from the browser that
    // created it, via `current_setting('request.headers')->>'x-owner-token'`.
    headers: { 'x-owner-token': getOwnerToken() },
  },
});

/** Starts the Google OAuth sign-in flow (redirects back to the current origin+path, outside the hash router). */
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

/**
 * Supabase redirects failed OAuth attempts back to the app with
 * `?error=...&error_description=...` (e.g. misconfigured redirect URL,
 * provider not enabled, user closed the consent screen). Previously nothing
 * read these, so a failed login looked identical to "button did nothing".
 * Call once on startup; returns a human-readable message (or null) and
 * strips the params from the URL so a refresh doesn't re-show it.
 */
export function consumeAuthCallbackError(): string | null {
  const url = new URL(window.location.href);
  const error = url.searchParams.get('error_description') || url.searchParams.get('error');
  if (!error) return null;
  url.searchParams.delete('error');
  url.searchParams.delete('error_description');
  url.searchParams.delete('error_code');
  window.history.replaceState({}, '', url.toString());
  return decodeURIComponent(error.replace(/\+/g, ' '));
}
