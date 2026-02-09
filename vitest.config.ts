import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@server': path.resolve(__dirname, 'src/server'),
      '@client': path.resolve(__dirname, 'src/client'),
      '@cli': path.resolve(__dirname, 'src/cli'),
      '@components': path.resolve(__dirname, 'src/components'),
    },
  },
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    onConsoleLog(log) {
      if (log.includes('not configured to support act(...)')) return false;
    },
  },
});
