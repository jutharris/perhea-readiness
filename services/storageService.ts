
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

    let { data: profile } = await supabase!
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    const meta = session.user.user_metadata;
    const metaRole = meta?.role;
    const fullName = meta?.full_name || meta?.name || '';
    
    // Self-healing: Ensure DB profile matches Auth Metadata (Role & Names)
    const needsFix = !profile || 
                     (metaRole && profile.role !== metaRole) || 
                     (!profile.first_name && fullName);

    if (needsFix) {
      const splitFirstName = meta?.first_name || fullName.split(' ')[0] || '';
      const splitLastName = meta?.last_name || fullName.split(' ').slice(1).join(' ') || '';

      const upsertData: any = {
        id: session.user.id,
        email: session.user.email,
        first_name: splitFirstName,
        last_name: splitLastName,
        role: metaRole || profile?.role || 'ATHLETE'
      };

      if (upsertData.role === 'COACH' && !profile?.invite_code) {
        upsertData.invite_code = Math.random().toString(36).substring(2, 8).toUpperCase();
      }

      const { data: refreshedProfile } = await supabase!
        .from('profiles')
        .upsert(upsertData, { onConflict: 'id' })
        .select()
        .single();
      
      if (refreshedProfile) profile = refreshedProfile;
    }

    if (!profile) return null;

    return {
      id: profile.id,
      email: profile.email,
      firstName: profile.first_name || '',
      lastName: profile.last_name || '',
      role: profile.role,
      coachId: profile.coach_id,
      inviteCode: profile.invite_code
    };
  },

  signInWithSocial: async (provider: 'google' | 'apple', role: UserRole) => {
    checkConfig();
    const { error } = await supabase!.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account'
        },
        data: {
          role: role
        }
      }
    });
    if (error) throw error;
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
    const user = await storageService.getCurrentUser();
    if (!user) throw new Error("Profile not found.");
    return user;
  },

  joinSquadByCode: async (code: string, athleteId: string) => {
    checkConfig();
    const { data: coachProfile, error } = await supabase!
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('invite_code', code.toUpperCase())
      .single();

    if (error || !coachProfile) throw new Error("Invalid Squad Code.");

    await supabase!
      .from('profiles')
      .update({ coach_id: coachProfile.id })
      .eq('id', athleteId);

    return coachProfile;
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
      menstrual_cycle: entryData.menstrualCycle,
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
      sleepHours: Number(d.sleep_hours), sleepQuality: d.sleep_quality, stress: d.stress, social: d.social,
      feelingSick: d.feeling_sick, injured: d.injured, menstrualCycle: d.menstrual_cycle, comments: d.comments
    }));
  },

  getAllEntries: async (): Promise<WellnessEntry[]> => {
    checkConfig();
    const { data } = await supabase!.from('wellness_entries').select('*').order('created_at', { ascending: false });
    return (data || []).map(d => ({
      id: d.id, userId: d.user_id, timestamp: new Date(d.created_at).toLocaleString(), isoDate: d.created_at,
      sessionType: d.session_type, lastSessionRPE: d.last_session_rpe, energy: d.energy, soreness: d.soreness,
      sleepHours: Number(d.sleep_hours), sleepQuality: d.sleep_quality, stress: d.stress, social: d.social,
      feelingSick: d.feeling_sick, injured: d.injured, menstrualCycle: d.menstrual_cycle, comments: d.comments
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

  saveAdjustment: async (userId: string, coachId: string, message: string) => {
    checkConfig();
    await supabase!.from('coach_adjustments').insert([{ user_id: userId, coach_id: coachId, message }]);
  },

  calculateReadiness: (entries: WellnessEntry[], entryIndex: number = 0) => {
    if (entries.length <= entryIndex) return { status: 'READY' as ReadinessStatus, score: 0, trend: 'STABLE', acwr: 1.0 };
    const latest = entries[entryIndex];
    const avg = (latest.energy + latest.soreness + latest.sleepQuality + latest.stress + latest.social) / 5;
    const score = Math.round((avg / 7) * 100);
    let status: ReadinessStatus = 'READY';
    if (score < 40 || latest.injured || latest.feelingSick || latest.menstrualCycle) status = 'RECOVERY';
    else if (score < 65) status = 'MINDFUL';
    return { status, score, trend: 'STABLE', acwr: 1.0 };
  }
};
