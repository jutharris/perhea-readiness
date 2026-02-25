import { supabase } from './supabaseClient';
import { User, WellnessEntry, UserRole, ReadinessStatus, SubmaxTest } from '../types';

const checkConfig = () => {
  if (!supabase) throw new Error("Supabase is not configured. Please check your environment variables.");
};

export const storageService = {
  getProfile: async (userId: string): Promise<User | null> => {
    checkConfig();
    try {
      const { data, error } = await supabase!
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        email: data.email,
        firstName: data.first_name || '',
        lastName: data.last_name || '',
        role: data.role as UserRole,
        coachId: data.coach_id,
        inviteCode: data.invite_code,
        birthDate: data.birth_date,
        trainingFocus: data.training_focus
      };
    } catch (err) {
      return null;
    }
  },

  initializeProfile: async (userId: string, email: string, firstName: string, lastName: string, role: UserRole, birthDate?: string): Promise<User> => {
    checkConfig();
    
    const insertData: any = {
      id: userId,
      email: email,
      first_name: firstName,
      last_name: lastName,
      role: role,
      birth_date: birthDate
    };

    if (role === 'COACH') {
      insertData.invite_code = Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    const { data, error } = await supabase!
      .from('profiles')
      .upsert(insertData)
      .select()
      .single();

    if (error) throw error;
    
    return {
      id: data.id,
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      role: data.role as UserRole,
      inviteCode: data.invite_code,
      coachId: data.coach_id,
      birthDate: data.birth_date,
      trainingFocus: data.training_focus
    };
  },

  updateTrainingFocus: async (userId: string, focus: string) => {
    checkConfig();
    const { error } = await supabase!
      .from('profiles')
      .update({ training_focus: focus })
      .eq('id', userId);
    if (error) throw error;
  },

  signInWithSocial: async (provider: 'google' | 'apple') => {
    checkConfig();
    const { error } = await supabase!.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
        queryParams: { access_type: 'offline', prompt: 'select_account' }
      }
    });
    if (error) throw error;
  },

  signUp: async (email: string, password: string, firstName: string, lastName: string) => {
    checkConfig();
    const { data, error } = await supabase!.auth.signUp({
      email,
      password,
      options: { 
        data: { first_name: firstName, last_name: lastName } 
      }
    });
    if (error) throw error;
    return data;
  },

  signIn: async (email: string, password: string) => {
    checkConfig();
    const { data, error } = await supabase!.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
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
      id: d.id, email: d.email, firstName: d.first_name, lastName: d.last_name, role: d.role as UserRole, coachId: d.coach_id, birthDate: d.birth_date, trainingFocus: d.training_focus 
    }));
  },

  saveAdjustment: async (userId: string, coachId: string, message: string) => {
    checkConfig();
    await supabase!.from('coach_adjustments').insert([{ user_id: userId, coach_id: coachId, message }]);
  },

  saveSubmaxTest: async (testData: Partial<SubmaxTest>) => {
    checkConfig();
    const { error } = await supabase!.from('submax_tests').insert([{
      user_id: testData.userId,
      test_type: testData.testType,
      sport: testData.sport,
      file_name: testData.fileName,
      file_start_ts: testData.fileStartTs,
      test_start_ts: testData.testStartTs,
      test_end_ts: testData.testEndTs,
      elapsed_start_sec: testData.elapsedStartSec,
      elapsed_end_sec: testData.elapsedEndSec,
      summary: testData.summary,
      data: testData.data
    }]);
    if (error) throw error;
  },

  getSubmaxTestsForUser: async (userId: string): Promise<SubmaxTest[]> => {
    checkConfig();
    const { data } = await supabase!
      .from('submax_tests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    return (data || []).map(d => ({
      id: d.id,
      userId: d.user_id,
      testType: d.test_type,
      sport: d.sport,
      fileName: d.file_name,
      fileStartTs: d.file_start_ts,
      testStartTs: d.test_start_ts,
      testEndTs: d.test_end_ts,
      elapsedStartSec: Number(d.elapsed_start_sec),
      elapsedEndSec: Number(d.elapsed_end_sec),
      summary: d.summary,
      data: d.data,
      createdAt: d.created_at
    }));
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
