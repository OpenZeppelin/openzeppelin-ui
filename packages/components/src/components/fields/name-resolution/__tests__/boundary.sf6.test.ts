/**
 * SF-6 · Capability-free import boundary — INV-139 / INV-143.
 *
 * SF-6 modules in ui-components must not import wallet/runtime layers or read
 * `provenance.external` for UI policy.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SF6_MODULE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

const SF6_SOURCE_FILES = ['useResolvingAnnouncerCopy.ts', join('..', 'AddressField.tsx')] as const;

const FORBIDDEN_IMPORTS = [
  '@openzeppelin/ui-react',
  '@openzeppelin/ui-renderer',
  '@openzeppelin/adapter-evm-core',
  '@openzeppelin/ui-adapters',
];

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('INV-143: ui-components SF-6 modules stay capability-free', () => {
  it.each(SF6_SOURCE_FILES.map((f) => [f, join(SF6_MODULE_DIR, f)] as const))(
    '%s imports no wallet or adapter runtime package',
    (_label, filePath) => {
      const source = stripComments(readFileSync(filePath, 'utf8'));
      for (const pkg of FORBIDDEN_IMPORTS) {
        expect(source).not.toMatch(new RegExp(`from ['"]${pkg.replace('/', '\\/')}`));
      }
      expect(source).not.toMatch(/\buseWalletState\s*\(/);
    }
  );
});

describe('INV-139: provenance.external is never consulted for SF-6 UI logic', () => {
  it('AddressField and useResolvingAnnouncerCopy do not read provenance.external', () => {
    for (const rel of SF6_SOURCE_FILES) {
      const source = stripComments(readFileSync(join(SF6_MODULE_DIR, rel), 'utf8'));
      expect(source).not.toMatch(/provenance\.external/);
      expect(source).not.toMatch(/\.external\b/);
    }
  });
});
