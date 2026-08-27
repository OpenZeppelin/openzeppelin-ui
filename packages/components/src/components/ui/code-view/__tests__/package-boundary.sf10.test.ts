/**
 * @vitest-environment node
 *
 * SF-10 · Package boundary — INV-4 (declaration surface).
 * Reads dist/ only — run `pnpm exec tsdown` in this package when types change (SF-3 precedent).
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../');

const DOMAIN_VOCABULARY = [
  /\bstellar[_-]/i,
  /\bCargo\.toml\b/,
  /\brev\s*=/,
  /\bgithub\.com\/openzeppelin\b/i,
  /\bstellar-contracts\b/i,
] as const;

describe('INV-4: built declarations expose decoration types without domain leakage', () => {
  it.each(['code-view.d.mts', 'code-view.d.cts'] as const)(
    'dist/%s exports decoration seam types and hides private tokenizer symbols',
    (fileName) => {
      const types = readFileSync(join(PACKAGE_ROOT, 'dist', fileName), 'utf-8');
      expect(types).toContain('decorateToken');
      expect(types).toContain('CodeViewToken');
      expect(types).toContain('CodeViewDecorationContext');
      expect(types).toContain('CodeViewTokenDecorator');
      expect(types).not.toContain('HighlightResult');
      expect(types).not.toContain('RenderHastOptions');
      for (const pattern of DOMAIN_VOCABULARY) {
        expect(types, `${fileName} must not match ${pattern}`).not.toMatch(pattern);
      }
    }
  );
});
