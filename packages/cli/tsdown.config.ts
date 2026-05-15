import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  failOnWarn: false,
  dts: true,
  clean: true,
  sourcemap: true,
  // Internal package — bundle into the published tarball so @openzeppelin/ui-cli has no extra runtime dependency.
  noExternal: ['@openzeppelin/ui-tailwind-utils'],
});
