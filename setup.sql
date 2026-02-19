
-- =========================================================
-- MASTER SETUP: PerHea Athlete Readiness Platform (v2.6)
-- =========================================================

-- 1. CLEANUP
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. TABLE CREATION
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
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

CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can manage own profile" ON public.profiles FOR ALL USING (auth.uid() = id);

CREATE POLICY "Athletes can manage own entries" ON public.wellness_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coaches can view their squad entries" ON public.wellness_entries FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = public.wellness_entries.user_id AND p.coach_id = auth.uid())
);
CREATE POLICY "Athletes view received adjustments" ON public.coach_adjustments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Coaches manage sent adjustments" ON public.coach_adjustments FOR ALL USING (auth.uid() = coach_id);

-- 4. AUTOMATION (SIGNUP TRIGGER)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  full_name_val TEXT;
  name_parts TEXT[];
  raw_meta JSONB;
BEGIN
  raw_meta := new.raw_user_meta_data;
  full_name_val := COALESCE(raw_meta->>'full_name', raw_meta->>'name', '');
  
  -- Use regex to split full name robustly
  name_parts := regexp_split_to_array(trim(full_name_val), '\s+');

  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(raw_meta->>'first_name', name_parts[1]),
    COALESCE(raw_meta->>'last_name', array_to_string(name_parts[2:], ' ')),
    'PENDING' -- Everyone starts here to trigger onboarding selection
  )
  ON CONFLICT (id) DO NOTHING;
    
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
