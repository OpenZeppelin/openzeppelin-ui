import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, mergeConfig } from 'vitest/config';

import { sharedVitestConfig } from '../../vitest.shared.config';

const exampleRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(
  mergeConfig(sharedVitestConfig, {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(exampleRoot, './src'),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['src/components/__tests__/setup.ts'],
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
      exclude: ['**/node_modules/**', '**/dist/**'],
    },
  })
);
