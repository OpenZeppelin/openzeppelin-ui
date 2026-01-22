import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/code-editor.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['react', 'react-dom'],
});
