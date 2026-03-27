import { readFileSync } from 'fs';
import { defineConfig, mergeConfig } from 'vitest/config';

import { sharedVitestConfig } from '../../vitest.shared.config';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig(
  mergeConfig(sharedVitestConfig, {
    define: {
      __PACKAGE_VERSION__: JSON.stringify(pkg.version),
    },
  })
);
