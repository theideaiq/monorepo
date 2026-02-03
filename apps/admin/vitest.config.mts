import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    alias: {
      '@repo/ui': path.resolve(__dirname, './src/__mocks__/repo-ui.tsx'),
      '@': path.resolve(__dirname, './src'),
    },
  },
});
