
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
  role TEXT CHECK (role IN ('ATHLETE', 'COACH', 'PENDING', 'ADMIN')) NOT NULL DEFAULT 'PENDING',
  coach_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  invite_code TEXT UNIQUE,
  birth_date DATE,
  training_focus TEXT,
  personality_calibration TEXT DEFAULT 'BALANCED',
  is_premium BOOLEAN DEFAULT false,
  is_frozen BOOLEAN DEFAULT false,
  has_wearable BOOLEAN DEFAULT true,
  queued_alert TEXT,
  intelligence_packet JSONB,
  timezone TEXT DEFAULT 'America/New_York',
  last_active_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_coach_id ON public.profiles(coach_id);

CREATE TABLE IF NOT EXISTS public.education_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.education_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  regime TEXT,
  theme TEXT,
  content TEXT NOT NULL,
  approved BOOLEAN DEFAULT false,
  likes INTEGER DEFAULT 0,
  passes INTEGER DEFAULT 0,
  liked_by UUID[] DEFAULT '{}',
  passed_by UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

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
  read_by_coach BOOLEAN DEFAULT false,
  planned_mission_type TEXT,
  wearable_score INTEGER,
  divergence_intensity NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coach_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

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
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.global_config (
  id TEXT PRIMARY KEY,
  soul_document TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wellness_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submax_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_snippets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
    DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Athletes can manage own entries" ON public.wellness_entries;
    DROP POLICY IF EXISTS "Coaches can view their squad entries" ON public.wellness_entries;
    DROP POLICY IF EXISTS "Athletes view received adjustments" ON public.coach_adjustments;
    DROP POLICY IF EXISTS "Coaches manage sent adjustments" ON public.coach_adjustments;
    DROP POLICY IF EXISTS "Athletes manage own tests" ON public.submax_tests;
    DROP POLICY IF EXISTS "Coaches view squad tests" ON public.submax_tests;
    DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
    DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
    DROP POLICY IF EXISTS "Allow public read access to global_config" ON public.global_config;
    DROP POLICY IF EXISTS "Allow authenticated updates to global_config" ON public.global_config;
    DROP POLICY IF EXISTS "Public topics are viewable by everyone" ON public.education_topics;
    DROP POLICY IF EXISTS "Admins can manage topics" ON public.education_topics;
    DROP POLICY IF EXISTS "Public snippets are viewable by everyone" ON public.education_snippets;
    DROP POLICY IF EXISTS "Admins can manage snippets" ON public.education_snippets;
    DROP POLICY IF EXISTS "Users can update snippet interactions" ON public.education_snippets;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- Policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can manage own profile" ON public.profiles FOR ALL USING (
  auth.uid() = id OR 
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
);
CREATE POLICY "Athletes can manage own entries" ON public.wellness_entries FOR ALL USING (
  auth.uid() = user_id OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
);
CREATE POLICY "Coaches can view their squad entries" ON public.wellness_entries FOR SELECT USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN' OR
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = public.wellness_entries.user_id AND p.coach_id = auth.uid())
);
CREATE POLICY "Coaches can update squad entries" ON public.wellness_entries FOR UPDATE USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN' OR
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = public.wellness_entries.user_id AND p.coach_id = auth.uid())
);
CREATE POLICY "Athletes view received adjustments" ON public.coach_adjustments FOR SELECT USING (
  auth.uid() = user_id OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
);
CREATE POLICY "Coaches manage sent adjustments" ON public.coach_adjustments FOR ALL USING (
  auth.uid() = coach_id OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
);
CREATE POLICY "Athletes manage own tests" ON public.submax_tests FOR ALL USING (
  auth.uid() = user_id OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
);
CREATE POLICY "Coaches view squad tests" ON public.submax_tests FOR SELECT USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN' OR
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = public.submax_tests.user_id AND p.coach_id = auth.uid())
);

-- Messages Policies
CREATE POLICY "Users can view their own messages" ON public.messages FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id
);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id
);
CREATE POLICY "Users can update their own received messages" ON public.messages FOR UPDATE USING (
  auth.uid() = receiver_id
);

-- Global Config Policies
CREATE POLICY "Allow public read access to global_config" ON public.global_config FOR SELECT USING (true);
CREATE POLICY "Allow authenticated updates to global_config" ON public.global_config FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
);

-- Education Policies
CREATE POLICY "Public topics are viewable by everyone" ON public.education_topics FOR SELECT USING (true);
CREATE POLICY "Admins can manage topics" ON public.education_topics FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
);

CREATE POLICY "Public snippets are viewable by everyone" ON public.education_snippets FOR SELECT USING (true);
CREATE POLICY "Admins can manage snippets" ON public.education_snippets FOR ALL USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'ADMIN'
);
CREATE POLICY "Users can update snippet interactions" ON public.education_snippets FOR UPDATE USING (
  auth.uid() IS NOT NULL
);

-- Seed Data
INSERT INTO public.global_config (id, soul_document)
VALUES (
  'MASTER_SOUL', 
  'You are the PerHea AI Performance Director. Your tone is elite, clinical, yet deeply human. You use the Hooper-Mackinnon model to analyze readiness. You prioritize long-term adaptation over short-term gains. Be concise, authoritative, and always look for the "analog" story behind the digital metrics.'
)
ON CONFLICT (id) DO NOTHING;
