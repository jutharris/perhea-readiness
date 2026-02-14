-- 1. CLEANUP (Optional: Only run if you want a totally fresh start)
-- DROP TABLE IF EXISTS wellness_entries CASCADE;
-- DROP TABLE IF EXISTS coach_adjustments CASCADE;
-- DROP TABLE IF EXISTS profiles CASCADE;

-- 2. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT CHECK (role IN ('ATHLETE', 'COACH')) NOT NULL DEFAULT 'ATHLETE',
  coach_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. WELLNESS ENTRIES TABLE
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
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. COACH ADJUSTMENTS TABLE
CREATE TABLE IF NOT EXISTS public.coach_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wellness_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_adjustments ENABLE ROW LEVEL SECURITY;

-- 6. POLICIES: PROFILES
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Coaches can view their athletes" ON public.profiles FOR SELECT USING (
  auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'COACH')
);

-- 7. POLICIES: WELLNESS ENTRIES
CREATE POLICY "Athletes can view own entries" ON public.wellness_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Athletes can insert own entries" ON public.wellness_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Coaches can view athlete entries" ON public.wellness_entries FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE public.profiles.id = public.wellness_entries.user_id 
    AND public.profiles.coach_id = auth.uid()
  )
);

-- 8. POLICIES: COACH ADJUSTMENTS
CREATE POLICY "Users can view adjustments sent to them" ON public.coach_adjustments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Coaches can view adjustments they sent" ON public.coach_adjustments FOR SELECT USING (auth.uid() = coach_id);
CREATE POLICY "Coaches can insert adjustments" ON public.coach_adjustments FOR INSERT WITH CHECK (auth.uid() = coach_id);

-- 9. AUTH TRIGGER (Automatically creates profile on Sign Up)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'first_name', 
    new.raw_user_meta_data->>'last_name', 
    COALESCE(new.raw_user_meta_data->>'role', 'ATHLETE')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
