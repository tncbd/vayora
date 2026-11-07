import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173 },
  build: {
    sourcemap: false,
    target: 'es2020',
    rollupOptions: {
      output: {
        // stable vendor chunks cache well between deploys
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined;
          if (/react-router|@remix-run/.test(id)) return 'router';
          if (/@supabase/.test(id)) return 'supabase';
          if (/react-hook-form|@hookform|zod/.test(id)) return 'forms';
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react';
          return undefined;
        },
      },
    },
  },
  test: { environment: 'node', env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' }, include: ['src/**/*.test.{ts,tsx}', 'supabase/tests/**/*.test.ts'], testTimeout: 30000 },
});
