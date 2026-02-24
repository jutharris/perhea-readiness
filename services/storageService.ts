import { supabase } from './supabaseClient';
import { User, WellnessEntry, UserRole, ReadinessStatus, SubmaxTest } from '../types';

// ... checkConfig and other methods ...

export const storageService = {
  // ... existing methods ...

  saveSubmaxTest: async (testData: Partial<SubmaxTest>) => {
    if (!supabase) throw new Error("Supabase not configured");
    const { error } = await supabase.from('submax_tests').insert([{
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
    if (!supabase) throw new Error("Supabase not configured");
    const { data } = await supabase
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

  // ... calculateReadiness ...
};
