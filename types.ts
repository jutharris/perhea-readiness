export type UserRole = 'ATHLETE' | 'COACH' | 'PENDING';
export type SessionType = 'TRAINING' | 'COMPETITION' | 'TRAVEL' | 'REST';
export type ReadinessStatus = 'READY' | 'MINDFUL' | 'RECOVERY';
export type PersonalityCalibration = 'STOIC' | 'BALANCED' | 'EXPRESSIVE';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  coachId?: string;
  inviteCode?: string;
  birthDate?: string;
}

export interface WellnessEntry {
  id: string;
  userId: string;
  timestamp: string;
  isoDate: string;
  sessionType: string;
  lastSessionRPE: number;
  energy: number;
  soreness: number;
  sleepHours: number;
  sleepQuality: number;
  stress: number;
  social: number;
  feelingSick: boolean;
  injured: boolean;
  menstrualCycle: boolean;
  comments: string;
}

export type View = 'LOGIN' | 'ONBOARDING' | 'DASHBOARD' | 'FORM' | 'INSIGHTS' | 'COACH_DASHBOARD' | 'ATHLETE_DETAIL' | 'SUBMAX_TEST';

export interface SubmaxTest {
  id: string;
  userId: string;
  testType: 'treadmill_run_3mi_lap' | 'bike_hr_submax_30min_3x10';
  sport: 'run' | 'bike';
  fileName: string;
  fileStartTs: string;
  testStartTs: string;
  testEndTs: string;
  elapsedStartSec: number;
  elapsedEndSec: number;
  summary: any;
  data: any; // Stores the 'miles' or 'segments' array
  createdAt: string;
}
