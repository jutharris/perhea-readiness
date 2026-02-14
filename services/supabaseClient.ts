import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

let clientInstance: SupabaseClient | null = null;

if (!supabaseUrl || supabaseUrl === 'undefined') {
  console.warn("Supabase URL is missing from environment variables.");
}
if (!supabaseAnonKey || supabaseAnonKey === 'undefined') {
  console.warn("Supabase Anon Key is missing from environment variables.");
}

if (supabaseUrl && supabaseAnonKey && supabaseUrl !== 'undefined' && supabaseAnonKey !== 'undefined') {
  try {
    clientInstance = createClient(supabaseUrl, supabaseAnonKey);
    console.log("Supabase initialized successfully.");
  } catch (e) {
    console.error("Failed to initialize Supabase client:", e);
  }
}

export const supabase = clientInstance;
export const isSupabaseConfigured = () => !!supabase;
