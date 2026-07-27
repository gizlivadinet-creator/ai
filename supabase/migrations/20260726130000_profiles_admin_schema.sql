/*
# Profiles, comments, moderation & admin schema

1. Problem being fixed
- The frontend (src/lib/auth.tsx, src/components/AdminView.tsx) already reads
  and writes `profiles`, `comments`, `site_settings`, and `audit_log`, and
  calls `admin_ban_user` / `admin_unban_user` / `admin_set_role` RPCs.
  None of these existed in the database — only `projects` did. This meant:
  - Google sign-in could succeed and still look "broken", because the
    profile lookup always returned nothing (relation does not exist).
  - The entire Admin Panel (all 5 tabs) was non-functional.
  - There was no way to ever become an admin (chicken-and-egg problem).
  - Admins could not delete/update rows in `projects` either, because the
    owner_token-based RLS policies (previous migration) have no admin
    bypass and the frontend never sent an owner_token that matched.

2. New tables
- `profiles`   — 1:1 with auth.users, auto-created by a trigger on signup.
- `comments`   — project comments/moderation queue.
- `site_settings` — small admin-editable key/value config store.
- `audit_log`  — written only by SECURITY DEFINER admin RPCs, never directly.

3. Security
- RLS enabled on every table.
- `is_admin(uuid)` is a SECURITY DEFINER helper so admin-only policies don't
  recurse into `profiles` RLS when checking the caller's own role.
- Role/ban changes only happen through SECURITY DEFINER RPCs, which also
  write an audit_log row — never via direct table UPDATE from the client.
- `admin_bootstrap_first_admin()` lets the very first authenticated user
  claim the admin role exactly once (no-op forever after that), so there is
  a safe way in without needing direct database/service-role access.
- `projects` gets an explicit admin-bypass policy for UPDATE/DELETE, since
  the owner_token scheme alone gives moderators no way to act on rows they
  didn't create.
*/

-- ============================================================================
-- 1. profiles
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text NOT NULL DEFAULT '',
  avatar_url text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_banned boolean NOT NULL DEFAULT false,
  ban_reason text,
  banned_at timestamptz,
  banned_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER: safe to call from any RLS policy without recursing
-- back into profiles' own RLS (which would otherwise deadlock the check).
CREATE OR REPLACE FUNCTION is_admin(check_user uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = check_user AND role = 'admin' AND NOT is_banned
  );
$$;

DROP POLICY IF EXISTS "profiles_select_self" ON profiles;
CREATE POLICY "profiles_select_self" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
CREATE POLICY "profiles_select_admin" ON profiles FOR SELECT
  TO authenticated USING (is_admin(auth.uid()));

-- Users may edit their own display name/avatar, but never their own role
-- or ban status (that only happens via the admin RPCs below).
DROP POLICY IF EXISTS "profiles_update_self" ON profiles;
CREATE POLICY "profiles_update_self" ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
    AND is_banned = (SELECT is_banned FROM profiles WHERE id = auth.uid())
  );

-- Auto-provision a profile row whenever someone signs up (Google or any
-- other provider). Without this, `profiles` stayed empty forever and every
-- signed-in user looked "logged out" in the UI (no display_name/avatar,
-- isAdmin always false).
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email, ''), '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Backfill profiles for any user that already exists in auth.users but
-- signed up before this migration ran.
INSERT INTO profiles (id, email, display_name, avatar_url)
SELECT
  u.id,
  COALESCE(u.email, ''),
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(COALESCE(u.email, ''), '@', 1)),
  u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. comments
-- ============================================================================

CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  avatar_url text,
  content text NOT NULL,
  media jsonb NOT NULL DEFAULT '[]'::jsonb,
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  is_flagged boolean NOT NULL DEFAULT false,
  flagged_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS comments_project_id_idx ON comments (project_id);

DROP POLICY IF EXISTS "comments_select_all" ON comments;
CREATE POLICY "comments_select_all" ON comments FOR SELECT
  TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION is_banned_user(check_user uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT COALESCE((SELECT is_banned FROM profiles WHERE id = check_user), false);
$$;

DROP POLICY IF EXISTS "comments_insert_own" ON comments;
CREATE POLICY "comments_insert_own" ON comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND NOT is_banned_user(auth.uid()));

DROP POLICY IF EXISTS "comments_update_own" ON comments;
CREATE POLICY "comments_update_own" ON comments FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "comments_delete_own_or_admin" ON comments;
CREATE POLICY "comments_delete_own_or_admin" ON comments FOR DELETE
  TO authenticated USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- ============================================================================
-- 3. site_settings
-- ============================================================================

CREATE TABLE IF NOT EXISTS site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_settings_select_all" ON site_settings;
CREATE POLICY "site_settings_select_all" ON site_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "site_settings_admin_write" ON site_settings;
CREATE POLICY "site_settings_admin_write" ON site_settings FOR UPDATE
  TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "site_settings_admin_insert" ON site_settings;
CREATE POLICY "site_settings_admin_insert" ON site_settings FOR INSERT
  TO authenticated WITH CHECK (is_admin(auth.uid()));

INSERT INTO site_settings (key, value) VALUES
  ('maintenance_mode', 'false'::jsonb),
  ('allow_comments', 'true'::jsonb),
  ('allow_new_generation', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 4. audit_log
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log_select_admin" ON audit_log;
CREATE POLICY "audit_log_select_admin" ON audit_log FOR SELECT
  TO authenticated USING (is_admin(auth.uid()));
-- No INSERT/UPDATE/DELETE policy for regular clients on purpose: rows are
-- only ever written by the SECURITY DEFINER functions below, which run
-- with elevated privileges regardless of RLS.

-- ============================================================================
-- 5. Admin RPCs (SECURITY DEFINER — enforce is_admin() themselves)
-- ============================================================================

CREATE OR REPLACE FUNCTION admin_ban_user(target_user uuid, reason text DEFAULT '')
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE profiles
  SET is_banned = true, ban_reason = reason, banned_at = now(), banned_by = auth.uid(), updated_at = now()
  WHERE id = target_user;
  INSERT INTO audit_log (actor_id, action, target_type, target_id, meta)
  VALUES (auth.uid(), 'ban_user', 'profile', target_user, jsonb_build_object('reason', reason));
END;
$$;

CREATE OR REPLACE FUNCTION admin_unban_user(target_user uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE profiles
  SET is_banned = false, ban_reason = NULL, banned_at = NULL, banned_by = NULL, updated_at = now()
  WHERE id = target_user;
  INSERT INTO audit_log (actor_id, action, target_type, target_id)
  VALUES (auth.uid(), 'unban_user', 'profile', target_user);
END;
$$;

CREATE OR REPLACE FUNCTION admin_set_role(target_user uuid, new_role text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF new_role NOT IN ('user', 'admin') THEN
    RAISE EXCEPTION 'invalid role';
  END IF;
  -- Prevent an admin from locking everyone out by demoting the last admin.
  IF new_role = 'user' AND target_user = auth.uid()
     AND (SELECT count(*) FROM profiles WHERE role = 'admin') <= 1 THEN
    RAISE EXCEPTION 'cannot remove the last admin';
  END IF;
  UPDATE profiles SET role = new_role, updated_at = now() WHERE id = target_user;
  INSERT INTO audit_log (actor_id, action, target_type, target_id, meta)
  VALUES (auth.uid(), 'set_role', 'profile', target_user, jsonb_build_object('new_role', new_role));
END;
$$;

-- One-time bootstrap: the very first caller becomes admin; every call after
-- that is a safe no-op. Returns true iff it just promoted the caller.
CREATE OR REPLACE FUNCTION admin_bootstrap_first_admin()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'must be signed in';
  END IF;
  IF EXISTS (SELECT 1 FROM profiles WHERE role = 'admin') THEN
    RETURN false;
  END IF;
  UPDATE profiles SET role = 'admin', updated_at = now() WHERE id = auth.uid();
  INSERT INTO audit_log (actor_id, action, target_type, target_id)
  VALUES (auth.uid(), 'bootstrap_first_admin', 'profile', auth.uid());
  RETURN true;
END;
$$;

-- ============================================================================
-- 6. Admin bypass for projects (moderation without owner_token)
-- ============================================================================

DROP POLICY IF EXISTS "admin_update_projects" ON projects;
CREATE POLICY "admin_update_projects" ON projects FOR UPDATE
  TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

DROP POLICY IF EXISTS "admin_delete_projects" ON projects;
CREATE POLICY "admin_delete_projects" ON projects FOR DELETE
  TO authenticated USING (is_admin(auth.uid()));
