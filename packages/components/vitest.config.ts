import { readFileSync } from 'fs';
import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig, mergeConfig } from 'vitest/config';

import { sharedVitestConfig } from '../../vitest.shared.config';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig(
  mergeConfig(sharedVitestConfig, {
    plugins: [react()],
    define: {
      __PACKAGE_VERSION__: JSON.stringify(pkg.version),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@styles': path.resolve(__dirname, '../styles'),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      passWithNoTests: true,
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.browser.test.ts', '**/*.browser.test.tsx'],
    },
  })
);
