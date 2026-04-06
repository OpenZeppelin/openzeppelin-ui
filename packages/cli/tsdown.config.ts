import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  failOnWarn: false,
  dts: true,
  clean: true,
  sourcemap: true,
  // Private monorepo package — bundle it so published @openzeppelin/ui-cli does not depend on npm.
  noExternal: ['@openzeppelin/ui-tailwind-utils'],
});
