import { readFileSync } from 'fs';
import path from 'path';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

/**
 * Opt-in browser suite. Not used by `pnpm test`.
 * Run with `pnpm test:browser`. Not wired into CI.
 */
export default defineConfig({
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
    passWithNoTests: true,
    include: ['src/**/*.browser.test.ts', 'src/**/*.browser.test.tsx'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: 'chromium' }],
    },
  },
});
