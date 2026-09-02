import { readFileSync } from 'fs';
import { defineConfig } from 'tsdown';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  entry: ['src/index.ts', 'src/code-editor.ts', 'src/code-view.ts', 'src/file-tree.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['react', 'react-dom', '@pierre/trees'],
  define: {
    __PACKAGE_VERSION__: JSON.stringify(pkg.version),
  },
});
