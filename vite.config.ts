
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // This allows the app to access process.env if needed, 
    // though using import.meta.env is preferred in Vite.
    'process.env': process.env
  },
  server: {
    port: 3000,
  }
});
