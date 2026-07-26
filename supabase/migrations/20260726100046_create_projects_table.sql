/*
# Create projects table for Claudia AI Coding Platform

1. New Tables
- `projects` — stores generated code projects from user prompts
  - `id` (uuid, PK)
  - `slug` (text, unique) — URL-friendly identifier for shareable links
  - `title` (text) — project title extracted from prompt
  - `description` (text) — project summary
  - `prompt` (text) — original user request
  - `category` (text) — python, javascript, php, web, api, automation, prompt
  - `primary_language` (text) — main programming language
  - `file_structure` (text) — folder tree as formatted text
  - `files` (jsonb) — array of {path, content, language}
  - `install_guide` (text) — installation instructions
  - `tags` (text[]) — categorization tags
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

2. Security
- Enable RLS on `projects`.
- This is a no-auth public knowledge pool: anon + authenticated can read, create, update, delete.
- Data is intentionally shared/public — all generated code is visible to everyone.

3. Indexes
- Unique index on `slug` for fast lookups and deduplication
- Index on `created_at` for chronological ordering
- Index on `category` for filtering by type
*/

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  prompt text NOT NULL,
  category text NOT NULL,
  primary_language text NOT NULL,
  file_structure text NOT NULL,
  files jsonb NOT NULL DEFAULT '[]'::jsonb,
  install_guide text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_projects" ON projects;
CREATE POLICY "public_select_projects" ON projects FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_projects" ON projects;
CREATE POLICY "public_insert_projects" ON projects FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_projects" ON projects;
CREATE POLICY "public_update_projects" ON projects FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_projects" ON projects;
CREATE POLICY "public_delete_projects" ON projects FOR DELETE
  TO anon, authenticated USING (true);

CREATE UNIQUE INDEX IF NOT EXISTS projects_slug_idx ON projects (slug);
CREATE INDEX IF NOT EXISTS projects_created_at_idx ON projects (created_at DESC);
CREATE INDEX IF NOT EXISTS projects_category_idx ON projects (category);