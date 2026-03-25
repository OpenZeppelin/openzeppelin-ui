import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  // This CLI intentionally publishes dual ESM/CJS entrypoints.
  // tsdown warns about CJS in CI, but for this package that warning is expected.
  failOnWarn: false,
  dts: true,
  clean: true,
  sourcemap: true,
});
