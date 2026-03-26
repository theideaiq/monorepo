import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://mock.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'mock',
      SUPABASE_SERVICE_ROLE_KEY: 'mock',
      WAYL_SECRET_KEY: 'mock',
      WAYL_WEBHOOK_SECRET: 'mock',
      ZAIN_SECRET_KEY: 'mock',
      WEB_APP_URL: 'https://mock.app',
      TELEGRAM_BOT_TOKEN: 'mock',
      GEMINI_API_KEY: 'mock',
      UPSTASH_REDIS_REST_URL: 'https://mock.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'mock',
      RESEND_API_KEY: 'mock',
    },
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
