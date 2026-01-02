import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig, mergeConfig } from 'vitest/config';

import { sharedVitestConfig } from '../../vitest.shared.config';

export default defineConfig(
  mergeConfig(sharedVitestConfig, {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      passWithNoTests: true,
    },
  })
);
