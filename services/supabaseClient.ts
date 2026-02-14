
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Safely retrieves environment variables across different build environments.
 */
const getEnv = (key: string): string | undefined => {
  try {
    // 1. Check for process.env (Standard Node/CommonJS)
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
    
    // 2. Check for import.meta.env (Vite / Modern ESM)
    // Note: We use a string check to avoid build-time errors in environments that don't support it
    const meta = (import.meta as any);
    if (meta && meta.env && meta.env[key]) {
      return meta.env[key];
    }
    if (meta && meta.env && meta.env[`VITE_${key}`]) {
      return meta.env[`VITE_${key}`];
    }

    // 3. Check for window.env (Custom global injection)
    if (typeof window !== 'undefined' && (window as any).env && (window as any).env[key]) {
      return (window as any).env[key];
    }
  } catch (e) {
    // Silently fail to avoid crashing the whole module
  }
  return undefined;
};

const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY');

let clientInstance: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    // Validate that it's a real URL and not a placeholder string
    if (supabaseUrl.startsWith('http')) {
      clientInstance = createClient(supabaseUrl, supabaseAnonKey);
    } else {
      console.warn("SUPABASE_URL found but does not look like a valid URL.");
    }
  } catch (e) {
    console.error("Critical: Failed to initialize Supabase client:", e);
  }
} else {
  console.warn("Supabase credentials not found in environment.");
}

export const supabase = clientInstance;

export const isSupabaseConfigured = () => !!supabase;
