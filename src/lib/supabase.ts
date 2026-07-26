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
