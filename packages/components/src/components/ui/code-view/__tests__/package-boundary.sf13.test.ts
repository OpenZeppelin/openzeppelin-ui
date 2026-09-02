/**
 * @vitest-environment node
 *
 * SF-13 · Package boundary — INV-4.
 * Reads dist/ only through `readDistArtifact`, which fails when the bundle
 * is older than src/. Do not read dist files directly.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { PACKAGE_ROOT, readDistArtifact } from '../../../../__tests__/distArtifact';

const CHANGESET_DIR = join(PACKAGE_ROOT, '../..', '.changeset');

const DOMAIN_VOCABULARY = [
  /\bstellar[_-]/i,
  /\bCargo\.toml\b/,
  /\brev\s*=/,
  /\bgithub\.com\/openzeppelin\b/i,
  /\bstellar-contracts\b/i,
  /\bRWA\b/,
  /field[- ]impact/i,
] as const;

const PUBLISHED_CODE_VIEW_ARTIFACTS = [
  'code-view.d.mts',
  'code-view.d.cts',
  'code-view.mjs',
  'code-view.cjs',
] as const;

describe('INV-4: built declarations expose CodeViewReveal and hide private symbols', () => {
  it.each(['code-view.d.mts', 'code-view.d.cts'] as const)(
    'dist/%s exports CodeViewReveal and reveal? and hides offset helpers',
    (fileName) => {
      const types = readDistArtifact(fileName);
      expect(types).toContain('CodeViewReveal');
      expect(types).toContain('reveal?');
      expect(types).toContain('startLine');
      expect(types).toContain('endLine');
      expect(types).not.toContain('resolveRevealRange');
      expect(types).not.toContain('RevealOffsets');
      expect(types).not.toContain('RenderHastOptions');
      expect(types).not.toContain('useImperativeHandle');
      expect(types).not.toContain('forwardRef');

      // INV-4 restated for SF-14. This line was `not.toContain('lineNumbers')`, the
      // published half of SF-3 design decision 8. The gutter now ships as an opt-in
      // prop, so the ban is replaced by the shape that ban was really about: one
      // optional boolean, and still no alignment or handle API on the reveal.
      //
      // The old assertion would have kept passing regardless — `toContain` is
      // case-sensitive and `showLineNumbers` carries a capital L — so it is replaced
      // rather than left standing as a ban on something the package now exports.
      expect(types).toContain('showLineNumbers?: boolean');
      expect(types).not.toContain('scrollBehavior');
      expect(types).not.toContain('IfOutsideViewport');
    }
  );

  it.each(PUBLISHED_CODE_VIEW_ARTIFACTS)(
    'dist/%s carries no consumer domain vocabulary',
    (fileName) => {
      const artifact = readDistArtifact(fileName);
      for (const pattern of DOMAIN_VOCABULARY) {
        expect(artifact, `${fileName} must not match ${pattern}`).not.toMatch(pattern);
      }
    }
  );
});

describe('INV-4: one unpublished changeset, still wizard-preview-primitives', () => {
  it('does not add a second changeset file', () => {
    const files = readdirSync(CHANGESET_DIR).filter(
      (name) => name.endsWith('.md') && name !== 'README.md'
    );
    expect(files, 'INV-4: a second changeset would be a second minor after publish').toEqual([
      'wizard-preview-primitives.md',
    ]);
    const body = readFileSync(join(CHANGESET_DIR, 'wizard-preview-primitives.md'), 'utf-8');
    expect(body).toMatch(/reveal/);
    expect(body).toMatch(/startLine/);
    expect(body).toMatch(/endLine/);
  });
});
