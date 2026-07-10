/**
 * SF-4 · INV-121 (LOCKED, import-boundary arm): the address-display module
 * tree is chain-agnostic and capability-free — it imports ONLY value types
 * (`@openzeppelin/ui-types`), presentational utils (`@openzeppelin/ui-utils`),
 * React, sibling UI modules, and relative files. It must never import the
 * runtime capability layer, the async resolution hook, or a query library.
 *
 * Enforcement vehicle (invariants doc Open Question, resolved at Tests): a
 * source-scan test — the repo has no dependency-cruiser/no-restricted-imports
 * rule for this boundary, so the suite enforces it here.
 * artifacts/001-ens-uikit-support/sf-4-address-display/03-invariants.md (Rev 2)
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const MODULE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Product source files of the address-display module tree (tests excluded). */
const moduleFiles = readdirSync(MODULE_DIR)
  .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f))
  .map((f) => join(MODULE_DIR, f));

const FORBIDDEN_IMPORTS = [
  '@openzeppelin/ui-react',
  '@openzeppelin/ui-renderer',
  '@openzeppelin/ui-adapters',
  '@tanstack/react-query',
];

const FORBIDDEN_SYMBOLS = ['useResolveAddress', 'useQuery', 'NameResolutionCapability'];

const ALLOWED_IMPORT =
  /^(react|react\/.+|@openzeppelin\/ui-types|@openzeppelin\/ui-utils|lucide-react|\.\.?\/.+)$/;

/**
 * Strip block and line comments so JSDoc `@example` snippets (which
 * legitimately show consumer-side `from '@openzeppelin/ui-components'`
 * imports) don't trip the code-level boundary scan.
 *
 * @param source - Raw file contents
 * @returns Source with comments removed
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('INV-121: capability-free import boundary of the address-display module tree', () => {
  it('scans a non-empty product-source file set (guards against a silently-moved module)', () => {
    const names = moduleFiles.map((f) => f.split('/').pop());
    expect(names).toContain('address-display.tsx');
    expect(names).toContain('address-avatar.tsx');
    expect(names).toContain('address-name-context.tsx');
    expect(names).toContain('use-address-name.ts');
    expect(names).toContain('context.ts');
  });

  it.each(moduleFiles.map((f) => [f.split('/').pop() as string, f]))(
    'imports no runtime/capability/query package and no async-resolution symbol: %s',
    (_name, file) => {
      const source = stripComments(readFileSync(file, 'utf-8'));

      for (const forbidden of FORBIDDEN_IMPORTS) {
        expect(source).not.toContain(`'${forbidden}`);
        expect(source).not.toContain(`"${forbidden}`);
      }
      for (const symbol of FORBIDDEN_SYMBOLS) {
        // Match import sites and call/type-usage sites; prose mentions in
        // comments (which legitimately explain the boundary) don't match.
        const usage = new RegExp(`(import[^;]*\\b${symbol}\\b|\\b${symbol}\\s*[(<])`);
        expect(source).not.toMatch(usage);
      }
    }
  );

  it.each(moduleFiles.map((f) => [f.split('/').pop() as string, f]))(
    'every import specifier is in the allowed set (react / ui-types / ui-utils / lucide-react / relative): %s',
    (_name, file) => {
      const source = stripComments(readFileSync(file, 'utf-8'));
      const specifiers = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
      for (const spec of specifiers) {
        expect(spec, `unexpected import '${spec}' in ${file}`).toMatch(ALLOWED_IMPORT);
      }
    }
  );
});
