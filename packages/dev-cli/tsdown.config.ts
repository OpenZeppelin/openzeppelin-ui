import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  // The CLI intentionally ships dual ESM/CJS entrypoints for consumers.
  failOnWarn: false,
  dts: true,
  clean: true,
  sourcemap: true,
});
