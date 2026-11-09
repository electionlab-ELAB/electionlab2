-- ElectionLab Owner / Worker Accounts — additive migration
-- Run once in Supabase SQL Editor, AFTER BACKING UP YOUR DATABASE.
-- This migration does NOT erase existing users, polls, or forecasts.
-- FIRST OWNER: if exactly one administrator currently exists, that account becomes owner.
-- If you have multiple admins, run the owner assignment query in README-OWNER-WORKER.md.
BEGIN;

ALTER TABLE public.admins
 ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'worker',
 ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
 ADD COLUMN IF NOT EXISTS display_name text,
 ADD COLUMN IF NOT EXISTS email text,
 ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '{"edit_polls":true,"edit_candidates":true,"edit_forecasts":true,"edit_website":true,"import_spreadsheets":true}'::jsonb;

DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'el_admins_role_check' AND conrelid = 'public.admins'::regclass) THEN
  ALTER TABLE public.admins ADD CONSTRAINT el_admins_role_check CHECK (role IN ('owner','worker'));
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'el_admins_permissions_object_check' AND conrelid = 'public.admins'::regclass) THEN
  ALTER TABLE public.admins ADD CONSTRAINT el_admins_permissions_object_check CHECK (jsonb_typeof(permissions) = 'object');
 END IF;
END $$;

-- Preserve old admins; promote only when the existing account is unambiguous.
DO $$ BEGIN
 IF (SELECT count(*) FROM public.admins WHERE role='owner') = 0
    AND (SELECT count(*) FROM public.admins) = 1 THEN
   UPDATE public.admins SET role='owner', is_active=true;
 END IF;
END $$;

UPDATE public.admins a
SET email = u.email
FROM auth.users u
WHERE a.user_id = u.id AND a.email IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS el_only_one_owner ON public.admins (role) WHERE role = 'owner';

-- Owner can never be disabled, demoted or deleted by the application.
CREATE OR REPLACE FUNCTION public.el_protect_owner()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN
  IF OLD.role = 'owner' THEN RAISE EXCEPTION 'ElectionLab owner is protected'; END IF;
  RETURN OLD;
 END IF;
 IF OLD.role = 'owner' AND (
  NEW.role <> 'owner' OR NEW.user_id IS DISTINCT FROM OLD.user_id OR NOT NEW.is_active
 ) THEN RAISE EXCEPTION 'ElectionLab owner cannot be disabled or demoted'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS el_protect_owner_trigger ON public.admins;
CREATE TRIGGER el_protect_owner_trigger BEFORE UPDATE OR DELETE ON public.admins
FOR EACH ROW EXECUTE FUNCTION public.el_protect_owner();

-- Lookups always hit the DATABASE (not stale JWT role claims), so a revoked
-- worker loses access on the very next ordinary protected database request.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS (SELECT 1 FROM public.admins a
 WHERE a.user_id = (SELECT auth.uid()) AND a.is_active = true
 AND a.role IN ('owner','worker'));
$$;
CREATE OR REPLACE FUNCTION public.el_is_owner()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS (SELECT 1 FROM public.admins a
 WHERE a.user_id = (SELECT auth.uid()) AND a.is_active = true AND a.role = 'owner');
$$;
CREATE OR REPLACE FUNCTION public.el_has_permission(permission_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS (SELECT 1 FROM public.admins a
 WHERE a.user_id = (SELECT auth.uid()) AND a.is_active = true
 AND (a.role='owner' OR a.permissions ->> permission_name = 'true'));
$$;
REVOKE ALL ON FUNCTION public.el_is_owner() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.el_has_permission(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.el_is_owner(),public.el_has_permission(text) TO authenticated;

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "el owner reads staff" ON public.admins;
CREATE POLICY "el owner reads staff" ON public.admins FOR SELECT TO authenticated
 USING ((SELECT public.el_is_owner()));
-- The existing "admins read self" policy continues to let workers read themselves.
REVOKE INSERT, UPDATE, DELETE ON public.admins FROM anon, authenticated;
GRANT SELECT ON public.admins TO authenticated;

-- Add RESTRICTIVE, write-only policies. These augment existing ElectionLab
-- admin RLS rules, without altering public SELECT/read policies.
-- Scope: all known *direct table writes* from the 2028 admin dashboard.
DO $do$
DECLARE item record; op text; p_name text;
BEGIN
 FOR item IN
  SELECT t.table_name, t.capability
  FROM (VALUES
   ('polls','edit_polls'),('generic_ballot_polls','edit_polls'),
   ('approval_polls','edit_polls'),('primary_polls','edit_polls'),
   ('presidential_polls','edit_polls'),
   ('candidates','edit_candidates'),('primary_candidates','edit_candidates'),
   ('races','edit_candidates'),
   ('site_settings','edit_website'),
   ('forecast_changes','edit_forecasts'),('control_forecasts','edit_forecasts'),
   ('fundraising','edit_forecasts'),('approval_data','edit_forecasts'),
   ('race_developments','edit_forecasts')
  ) AS t(table_name,capability)
  JOIN pg_class c ON c.oid = to_regclass('public.' || t.table_name)
  WHERE c.relkind IN ('r','p') AND c.relrowsecurity
 LOOP
  FOREACH op IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
   p_name := 'el guard ' || item.table_name || ' ' || lower(op);
   EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',p_name,item.table_name);
   IF op = 'INSERT' THEN
    EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK ((SELECT public.el_has_permission(%L)))',p_name,item.table_name,item.capability);
   ELSIF op = 'UPDATE' THEN
    EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING ((SELECT public.el_has_permission(%L))) WITH CHECK ((SELECT public.el_has_permission(%L)))',p_name,item.table_name,item.capability,item.capability);
   ELSE
    EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING ((SELECT public.el_has_permission(%L)))',p_name,item.table_name,item.capability);
   END IF;
  END LOOP;
 END LOOP;
END $do$;

-- Candidate photo uploads are governed by candidate-editing permission.
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM storage.buckets WHERE id='candidate-photos') THEN
  DROP POLICY IF EXISTS "ElectionLab admin uploads candidate photos" ON storage.objects;
  CREATE POLICY "ElectionLab admin uploads candidate photos" ON storage.objects
   FOR INSERT TO authenticated WITH CHECK (bucket_id='candidate-photos' AND public.el_has_permission('edit_candidates'));
  DROP POLICY IF EXISTS "ElectionLab admin deletes candidate photos" ON storage.objects;
  CREATE POLICY "ElectionLab admin deletes candidate photos" ON storage.objects
   FOR DELETE TO authenticated USING (bucket_id='candidate-photos' AND public.el_has_permission('edit_candidates'));
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.el_staff_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 target_user_id uuid,
 action text NOT NULL,
 details jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.el_staff_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "el owner reads staff audit" ON public.el_staff_audit;
CREATE POLICY "el owner reads staff audit" ON public.el_staff_audit FOR SELECT TO authenticated
 USING ((SELECT public.el_is_owner()));
REVOKE ALL ON public.el_staff_audit FROM anon,authenticated;
GRANT SELECT ON public.el_staff_audit TO authenticated;

COMMIT;
