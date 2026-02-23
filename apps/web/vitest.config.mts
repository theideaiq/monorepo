import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@repo/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@repo/utils': path.resolve(__dirname, '../../packages/utils/src'),
      '@repo/config': path.resolve(__dirname, '../../packages/config/src'),
      '@repo/database': path.resolve(__dirname, '../../packages/database/src'),
      '@repo/payment-engine': path.resolve(
        __dirname,
        '../../packages/payment-engine/src',
      ),
    },
  },
});
