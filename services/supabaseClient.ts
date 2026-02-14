
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Ultra-defensive check for environment variables in browser/Vercel environments
const getEnv = (key: string): string | undefined => {
  try {
    // Check for process.env (Node-style)
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
    // Check for window.env (some custom setups)
    if (typeof window !== 'undefined' && (window as any).env && (window as any).env[key]) {
      return (window as any).env[key];
    }
  } catch (e) {
    console.warn(`Environment access error for: ${key}`);
  }
  return undefined;
};

const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY');

let clientInstance: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    // Basic validation to prevent createClient from throwing on malformed/placeholder URLs
    if (supabaseUrl.startsWith('http')) {
      clientInstance = createClient(supabaseUrl, supabaseAnonKey);
    } else {
      console.error("SUPABASE_URL is not a valid URL (must start with http)");
    }
  } catch (e) {
    console.error("Failed to initialize Supabase client:", e);
  }
}

export const supabase = clientInstance;

export const isSupabaseConfigured = () => !!supabase;
