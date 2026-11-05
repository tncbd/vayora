import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173 },
  build: { sourcemap: false, target: 'es2020' },
  test: { environment: 'node', env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' }, include: ['src/**/*.test.{ts,tsx}', 'supabase/tests/**/*.test.ts'], testTimeout: 30000 },
});
