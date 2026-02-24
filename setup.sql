
-- =========================================================
-- MASTER SETUP: PerHea Athlete Readiness Platform (v3.0)
-- =========================================================

-- 1. CLEANUP
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. TABLE CREATION
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT DEFAULT '',
  last_name TEXT DEFAULT '',
  role TEXT CHECK (role IN ('ATHLETE', 'COACH', 'PENDING')) NOT NULL DEFAULT 'PENDING',
  coach_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  invite_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_coach_id ON public.profiles(coach_id);

CREATE TABLE IF NOT EXISTS public.wellness_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  session_type TEXT DEFAULT 'TRAINING',
  last_session_rpe INTEGER DEFAULT 5,
  energy INTEGER DEFAULT 4,
  soreness INTEGER DEFAULT 4,
  sleep_hours NUMERIC DEFAULT 8,
  sleep_quality INTEGER DEFAULT 4,
  stress INTEGER DEFAULT 4,
  social INTEGER DEFAULT 4,
  feeling_sick BOOLEAN DEFAULT false,
  injured BOOLEAN DEFAULT false,
  menstrual_cycle BOOLEAN DEFAULT false,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coach_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- [Previous tables: profiles, wellness_entries, coach_adjustments]

CREATE TABLE IF NOT EXISTS public.submax_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  test_type TEXT NOT NULL,
  sport TEXT NOT NULL,
  file_name TEXT,
  file_start_ts TIMESTAMPTZ,
  test_start_ts TIMESTAMPTZ,
  test_end_ts TIMESTAMPTZ,
  elapsed_start_sec NUMERIC,
  elapsed_end_sec NUMERIC,
  summary JSONB,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.submax_tests ENABLE ROW LEVEL SECURITY;

-- 3. SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wellness_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_adjustments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
    DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Athletes can manage own entries" ON public.wellness_entries;
    DROP POLICY IF EXISTS "Coaches can view their squad entries" ON public.wellness_entries;
    DROP POLICY IF EXISTS "Athletes view received adjustments" ON public.coach_adjustments;
    DROP POLICY IF EXISTS "Coaches manage sent adjustments" ON public.coach_adjustments;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- Policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can manage own profile" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Athletes can manage own entries" ON public.wellness_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coaches can view their squad entries" ON public.wellness_entries FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = public.wellness_entries.user_id AND p.coach_id = auth.uid())
);
CREATE POLICY "Athletes view received adjustments" ON public.coach_adjustments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Coaches manage sent adjustments" ON public.coach_adjustments FOR ALL USING (auth.uid() = coach_id);
