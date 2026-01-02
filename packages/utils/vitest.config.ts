import path from 'path';
import { defineConfig, mergeConfig } from 'vitest/config';

import { sharedVitestConfig } from '../../vitest.shared.config';

export default defineConfig(
  mergeConfig(sharedVitestConfig, {
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
