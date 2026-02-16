
export type UserRole = 'ATHLETE' | 'COACH';
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
  injured: boolean;
  menstrualCycle: boolean;
  comments?: string;
}

export type View = 'LOGIN' | 'DASHBOARD' | 'FORM' | 'INSIGHTS' | 'COACH_DASHBOARD' | 'ATHLETE_DETAIL';
