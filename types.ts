
export type UserRole = 'ATHLETE' | 'COACH';
export type SessionType = 'TRAINING' | 'COMPETITION' | 'TRAVEL' | 'REST';
export type ReadinessStatus = 'READY' | 'MINDFUL' | 'RECOVERY';
export type PersonalityCalibration = 'STOIC' | 'BALANCED' | 'EXPRESSIVE';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  coachId?: string;
}

export interface CoachPrinciple {
  id: string;
  coachId: string;
  instruction: string;
  timestamp: string;
}

export interface SensitivityProfile {
  resilience: 'CONSERVATIVE' | 'BALANCED' | 'ELITE';
  priorityMetric: 'SLEEP' | 'ENERGY' | 'SORENESS' | 'STRESS';
}

export interface AthleteConfig {
  userId: string;
  calibration: PersonalityCalibration;
}

export interface WellnessEntry {
  id: string;
  userId: string;
  timestamp: string; 
  isoDate: string;   
  sessionType: SessionType;
  lastSessionRPE: number;
  energy: number;    
  soreness: number;  
  sleepHours: number;
  sleepQuality: number; 
  stress: number;    
  social: number;    
  feelingSick: boolean;
  sickLast48h: boolean;
  injured: boolean;
  injuryDetail?: string;
  comments?: string;
}

export interface CoachAdjustment {
  id: string;
  userId: string;
  coachId: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

export type View = 'LOGIN' | 'DASHBOARD' | 'FORM' | 'INSIGHTS' | 'COACH_DASHBOARD' | 'ATHLETE_DETAIL' | 'MANAGE_ATHLETES';
