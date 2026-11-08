-- ElectionLab 2.0 admin-only database additions.
-- Run ONCE in Supabase > SQL Editor (after backing up your database).
-- This script does not delete, truncate, rename or overwrite existing data.
-- It assumes the existing admins table and public.is_admin() function remain intact.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.primary_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  party text NOT NULL CHECK (party IN ('D','R')),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  photo_url text,
  website_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS primary_candidates_unique_party_name
  ON public.primary_candidates (party, lower(name));
CREATE INDEX IF NOT EXISTS primary_candidates_party_idx
  ON public.primary_candidates (party, status);

CREATE TABLE IF NOT EXISTS public.presidential_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pollster text NOT NULL,
  dem_candidate text NOT NULL,
  rep_candidate text NOT NULL,
  state_code text NOT NULL DEFAULT 'US' CHECK (state_code ~ '^[A-Z]{2}$'),
  start_date date NOT NULL,
  end_date date NOT NULL,
  sample_size integer CHECK (sample_size IS NULL OR sample_size > 0),
  population text NOT NULL DEFAULT 'LV' CHECK (population IN ('LV','RV','A')),
  dem_pct numeric(5,2) NOT NULL CHECK (dem_pct BETWEEN 0 AND 100),
  rep_pct numeric(5,2) NOT NULL CHECK (rep_pct BETWEEN 0 AND 100),
  quality_weight numeric(4,2) NOT NULL DEFAULT 1 CHECK (quality_weight BETWEEN 0.25 AND 2),
  source_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pres_poll_date_order CHECK (end_date >= start_date),
  CONSTRAINT pres_poll_share_ceiling CHECK (dem_pct + rep_pct <= 100.01)
);
CREATE INDEX IF NOT EXISTS presidential_polls_date_idx ON public.presidential_polls (end_date DESC);
CREATE INDEX IF NOT EXISTS presidential_polls_scope_idx ON public.presidential_polls (state_code, status);

ALTER TABLE public.primary_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presidential_polls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "primary candidates public active read" ON public.primary_candidates;
CREATE POLICY "primary candidates public active read" ON public.primary_candidates
FOR SELECT TO anon, authenticated USING (status = 'active' OR public.is_admin());
DROP POLICY IF EXISTS "primary candidates admin manages" ON public.primary_candidates;
CREATE POLICY "primary candidates admin manages" ON public.primary_candidates
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "presidential polls public published read" ON public.presidential_polls;
CREATE POLICY "presidential polls public published read" ON public.presidential_polls
FOR SELECT TO anon, authenticated USING (status = 'published' OR public.is_admin());
DROP POLICY IF EXISTS "presidential polls admin manages" ON public.presidential_polls;
CREATE POLICY "presidential polls admin manages" ON public.presidential_polls
FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT ON public.primary_candidates, public.presidential_polls TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.primary_candidates, public.presidential_polls TO authenticated;
