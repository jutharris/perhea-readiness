-- Supabase Database Schema for PerHea Athlete Readiness
-- Run this in the Supabase SQL Editor to initialize your backend.

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('ATHLETE', 'COACH')) NOT NULL,
  coach_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Wellness Entries
CREATE TABLE IF NOT EXISTS wellness_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  session_type TEXT CHECK (session_type IN ('TRAINING', 'COMPETITION', 'TRAVEL', 'REST')),
  last_session_rpe INTEGER CHECK (last_session_rpe >= 1 AND last_session_rpe <= 10),
  energy INTEGER CHECK (energy >= 1 AND energy <= 7),
  soreness INTEGER CHECK (soreness >= 1 AND soreness <= 7),
  sleep_hours FLOAT,
  sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 7),
  stress INTEGER CHECK (stress >= 1 AND stress <= 7),
  social INTEGER CHECK (social >= 1 AND social <= 7),
  feeling_sick BOOLEAN DEFAULT false,
  sick_last_48h BOOLEAN DEFAULT false,
  injured BOOLEAN DEFAULT false,
  injury_detail TEXT,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Sensitivity Profiles
CREATE TABLE IF NOT EXISTS sensitivity_profiles (
  coach_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  resilience TEXT CHECK (resilience IN ('CONSERVATIVE', 'BALANCED', 'ELITE')) DEFAULT 'BALANCED',
  priority_metric TEXT CHECK (priority_metric IN ('SLEEP', 'ENERGY', 'SORENESS', 'STRESS')) DEFAULT 'ENERGY'
);

-- 4. Athlete Configs
CREATE TABLE IF NOT EXISTS athlete_configs (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  calibration TEXT CHECK (calibration IN ('STOIC', 'BALANCED', 'EXPRESSIVE')) DEFAULT 'BALANCED'
);

-- 5. Coach Principles
CREATE TABLE IF NOT EXISTS coach_principles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  instruction TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Coach Adjustments
CREATE TABLE IF NOT EXISTS coach_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  coach_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
