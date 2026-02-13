
import { supabase } from './supabaseClient';
import { User, WellnessEntry, UserRole, CoachAdjustment, SessionType, ReadinessStatus, SensitivityProfile, CoachPrinciple, AthleteConfig, PersonalityCalibration } from '../types';

const SESSION_KEY = 'athlete_current_session';

export const storageService = {
  getCurrentUser: (): User | null => {
    const session = localStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
  },

  login: async (email: string, name: string, role: UserRole): Promise<User> => {
    const { data: existingUser } = await supabase.from('profiles').select('*').eq('email', email).maybeSingle();
    let user: User;
    if (!existingUser) {
      const { data: newUser, error } = await supabase.from('profiles').insert([{ email, full_name: name, role }]).select().single();
      if (error) throw error;
      user = { id: newUser.id, email: newUser.email, name: newUser.full_name, role: newUser.role, coachId: newUser.coach_id };
    } else {
      user = { id: existingUser.id, email: existingUser.email, name: existingUser.full_name, role: existingUser.role, coachId: existingUser.coach_id };
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  },

  logout: () => localStorage.removeItem(SESSION_KEY),
  
  getAllUsers: async (): Promise<User[]> => {
    const { data } = await supabase.from('profiles').select('*');
    return (data || []).map(d => ({ id: d.id, email: d.email, name: d.full_name, role: d.role, coachId: d.coach_id }));
  },

  getCoachedAthletes: async (coachId: string): Promise<User[]> => {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'ATHLETE').eq('coach_id', coachId);
    return (data || []).map(d => ({ id: d.id, email: d.email, name: d.full_name, role: d.role, coachId: d.coach_id }));
  },

  assignAthleteToCoach: async (athleteId: string, coachId: string) => {
    await supabase.from('profiles').update({ coach_id: coachId }).eq('id', athleteId);
  },

  removeAthleteFromCoach: async (athleteId: string) => {
    await supabase.from('profiles').update({ coach_id: null }).eq('id', athleteId);
  },

  getAthleteConfig: async (userId: string): Promise<AthleteConfig> => {
    const { data } = await supabase.from('athlete_configs').select('*').eq('user_id', userId).maybeSingle();
    return data ? { userId: data.user_id, calibration: data.calibration } : { userId, calibration: 'BALANCED' };
  },

  getSensitivity: async (coachId: string): Promise<SensitivityProfile> => {
    const { data } = await supabase.from('sensitivity_profiles').select('*').eq('coach_id', coachId).maybeSingle();
    return data ? { resilience: data.resilience, priorityMetric: data.priority_metric } : { resilience: 'BALANCED', priorityMetric: 'ENERGY' };
  },

  saveSensitivity: async (coachId: string, profile: SensitivityProfile) => {
    await supabase.from('sensitivity_profiles').upsert({ coach_id: coachId, resilience: profile.resilience, priority_metric: profile.priorityMetric });
  },

  getPrinciples: async (coachId: string): Promise<CoachPrinciple[]> => {
    const { data } = await supabase.from('coach_principles').select('*').eq('coach_id', coachId);
    return (data || []).map(d => ({ id: d.id, coachId: d.coach_id, instruction: d.instruction, timestamp: d.created_at }));
  },

  calculateReadiness: (entries: WellnessEntry[], athleteConfig: AthleteConfig, sensitivity: SensitivityProfile) => {
    if (entries.length === 0) return { status: 'READY' as ReadinessStatus, score: 0, trend: 'STABLE', acwr: 1.0 };
    const latest = entries[0];
    const wellnessScore = storageService.calculateWellnessScore(latest);
    const acwr = storageService.calculateACWRLocal(entries);
    if (latest.injured || latest.feelingSick) return { status: 'RECOVERY' as ReadinessStatus, score: wellnessScore, trend: 'STABLE', acwr };
    
    let recoveryThreshold = 45;
    let mindfulThreshold = 65;
    if (athleteConfig.calibration === 'STOIC') { recoveryThreshold = 55; mindfulThreshold = 75; }
    else if (athleteConfig.calibration === 'EXPRESSIVE') { recoveryThreshold = 35; mindfulThreshold = 55; }

    let status: ReadinessStatus = 'READY';
    if (wellnessScore < recoveryThreshold) status = 'RECOVERY';
    else if (wellnessScore < mindfulThreshold || acwr > 1.3) status = 'MINDFUL';
    
    return { status, score: wellnessScore, trend: 'STABLE', acwr };
  },

  calculateWellnessScore: (entry: WellnessEntry): number => {
    const sleepPoints = (entry.sleepHours >= 8 ? 7 : entry.sleepHours >= 7 ? 5 : 2);
    const total = (entry.energy || 0) + (entry.soreness || 0) + (entry.sleepQuality || 0) + (8 - (entry.stress || 0)) + (entry.social || 0) + sleepPoints;
    return Math.round((total / 42) * 100);
  },

  calculateACWRLocal: (entries: WellnessEntry[]): number => {
    if (entries.length < 7) return 1.0;
    const acute = entries.slice(0, 7).reduce((acc, e) => acc + e.lastSessionRPE, 0) / 7;
    const chronic = entries.slice(0, 28).reduce((acc, e) => acc + e.lastSessionRPE, 0) / Math.min(entries.length, 28);
    return chronic === 0 ? 1.0 : acute / chronic;
  },

  saveEntry: async (entryData: any) => {
    await supabase.from('wellness_entries').insert([{
      user_id: entryData.userId, session_type: entryData.sessionType, last_session_rpe: entryData.lastSessionRPE,
      energy: entryData.energy, soreness: entryData.soreness, sleep_hours: entryData.sleepHours,
      sleep_quality: entryData.sleepQuality, stress: entryData.stress, social: entryData.social,
      feeling_sick: entryData.feelingSick, injured: entryData.injured, comments: entryData.comments
    }]);
  },

  getEntriesForUser: async (userId: string): Promise<WellnessEntry[]> => {
    const { data } = await supabase.from('wellness_entries').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    return (data || []).map(d => ({
      id: d.id, userId: d.user_id, timestamp: new Date(d.created_at).toLocaleString(), isoDate: d.created_at,
      sessionType: d.session_type, lastSessionRPE: d.last_session_rpe, energy: d.energy, soreness: d.soreness,
      sleepHours: d.sleep_hours, sleepQuality: d.sleep_quality, stress: d.stress, social: d.social,
      feelingSick: d.feeling_sick, injured: d.injured, comments: d.comments, sickLast48h: false
    }));
  },

  getAllEntries: async (): Promise<WellnessEntry[]> => {
    const { data } = await supabase.from('wellness_entries').select('*').order('created_at', { ascending: false });
    return (data || []).map(d => ({
      id: d.id, userId: d.user_id, timestamp: new Date(d.created_at).toLocaleString(), isoDate: d.created_at,
      sessionType: d.session_type, lastSessionRPE: d.last_session_rpe, energy: d.energy, soreness: d.soreness,
      sleepHours: d.sleep_hours, sleepQuality: d.sleep_quality, stress: d.stress, social: d.social,
      feelingSick: d.feeling_sick, injured: d.injured, comments: d.comments, sickLast48h: false
    }));
  },

  saveAdjustment: async (userId: string, coachId: string, message: string) => {
    await supabase.from('coach_adjustments').insert([{ user_id: userId, coach_id: coachId, message }]);
  }
};
