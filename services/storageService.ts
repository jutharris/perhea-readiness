
import { supabase } from './supabaseClient';
import { User, WellnessEntry, UserRole, Regime, SubmaxTest, SystemCalibration, PersonalityCalibration, TrainingFocus, Message, IntelligencePacket } from '../types';

const DEFAULT_CALIBRATION: SystemCalibration = {
  volatilityThreshold: 1.2,
  decouplingThreshold: 0.5,
  identityWeight: 0.3,
  systemicStressFloor: 60
};

const checkConfig = () => {
  if (!supabase) throw new Error("Supabase is not configured. Please check your environment variables.");
};

export const storageService = {
  // Purely fetches the profile from DB
  getProfile: async (userId: string): Promise<User | null> => {
    checkConfig();
    try {
      const { data: initialData, error } = await supabase!
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      let profileData = initialData;

      // Account Healing: If no profile by ID, check by email (in case of re-signup)
      if (error || !initialData) {
        const { data: { user: authUser } } = await supabase!.auth.getUser();
        if (authUser?.email) {
          const { data: emailProfile } = await supabase!
            .from('profiles')
            .select('*')
            .eq('email', authUser.email)
            .single();
          
          if (emailProfile) {
            // Update the old profile with the new ID
            await supabase!.from('profiles').update({ id: userId }).eq('email', authUser.email);
            profileData = { ...emailProfile, id: userId };
          } else {
            return null;
          }
        } else {
          return null;
        }
      }

      if (!profileData) return null;

      return {
        id: profileData.id,
        email: profileData.email,
        firstName: profileData.first_name || '',
        lastName: profileData.last_name || '',
        role: profileData.role as UserRole,
        coachId: profileData.coach_id,
        inviteCode: profileData.invite_code,
        birthDate: profileData.birth_date,
        trainingFocus: (profileData.training_focus || profileData.focus) as TrainingFocus,
        personalityCalibration: (profileData.personality_calibration || profileData.personality || profileData.reporting_style) as PersonalityCalibration,
        isPremium: !!profileData.is_premium,
        isFrozen: !!profileData.is_frozen,
        queuedAlert: profileData.queued_alert,
        lastActiveAt: profileData.last_active_at,
        hasWearable: !!profileData.has_wearable,
        timezone: profileData.timezone || 'America/New_York',
        intelligencePacket: profileData.intelligence_packet
      };
    } catch {
      return null;
    }
  },

  // First-time record creation in public.profiles
  initializeProfile: async (userId: string, email: string, firstName: string, lastName: string, role: UserRole, birthDate?: string, hasWearable: boolean = true, timezone: string = 'America/New_York'): Promise<User> => {
    checkConfig();
    
    const insertData: any = {
      id: userId,
      email: email,
      first_name: firstName,
      last_name: lastName,
      role: role,
      birth_date: birthDate || null,
      has_wearable: hasWearable,
      timezone: timezone
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
      trainingFocus: data.training_focus,
      personalityCalibration: data.personality_calibration as PersonalityCalibration,
      isPremium: !!data.is_premium,
      isFrozen: !!data.is_frozen,
      queuedAlert: data.queued_alert,
      lastActiveAt: data.last_active_at,
      hasWearable: !!data.has_wearable,
      timezone: data.timezone || 'America/New_York'
    };
  },

  updateTrainingFocus: async (userId: string, focus: string) => {
    checkConfig();
    try {
      const { error } = await supabase!
        .from('profiles')
        .update({ training_focus: focus })
        .eq('id', userId);
      if (error) throw error;
    } catch (err: any) {
      if (err.message?.includes('training_focus')) {
        const { error } = await supabase!
          .from('profiles')
          .update({ focus: focus })
          .eq('id', userId);
        if (error) throw error;
      } else {
        throw err;
      }
    }
  },

  updatePersonalityCalibration: async (userId: string, calibration: PersonalityCalibration) => {
    checkConfig();
    // Try personality_calibration first, then personality as fallback
    try {
      const { error } = await supabase!
        .from('profiles')
        .update({ personality_calibration: calibration })
        .eq('id', userId);
      if (error) throw error;
    } catch (err: any) {
      if (err.message?.includes('personality_calibration')) {
        const { error } = await supabase!
          .from('profiles')
          .update({ personality: calibration })
          .eq('id', userId);
        if (error) throw error;
      } else {
        throw err;
      }
    }
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
      planned_mission_type: entryData.plannedMissionType,
      wearable_score: entryData.wearableScore,
      divergence_intensity: entryData.divergenceIntensity,
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

    // Update last_active_at for the user
    await supabase!.from('profiles').update({ last_active_at: new Date().toISOString() }).eq('id', entryData.userId);
  },

  getEntriesForUser: async (userId: string): Promise<WellnessEntry[]> => {
    checkConfig();
    const { data } = await supabase!.from('wellness_entries').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    return (data || []).map(d => ({
      id: d.id, userId: d.user_id, timestamp: new Date(d.created_at).toLocaleString(), isoDate: d.created_at,
      sessionType: d.session_type, 
      plannedMissionType: d.planned_mission_type,
      wearableScore: d.wearable_score,
      divergenceIntensity: d.divergence_intensity,
      lastSessionRPE: d.last_session_rpe, energy: d.energy, soreness: d.soreness,
      sleepHours: Number(d.sleep_hours), sleepQuality: d.sleep_quality, stress: d.stress, social: d.social,
      feelingSick: d.feeling_sick, injured: d.injured, menstrualCycle: d.menstrual_cycle, comments: d.comments,
      readByCoach: !!d.read_by_coach
    }));
  },

  getAllEntries: async (): Promise<WellnessEntry[]> => {
    checkConfig();
    const { data } = await supabase!.from('wellness_entries').select('*').order('created_at', { ascending: false });
    return (data || []).map(d => ({
      id: d.id, userId: d.user_id, timestamp: new Date(d.created_at).toLocaleString(), isoDate: d.created_at,
      sessionType: d.session_type, 
      plannedMissionType: d.planned_mission_type,
      wearableScore: d.wearable_score,
      divergenceIntensity: d.divergence_intensity,
      lastSessionRPE: d.last_session_rpe, energy: d.energy, soreness: d.soreness,
      sleepHours: Number(d.sleep_hours), sleepQuality: d.sleep_quality, stress: d.stress, social: d.social,
      feelingSick: d.feeling_sick, injured: d.injured, menstrualCycle: d.menstrual_cycle, comments: d.comments,
      readByCoach: !!d.read_by_coach
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
      role: d.role as UserRole, 
      coachId: d.coach_id, 
      birthDate: d.birth_date, 
      trainingFocus: (d.training_focus || d.focus) as TrainingFocus,
      personalityCalibration: (d.personality_calibration || d.personality || d.reporting_style) as PersonalityCalibration,
      isPremium: !!d.is_premium,
      isFrozen: !!d.is_frozen,
      queuedAlert: d.queued_alert,
      lastActiveAt: d.last_active_at
    }));
  },

  // Admin Methods
  getAllUsers: async (): Promise<User[]> => {
    checkConfig();
    const { data } = await supabase!.from('profiles').select('*').order('created_at', { ascending: false });
    return (data || []).map(d => ({
      id: d.id,
      email: d.email,
      firstName: d.first_name,
      lastName: d.last_name,
      role: d.role as UserRole,
      coachId: d.coach_id,
      birthDate: d.birth_date,
      trainingFocus: (d.training_focus || d.focus) as TrainingFocus,
      personalityCalibration: (d.personality_calibration || d.personality || d.reporting_style) as PersonalityCalibration,
      isPremium: !!d.is_premium,
      isFrozen: !!d.is_frozen,
      queuedAlert: d.queued_alert,
      lastActiveAt: d.last_active_at,
      createdAt: d.created_at
    }));
  },

  updateUserStatus: async (userId: string, updates: Partial<User>) => {
    checkConfig();
    const dbUpdates: any = {};
    if (updates.isPremium !== undefined) dbUpdates.is_premium = updates.isPremium;
    if (updates.isFrozen !== undefined) dbUpdates.is_frozen = updates.isFrozen;
    if (updates.queuedAlert !== undefined) dbUpdates.queued_alert = updates.queuedAlert;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.hasWearable !== undefined) dbUpdates.has_wearable = updates.hasWearable;
    if (updates.timezone !== undefined) dbUpdates.timezone = updates.timezone;

    if (updates.intelligencePacket !== undefined) {
      dbUpdates.intelligence_packet = updates.intelligencePacket;
    }

    const { error } = await supabase!.from('profiles').update(dbUpdates).eq('id', userId);
    if (error) throw error;
  },

  getGlobalSoulDocument: async (): Promise<string> => {
    checkConfig();
    const { data, error } = await supabase!
      .from('global_config')
      .select('soul_document')
      .eq('id', 'MASTER_SOUL')
      .single();
    
    if (error) {
      console.warn("Could not fetch Soul Document, using fallback.");
      return "You are an AI Assistant Coach. Be supportive and concise.";
    }
    return data.soul_document;
  },

  updateGlobalSoulDocument: async (newDoc: string) => {
    checkConfig();
    const { error } = await supabase!
      .from('global_config')
      .upsert({ id: 'MASTER_SOUL', soul_document: newDoc, updated_at: new Date().toISOString() });
    if (error) throw error;
  },

  getSystemCalibration: async (): Promise<SystemCalibration> => {
    checkConfig();
    const { data, error } = await supabase!
      .from('global_config')
      .select('system_calibration')
      .eq('id', 'SYSTEM_CALIBRATION')
      .single();
    
    if (error || !data?.system_calibration) {
      return DEFAULT_CALIBRATION;
    }
    return data.system_calibration;
  },

  updateSystemCalibration: async (calibration: SystemCalibration) => {
    checkConfig();
    const { error } = await supabase!
      .from('global_config')
      .upsert({ 
        id: 'SYSTEM_CALIBRATION', 
        system_calibration: calibration, 
        updated_at: new Date().toISOString() 
      });
    if (error) throw error;
  },

  getGlobalMetrics: async () => {
    checkConfig();
    try {
      const allUsers = await storageService.getAllUsers();
      const athletes = allUsers.filter(u => u.role === 'ATHLETE');
      const entries = await storageService.getAllEntries();

      const now = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);

      const athleteIds = new Set(athletes.map(a => a.id));

      // 1. Day-7 Return Rate
      const activeInLast7 = athletes.filter(u => u.lastActiveAt && new Date(u.lastActiveAt) >= sevenDaysAgo);
      const day7ReturnRate = athletes.length > 0 ? (activeInLast7.length / athletes.length) * 100 : 0;

      // 2. Friction Index (Form completion vs App open)
      const entriesInLast7 = entries.filter(e => {
        return athleteIds.has(e.userId) && new Date(e.isoDate) >= sevenDaysAgo;
      });
      const frictionIndex = activeInLast7.length > 0 ? (entriesInLast7.length / (activeInLast7.length * 7)) * 100 : 0;

    // 3. AI Insight ROI
    // Placeholder logic: % of entries that have comments or interactions
    const aiInsightROI = 45; // Placeholder

    // 4. Submission Consistency
    const submissionConsistency = 85; // Placeholder

    // 5. Growth & Vitality Metrics
    const totalUsers = allUsers.length;
    
    const getNewUsersCount = (days: number) => {
      const cutoff = new Date();
      cutoff.setDate(now.getDate() - days);
      return allUsers.filter(u => u.createdAt && new Date(u.createdAt) >= cutoff).length;
    };

    const newUsers = {
      day: getNewUsersCount(1),
      week: getNewUsersCount(7),
      month: getNewUsersCount(30),
      year: getNewUsersCount(365)
    };

    const users30Days = allUsers.filter(u => {
      if (!u.createdAt) return false;
      const created = new Date(u.createdAt);
      const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays >= 30;
    }).length;

    const inactiveUsers7Days = athletes.filter(u => {
      if (!u.lastActiveAt) return true;
      return new Date(u.lastActiveAt) < sevenDaysAgo;
    }).length;

    // Stickiness Ratio (DAU/MAU)
    // Placeholder: DAU = active in last 1 day, MAU = active in last 30 days
    const oneDayAgo = new Date();
    oneDayAgo.setDate(now.getDate() - 1);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    
    const dau = athletes.filter(u => u.lastActiveAt && new Date(u.lastActiveAt) >= oneDayAgo).length;
    const mau = athletes.filter(u => u.lastActiveAt && new Date(u.lastActiveAt) >= thirtyDaysAgo).length;
    const stickinessRatio = mau > 0 ? (dau / mau) * 100 : 0;

    return {
      day7ReturnRate,
      frictionIndex,
      aiInsightROI,
      submissionConsistency,
      totalUsers,
      newUsers,
      users30Days,
      inactiveUsers7Days,
      stickinessRatio,
      viralCoefficient: 1.2, // Placeholder
      timeToInsight: 4.2 // Placeholder (seconds)
    };
  } catch (err) {
    console.error("Error calculating global metrics:", err);
    throw err;
  }
},

  getAdminNerveCenter: async () => {
    const response = await fetch('/api/admin/nerve-center');
    if (!response.ok) {
      const text = await response.text();
      let errorMsg = 'Failed to fetch Nerve Center data';
      try {
        const error = JSON.parse(text);
        errorMsg = error.error || errorMsg;
      } catch {
        errorMsg = `Server error (${response.status}): ${text.substring(0, 100)}`;
      }
      throw new Error(errorMsg);
    }
    return response.json();
  },

  calculateUserHabitScore: (entries: WellnessEntry[]) => {
    if (entries.length === 0) return 0;
    
    const now = new Date();
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(now.getDate() - 14);
    
    const recentEntries = entries.filter(e => new Date(e.isoDate) >= fourteenDaysAgo);
    
    // 1. Frequency (0-5 points)
    // 14 entries in 14 days = 5 points
    const frequencyScore = Math.min(5, (recentEntries.length / 14) * 5);
    
    // 2. Recency (0-3 points)
    const lastEntry = entries[0];
    const daysSinceLast = (now.getTime() - new Date(lastEntry.isoDate).getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 3 - (daysSinceLast * 0.5));
    
    // 3. Consistency (0-2 points)
    // Check if they log around the same time
    let consistencyScore = 0;
    if (recentEntries.length >= 3) {
      const hours = recentEntries.map(e => new Date(e.isoDate).getHours());
      const avgHour = hours.reduce((a, b) => a + b, 0) / hours.length;
      const variance = hours.reduce((a, b) => a + Math.pow(b - avgHour, 2), 0) / hours.length;
      // Lower variance = higher score. Variance < 2 hours is very consistent.
      consistencyScore = Math.max(0, 2 - (variance / 4));
    }

    return parseFloat((frequencyScore + recencyScore + consistencyScore).toFixed(1));
  },

  calculateUserDivergence: (entries: WellnessEntry[], calibration: PersonalityCalibration = 'BALANCED', systemConfig?: SystemCalibration) => {
    if (entries.length < 7) return 0;
    
    const latest = entries[0];
    const stats = storageService.calculateMetricStats(entries, 28, calibration, systemConfig);
    
    // Divergence is the average Z-score of all readiness metrics
    // We want to see how far today is from their 28-day normal
    const readinessMetrics = ['sleepQuality', 'energy', 'stress', 'soreness', 'social'];
    const zScores = stats
      .filter(s => readinessMetrics.includes(s.key as string))
      .map(s => {
        const val = latest[s.key as keyof WellnessEntry] as number;
        if (s.stdDev === 0) return 0;
        return (val - s.mean) / s.stdDev;
      });
    
    if (zScores.length === 0) return 0;
    const avgZ = zScores.reduce((a, b) => a + b, 0) / zScores.length;
    
    // Return as a percentage-like drift (e.g., +2.4 or -1.5)
    return parseFloat(avgZ.toFixed(1));
  },

  saveAdjustment: async (userId: string, coachId: string, message: string) => {
    checkConfig();
    await supabase!.from('coach_adjustments').insert([{ user_id: userId, coach_id: coachId, message }]);
  },

  sendMessage: async (senderId: string, receiverId: string, text: string) => {
    checkConfig();
    const { error } = await supabase!.from('messages').insert([{
      sender_id: senderId,
      receiver_id: receiverId,
      text,
      read: false
    }]);
    if (error) throw error;
  },

  getMessages: async (userId: string): Promise<Message[]> => {
    checkConfig();
    const { data } = await supabase!
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: true });
    
    return (data || []).map(d => ({
      id: d.id,
      senderId: d.sender_id,
      receiverId: d.receiver_id,
      text: d.text,
      timestamp: d.created_at,
      read: !!d.read
    }));
  },

  markMessagesAsRead: async (userId: string, senderId: string) => {
    checkConfig();
    await supabase!
      .from('messages')
      .update({ read: true })
      .eq('receiver_id', userId)
      .eq('sender_id', senderId);
  },

  markEntryAsRead: async (entryId: string) => {
    checkConfig();
    await supabase!
      .from('wellness_entries')
      .update({ read_by_coach: true })
      .eq('id', entryId);
  },

  markEntriesAsRead: async (entryIds: string[]) => {
    checkConfig();
    if (entryIds.length === 0) return;
    await supabase!
      .from('wellness_entries')
      .update({ read_by_coach: true })
      .in('id', entryIds);
  },

  markAthleteAsRead: async (coachId: string, athleteId: string) => {
    checkConfig();
    // Simplified: Just set everything to true for this athlete/coach pair.
    // Setting true to true is a no-op in the DB but ensures NULLs/False are caught.
    const [msgRes, entryRes] = await Promise.all([
      supabase!
        .from('messages')
        .update({ read: true })
        .eq('receiver_id', coachId)
        .eq('sender_id', athleteId),
      supabase!
        .from('wellness_entries')
        .update({ read_by_coach: true })
        .eq('user_id', athleteId)
    ]);
    if (msgRes.error) throw msgRes.error;
    if (entryRes.error) throw entryRes.error;
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
      data: testData.data,
      tags: testData.tags
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
      tags: d.tags,
      createdAt: d.created_at
    }));
  },

  getTrends: (entries: WellnessEntry[], days: number) => {
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(now.getDate() - days);
    
    const recent = entries.filter(e => new Date(e.isoDate) >= cutoff);
    if (recent.length === 0) return null;

    const getAvg = (arr: WellnessEntry[], key: keyof WellnessEntry) => {
      const vals = arr.map(e => e[key]).filter(v => typeof v === 'number') as number[];
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    };

    return {
      rpe: getAvg(recent, 'lastSessionRPE'),
      stress: getAvg(recent, 'stress'),
      sleep: getAvg(recent, 'sleepQuality'),
      energy: getAvg(recent, 'energy'),
      soreness: getAvg(recent, 'soreness'),
      social: getAvg(recent, 'social'),
      sleepHours: getAvg(recent, 'sleepHours')
    };
  },

  getAverages: (entries: WellnessEntry[], days: number) => {
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(now.getDate() - days);
    
    const recent = entries.filter(e => new Date(e.isoDate) >= cutoff);
    if (recent.length === 0) return null;

    const getAvg = (arr: WellnessEntry[], key: keyof WellnessEntry) => {
      const vals = arr.map(e => e[key]).filter(v => typeof v === 'number') as number[];
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    };

    return {
      rpe: getAvg(recent, 'lastSessionRPE'),
      stress: getAvg(recent, 'stress'),
      sleep: getAvg(recent, 'sleepQuality'),
      energy: getAvg(recent, 'energy'),
      soreness: getAvg(recent, 'soreness'),
      social: getAvg(recent, 'social'),
      sleepHours: getAvg(recent, 'sleepHours')
    };
  },

  getLookbackDays: (entryCount: number) => {
    if (entryCount <= 7) return entryCount;
    if (entryCount <= 15) return 7;
    if (entryCount <= 29) return 14;
    if (entryCount <= 51) return 28;
    return 50;
  },

  calculateRegime: (entries: WellnessEntry[], calibration: PersonalityCalibration = 'BALANCED', systemConfig: SystemCalibration = DEFAULT_CALIBRATION) => {
    const entryCount = entries.length;
    if (entryCount === 0) return { status: 'CALIBRATING' as Regime, reason: 'Building Baseline' };
    
    // Phase 1: Days 1-7 (Building Baseline)
    if (entryCount <= 7) {
      return { status: 'CALIBRATING' as Regime, reason: 'Building Baseline' };
    }

    const latest = entries[0];
    const lookbackDays = storageService.getLookbackDays(entryCount);
    const stats = storageService.calculateMetricStats(entries, lookbackDays, calibration, systemConfig);
    const correlations = storageService.calculateCorrelations(entries, lookbackDays, systemConfig);
    
    const avgWellness = stats.reduce((acc, s) => acc + s.avg, 0) / stats.length;
    const highVolatility = stats.some(s => s.status === 'VOLATILE');
    const moderateVolatility = stats.some(s => s.status === 'MODERATE');
    const negativeTrends = correlations && correlations.length > 0;

    const isTurbulent = latest.injured || latest.feelingSick || highVolatility || avgWellness < systemConfig.systemicStressFloor || negativeTrends || moderateVolatility;

    // Phase 2: Days 8-14 (Binary Phase: ADAPT or RESTORATION)
    if (entryCount <= 14) {
      if (isTurbulent) {
        return { status: 'RESTORATION' as Regime, reason: 'System Turbulence Detected' };
      }
      return { status: 'ADAPT' as Regime, reason: 'Stable Adaptation' };
    }

    // Phase 3: Day 15+ (Full System Access)
    if (latest.injured || latest.feelingSick || highVolatility) {
      return { 
        status: 'CAUTION' as Regime, 
        reason: latest.injured ? 'Injury Detected' : latest.feelingSick ? 'Illness Detected' : 'High System Turbulence' 
      };
    }

    if (avgWellness < systemConfig.systemicStressFloor || negativeTrends || moderateVolatility) {
      return { 
        status: 'RESTORATION' as Regime, 
        reason: negativeTrends ? 'Negative Trend Detected' : 'Recovery Deficit' 
      };
    }

    if (avgWellness > 80 && !moderateVolatility && !negativeTrends) {
      return { 
        status: 'BUILD' as Regime, 
        reason: 'Optimal Resilience' 
      };
    }

    return { 
      status: 'ADAPT' as Regime, 
      reason: 'Stable Adaptation' 
    };
  },

  calculateCorrelations: (entries: WellnessEntry[], lookbackDays: number = 21, systemConfig: SystemCalibration = DEFAULT_CALIBRATION) => {
    if (entries.length < 7) return null;
    
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(now.getDate() - lookbackDays);
    
    const recent = entries.filter(e => new Date(e.isoDate) >= cutoff);
    if (recent.length === 0) return null;

    // Split into two halves to check for trends
    const mid = Math.floor(recent.length / 2);
    const firstHalf = recent.slice(mid);
    const secondHalf = recent.slice(0, mid);

    const getAvg = (arr: WellnessEntry[], key: keyof WellnessEntry) => {
      const vals = arr.map(e => e[key]).filter(v => typeof v === 'number' && v !== null) as number[];
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };

    const metrics: (keyof WellnessEntry)[] = ['sleepQuality', 'stress', 'lastSessionRPE', 'energy', 'soreness', 'social'];
    const correlations = metrics.map(m => {
      const avg1 = getAvg(firstHalf, m);
      const avg2 = getAvg(secondHalf, m);
      if (avg1 === null || avg2 === null) return null;
      
      const diff = avg2 - avg1;
      // For RPE, positive diff is bad (increasing load). 
      // For ALL other metrics (Readiness Scores), negative diff is bad (decreasing readiness).
      const isNegativeTrend = (m === 'lastSessionRPE') ? diff > systemConfig.decouplingThreshold : diff < -systemConfig.decouplingThreshold;
      
      return {
        metric: m,
        diff,
        isNegativeTrend,
        label: m.replace(/([A-Z])/g, ' $1').toLowerCase()
      };
    }).filter(c => c !== null && c.isNegativeTrend);

    return correlations;
  },

  calculateMetricStats: (entries: WellnessEntry[], lookbackDays: number = 28, calibration: PersonalityCalibration = 'BALANCED', systemConfig: SystemCalibration = DEFAULT_CALIBRATION) => {
    if (entries.length === 0) return [];
    
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(now.getDate() - lookbackDays);
    const recent = entries.filter(e => new Date(e.isoDate) >= cutoff);
    
    const metrics: { key: keyof WellnessEntry; label: string }[] = [
      { key: 'sleepQuality', label: 'Sleep' },
      { key: 'energy', label: 'Energy' },
      { key: 'stress', label: 'Stress Mgmt' },
      { key: 'soreness', label: 'Freshness' },
      { key: 'social', label: 'Mood' },
      { key: 'sleepHours', label: 'Sleep Hours' },
      { key: 'lastSessionRPE', label: 'sRPE' }
    ];

    // Adjust volatility thresholds based on personality calibration
    // Stoic: Low threshold (very sensitive)
    // Balanced: Standard threshold
    // Expressive: High threshold (less sensitive to noise)
    const baseThreshold = systemConfig.volatilityThreshold;
    const thresholds = {
      STOIC: { volatile: baseThreshold * 0.66, moderate: baseThreshold * 0.4 },
      BALANCED: { volatile: baseThreshold, moderate: baseThreshold * 0.66 },
      EXPRESSIVE: { volatile: baseThreshold * 1.5, moderate: baseThreshold }
    }[calibration] || { volatile: baseThreshold, moderate: baseThreshold * 0.66 };

    return metrics.map(m => {
      const vals = recent.map(e => e[m.key]).filter(v => typeof v === 'number' && v !== null) as number[];
      if (vals.length === 0) return { ...m, avg: 0, volatility: 0, status: 'NO DATA' };
      
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const variance = vals.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / vals.length;
      const stdDev = Math.sqrt(variance);
      
      let status = 'STABLE';
      if (stdDev > thresholds.volatile) status = 'VOLATILE';
      else if (stdDev > thresholds.moderate) status = 'MODERATE';

      return {
        ...m,
        avg: (avg / (m.key === 'sleepHours' ? 12 : (m.key === 'lastSessionRPE' ? 10 : 7))) * 100,
        mean: avg,
        stdDev,
        volatility: stdDev,
        status
      };
    });
  }
};
