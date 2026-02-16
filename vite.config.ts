import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
// Added process import to resolve TypeScript error regarding process.cwd()
import process from 'node:process';

export default defineConfig(({ mode }) => {
  // Use imported process to access cwd() safely in a TypeScript environment
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY),
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
    server: {
      port: 3000,
    }
  };
});
