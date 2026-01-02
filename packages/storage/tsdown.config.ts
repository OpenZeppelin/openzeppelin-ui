import { defineConfig } from 'tsdown';

/**
 * tsdown configuration for the storage package.
 *
 * NOTE: tsdown/rolldown-plugin-dts generates declaration files with content hashes
 * (e.g., index-CFDKbKjc.d.ts) instead of clean names (index.d.ts). This is a known
 * limitation with no current fix. The `build:dts-fix` script in package.json copies
 * hashed files to expected names as a workaround.
 *
 * Related issues:
 * - https://github.com/rolldown/tsdown/issues/683
 * - https://github.com/egoist/tsup/issues/1129
 * - https://github.com/egoist/tsup/issues/1084
 */
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['react'],
});
