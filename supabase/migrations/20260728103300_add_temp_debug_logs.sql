/*
# Temporary debug_logs table

1. Problem being fixed
- The `generate-code` Edge Function's console.error() output is not visible
  in the Supabase log viewer (it only shows HTTP status, not the message
  text), which made diagnosing the "Kod üretimi sırasında bir hata oluştu"
  error impossible without this.
- This table was created directly against the remote database (outside of
  a committed migration) while debugging, which made `supabase db push`
  fail in CI with "Remote migration versions not found in local migrations
  directory." This migration file simply codifies that already-applied
  change so local and remote match again.

2. What it does
- Creates `debug_logs`, written to only by the Edge Function's service-role
  client (RLS enabled, no public policies — the service role key bypasses
  RLS entirely, and no anon/authenticated policy is defined, so it is not
  readable or writable from the client).

3. Removal
- This is intentionally temporary. Once generation is confirmed stable,
  drop this table with a follow-up migration:
  `DROP TABLE IF EXISTS debug_logs;`
  and remove the debugLog() calls from supabase/functions/generate-code/index.ts.
*/

CREATE TABLE IF NOT EXISTS debug_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  context text,
  message text
);

ALTER TABLE debug_logs ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT policies for anon/authenticated on purpose: only the
-- service-role client (used inside the Edge Function) can read/write this,
-- since service role bypasses RLS.
