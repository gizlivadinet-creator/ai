import { createClient } from '@supabase/supabase-js';

// The anon key is designed to be public (protected by RLS), so it is safe to
// embed in the frontend bundle. Fallbacks guarantee the client works on
// GitHub Pages even when env injection is unavailable.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://jjspourlctgyrtaxrxon.supabase.co';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impqc3BvdXJsY3RneXJ0YXhyeG9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNTE5MTQsImV4cCI6MjEwMDYyNzkxNH0.1zVvf2rktre7Asqf2Rz6kuIX5RepXPa-_sgLIBUu7GU';

const OWNER_TOKEN_KEY = 'immaculate-owner-token';

// Each browser gets a random, persistent "owner token". It is not a login —
// there is no account system — but it lets RLS scope UPDATE/DELETE to the
// rows a given browser actually created, instead of leaving every project
// in the shared pool editable/deletable by anyone. See migration
// 20260726120000_add_analysis_and_owner_token.sql.
export function getOwnerToken(): string {
  let token = localStorage.getItem(OWNER_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(OWNER_TOKEN_KEY, token);
  }
  return token;
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
  global: {
    headers: { 'x-owner-token': getOwnerToken() },
  },
});
