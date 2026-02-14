import { supabase } from './supabaseClient';
import { User, WellnessEntry, UserRole, ReadinessStatus } from '../types';

const checkConfig = () => {
  if (!supabase) throw new Error("Supabase is not configured. Please check your environment variables.");
};

export const storageService = {
  getCurrentUser: async (): Promise<User | null> => {
    checkConfig();
    const { data: { session } } = await supabase!.auth.getSession();
    if (!session) return null;

    const { data: profile } = await supabase!
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (!profile) return null;

    return {
      id: profile.id,
      email: profile.email,
      firstName: profile.first_name || '',
      lastName: profile.last_name || '',
      role: profile.role,
      coachId: profile.coach_id
    };
  },

  signUp: async (email: string, password: string, firstName: string, lastName: string, role: UserRole): Promise<User> => {
    checkConfig();
    const { data, error } = await supabase!.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          role: role
        }
      }
    });

    if (error) throw error;
    if (!data.user) throw new Error("Signup failed.");

    return {
      id: data.user.id,
      email: data.user.email!,
      firstName,
      lastName,
      role
    };
  },

  signIn: async (email: string, password: string): Promise<User> => {
    checkConfig();
    const { data, error } = await supabase!.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const { data: profile, error: profileError } = await supabase!
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) throw new Error("Profile not found.");

    return {
      id: profile.id,
      email: profile.email,
      firstName: profile.first_name,
      lastName: profile.last_name,
      role: profile.role,
      coachId: profile.coach_id
    };
  },

  logout: async () => {
    checkConfig();
    await supabase!.auth.signOut();
  },

  saveEntry: async (entryData: any) => {
    checkConfig();
    const { error } = await supabase!.from('wellness_entries').insert([{
      user_id: entryData.userId,
      session_type: entryData.sessionType,
      last_session_rpe: entryData.lastSessionRPE,
      energy: entryData.energy,
      soreness: entryData.soreness,
      sleep_hours: entryData.sleepHours,
      sleep_quality: entryData.sleepQuality,
      stress: entryData.stress,
      social: entryData.social,
      feeling_sick: entryData.feelingSick,
      injured: entryData.injured,
      comments: entryData.comments
    }]);
    if (error) throw error;
  },

  getEntriesForUser: async (userId: string): Promise<WellnessEntry[]> => {
    checkConfig();
    const { data } = await supabase!.from('wellness_entries').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    return (data || []).map(d => ({
      id: d.id, userId: d.user_id, timestamp: new Date(d.created_at).toLocaleString(), isoDate: d.created_at,
      sessionType: d.session_type, lastSessionRPE: d.last_session_rpe, energy: d.energy, soreness: d.soreness,
      sleepHours: d.sleep_hours, sleepQuality: d.sleep_quality, stress: d.stress, social: d.social,
      feelingSick: d.feeling_sick, injured: d.injured, comments: d.comments
    }));
  },

  getAllEntries: async (): Promise<WellnessEntry[]> => {
    checkConfig();
    const { data } = await supabase!.from('wellness_entries').select('*').order('created_at', { ascending: false });
    return (data || []).map(d => ({
      id: d.id, userId: d.user_id, timestamp: new Date(d.created_at).toLocaleString(), isoDate: d.created_at,
      sessionType: d.session_type, lastSessionRPE: d.last_session_rpe, energy: d.energy, soreness: d.soreness,
      sleepHours: d.sleep_hours, sleepQuality: d.sleep_quality, stress: d.stress, social: d.social,
      feelingSick: d.feeling_sick, injured: d.injured, comments: d.comments
    }));
  },

  getAllUsers: async (): Promise<User[]> => {
    checkConfig();
    const { data } = await supabase!.from('profiles').select('*');
    return (data || []).map(d => ({ 
      id: d.id, 
      email: d.email, 
      firstName: d.first_name, 
      lastName: d.last_name, 
      role: d.role, 
      coachId: d.coach_id 
    }));
  },

  getCoachedAthletes: async (coachId: string): Promise<User[]> => {
    checkConfig();
    const { data } = await supabase!.from('profiles').select('*').eq('role', 'ATHLETE').eq('coach_id', coachId);
    return (data || []).map(d => ({ 
      id: d.id, 
      email: d.email, 
      firstName: d.first_name, 
      lastName: d.last_name, 
      role: d.role, 
      coachId: d.coach_id 
    }));
  },

  assignAthleteToCoach: async (athleteId: string, coachId: string) => {
    checkConfig();
    await supabase!.from('profiles').update({ coach_id: coachId }).eq('id', athleteId);
  },

  removeAthleteFromCoach: async (athleteId: string) => {
    checkConfig();
    await supabase!.from('profiles').update({ coach_id: null }).eq('id', athleteId);
  },

  saveAdjustment: async (userId: string, coachId: string, message: string) => {
    checkConfig();
    await supabase!.from('coach_adjustments').insert([{ user_id: userId, coach_id: coachId, message }]);
  },

  calculateReadiness: (entries: WellnessEntry[]) => {
    if (entries.length === 0) return { status: 'READY' as ReadinessStatus, score: 0, trend: 'STABLE', acwr: 1.0 };
    const latest = entries[0];
    const avg = (latest.energy + latest.soreness + latest.sleepQuality + (8 - latest.stress) + latest.social) / 5;
    const score = Math.round((avg / 7) * 100);
    let status: ReadinessStatus = 'READY';
    if (score < 40 || latest.injured || latest.feelingSick) status = 'RECOVERY';
    else if (score < 65) status = 'MINDFUL';
    return { status, score, trend: 'STABLE', acwr: 1.0 };
  }
};
