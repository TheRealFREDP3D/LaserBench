import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vitest/config';
import pkg from './package.json';

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['_DEV_/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**'],
      exclude: ['src/lib/themeContext.tsx'],
      thresholds: {
        lines: 70,
        functions: 70,
      },
    },
  },
});
