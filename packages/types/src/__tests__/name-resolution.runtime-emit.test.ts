/**
 * INV-13 gate: the SF-1 type files emit ZERO runtime JavaScript.
 *
 * The interface / value-type surface must compile away entirely — no class, no
 * const, no enum, no error-code literal — so `@openzeppelin/ui-types` stays
 * dependency-free and a runtime bundle carries none of it. Rather than depend on
 * a prior `pnpm build` (fragile CI ordering), this transpiles each source file
 * in isolation with the TypeScript compiler and asserts the emitted code is
 * empty once the type-only `export {}` marker is stripped. If someone adds a
 * runtime value to one of these files, the transpile emits it and the diff in the
 * failure names the offending file and shows the leaked code.
 *
 * Verifies: INV-13 (also guards INV-11 "no Error subclasses" and INV-17 "no
 * runtime imports" at the source-emit level).
 */
import { readFileSync } from 'fs';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

/** SF-1's new, must-be-types-only source files, relative to this test. */
const SF1_TYPE_FILES = [
  {
    label: 'common/name-resolution.ts',
    url: new URL('../common/name-resolution.ts', import.meta.url),
  },
  {
    label: 'adapters/capabilities/name-resolution.ts',
    url: new URL('../adapters/capabilities/name-resolution.ts', import.meta.url),
  },
] as const;

/**
 * Transpile a single module in isolation (type-only imports elided) and return
 * the emitted runtime JS with comments, whitespace, and the bare `export {}`
 * module marker removed.
 */
function emittedRuntimeOf(source: string): string {
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ESNext,
      isolatedModules: true,
    },
  });
  return outputText
    .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
    .replace(/\/\/.*$/gm, '') // line comments
    .replace(/export\s*\{\s*\}\s*;?/g, '') // the type-only re-export marker
    .replace(/\s+/g, '') // all whitespace
    .trim();
}

describe('INV-13: SF-1 type files emit zero runtime JavaScript', () => {
  for (const { label, url } of SF1_TYPE_FILES) {
    it(`${label} transpiles to no runtime code`, () => {
      const source = readFileSync(url, 'utf-8');
      const runtime = emittedRuntimeOf(source);
      // Compare as an object so a failure diff surfaces the file and the leaked code.
      expect({ file: label, emittedRuntime: runtime }).toEqual({
        file: label,
        emittedRuntime: '',
      });
    });
  }
});
