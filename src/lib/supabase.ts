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

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
