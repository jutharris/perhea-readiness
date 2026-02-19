
import { supabase } from './supabaseClient';
import { User, WellnessEntry, UserRole, ReadinessStatus } from '../types';

const checkConfig = () => {
  if (!supabase) throw new Error("Supabase is not configured. Please check your environment variables.");
};

export const storageService = {
  getCurrentUser: async (retryCount = 0): Promise<User | null> => {
    checkConfig();
    
    try {
      const { data: { session }, error: sessionError } = await supabase!.auth.getSession();
      if (sessionError) {
        console.error("Session Error:", sessionError);
        return null;
      }
      if (!session?.user) return null;

      const authUser = session.user;

      // 1. Try to fetch existing profile
      let { data: profile, error: profileError } = await supabase!
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      // 2. Retry logic if profile is missing (waiting for DB trigger)
      if (!profile && retryCount < 3) {
        console.warn(`Profile missing for ${authUser.id}, retrying... (${retryCount + 1})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return storageService.getCurrentUser(retryCount + 1);
      }

      // 3. SELF-HEALING: If profile is STILL missing, create it manually.
      // This solves the "nothing entered into profiles" issue if the SQL trigger fails.
      if (!profile) {
        console.info("Self-healing: Manually creating missing profile for", authUser.id);
        const { data: newProfile, error: createError } = await supabase!
          .from('profiles')
          .insert([{
            id: authUser.id,
            email: authUser.email,
            role: 'PENDING',
            first_name: authUser.user_metadata?.first_name || authUser.user_metadata?.full_name?.split(' ')[0] || '',
            last_name: authUser.user_metadata?.last_name || authUser.user_metadata?.full_name?.split(' ').slice(1).join(' ') || ''
          }])
          .select()
          .single();

        if (createError) {
          console.error("Self-healing failed:", createError);
          return null;
        }
        profile = newProfile;
      }

      return {
        id: profile.id,
        email: profile.email,
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        role: profile.role as UserRole,
        coachId: profile.coach_id,
        inviteCode: profile.invite_code
      };
    } catch (err) {
      console.error("Critical storage error:", err);
      return null;
    }
  },

  signInWithSocial: async (provider: 'google' | 'apple') => {
    checkConfig();
    const { error } = await supabase!.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account'
        }
      }
    });
    if (error) throw error;
  },

  completeOnboarding: async (userId: string, firstName: string, lastName: string, role: UserRole): Promise<User> => {
    checkConfig();
    const updateData: any = { first_name: firstName, last_name: lastName, role: role };
    if (role === 'COACH') {
      updateData.invite_code = Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    const { data, error } = await supabase!.from('profiles').update(updateData).eq('id', userId).select().single();
    if (error) throw error;
    return {
      id: data.id,
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      role: data.role as UserRole,
      inviteCode: data.invite_code,
      coachId: data.coach_id
    };
  },

  signUp: async (email: string, password: string, firstName: string, lastName: string, role: UserRole): Promise<User> => {
    checkConfig();
    const { data, error } = await supabase!.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName, last_name: lastName, role: 'PENDING' } }
    });
    if (error) throw error;
    if (!data.user) throw new Error("Signup failed.");
    return { id: data.user.id, email: data.user.email!, firstName, lastName, role: 'PENDING' };
  },

  signIn: async (email: string, password: string): Promise<User> => {
    checkConfig();
    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const user = await storageService.getCurrentUser();
    if (!user) throw new Error("Profile synchronization failed.");
    return user;
  },

  joinSquadByCode: async (code: string, athleteId: string) => {
    checkConfig();
    const { data: coachProfile, error } = await supabase!.from('profiles').select('id').eq('invite_code', code.toUpperCase()).single();
    if (error || !coachProfile) throw new Error("Invalid Squad Code.");
    await supabase!.from('profiles').update({ coach_id: coachProfile.id }).eq('id', athleteId);
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
      id: d.id, email: d.email, firstName: d.first_name, lastName: d.last_name, role: d.role as UserRole, coachId: d.coach_id 
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
