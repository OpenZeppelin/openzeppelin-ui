import { readFileSync } from 'fs';
import path from 'path';
import { defineConfig, mergeConfig } from 'vitest/config';

import { sharedVitestConfig } from '../../vitest.shared.config';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig(
  mergeConfig(sharedVitestConfig, {
    define: {
      __PACKAGE_VERSION__: JSON.stringify(pkg.version),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      environment: 'jsdom',
      passWithNoTests: true,
      setupFiles: [path.resolve(__dirname, 'test/setup.ts')],
    },
  })
);
