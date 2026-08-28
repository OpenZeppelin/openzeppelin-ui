/**
 * @vitest-environment node
 *
 * SF-10 · Package boundary — INV-4 (declaration surface).
 * Reads dist/, so `pnpm test` builds first and `readDistArtifact` rejects a
 * stale build rather than asserting against it.
 */
import { describe, expect, it } from 'vitest';

import { readDistArtifact } from '../../../../__tests__/distArtifact';

const DOMAIN_VOCABULARY = [
  /\bstellar[_-]/i,
  /\bCargo\.toml\b/,
  /\brev\s*=/,
  /\bgithub\.com\/openzeppelin\b/i,
  /\bstellar-contracts\b/i,
] as const;

/**
 * Every artifact the kit ships from the preview subpaths. Domain vocabulary can
 * leak through a JS bundle (an inlined constant, a comment) just as easily as
 * through a declaration file, so all of them are scanned.
 */
const PUBLISHED_ARTIFACTS = [
  'code-view.d.mts',
  'code-view.d.cts',
  'code-view.mjs',
  'code-view.cjs',
  'file-tree.d.mts',
  'file-tree.d.cts',
  'file-tree.mjs',
  'file-tree.cjs',
  'index.d.mts',
  'index.d.cts',
  'index.mjs',
  'index.cjs',
] as const;

describe('INV-4: built declarations expose decoration types without domain leakage', () => {
  it.each(['code-view.d.mts', 'code-view.d.cts'] as const)(
    'dist/%s exports decoration seam types and hides private tokenizer symbols',
    (fileName) => {
      const types = readDistArtifact(fileName);
      expect(types).toContain('decorateToken');
      expect(types).toContain('CodeViewToken');
      expect(types).toContain('CodeViewDecorationContext');
      expect(types).toContain('CodeViewTokenDecorator');
      expect(types).toContain('isCodeViewLanguage');
      expect(types).not.toContain('HighlightResult');
      expect(types).not.toContain('RenderHastOptions');
    }
  );

  it.each(PUBLISHED_ARTIFACTS)('dist/%s carries no consumer domain vocabulary', (fileName) => {
    const artifact = readDistArtifact(fileName);
    for (const pattern of DOMAIN_VOCABULARY) {
      expect(artifact, `${fileName} must not match ${pattern}`).not.toMatch(pattern);
    }
  });
});
