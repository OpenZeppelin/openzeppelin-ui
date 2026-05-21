import { readFileSync } from 'fs';
import { defineConfig } from 'tsdown';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  define: {
    __PACKAGE_VERSION__: JSON.stringify(pkg.version),
  },
});
