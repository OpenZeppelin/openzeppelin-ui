/**
 * @vitest-environment node
 *
 * SF-4 · Package boundary — INV-4, INV-16, INV-17.
 * Build externalization was verified in Code; this suite asserts regression guards.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { PACKAGE_ROOT, readDistArtifact } from '../../../__tests__/distArtifact';

const pkg = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf-8'));

describe('INV-4: FileTree is subpath-only', () => {
  it('exports ./file-tree from package.json', () => {
    expect(pkg.exports['./file-tree']).toBeDefined();
  });

  it('does not mention FileTree in the built main declaration file', () => {
    const mainTypes = readDistArtifact('index.d.mts');
    expect(mainTypes).not.toMatch(/\bFileTree\b/);
  });

  it('does not reference @pierre/trees in the built main bundle', () => {
    for (const fileName of ['index.mjs', 'index.cjs'] as const) {
      const bundle = readDistArtifact(fileName);
      expect(bundle, `${fileName} must stay free of Pierre`).not.toContain('@pierre/trees');
      expect(bundle, `${fileName} must stay free of preact`).not.toMatch(/\bpreact\b/i);
    }
  });
});

describe('INV-16: optional peer stays external and exact', () => {
  it('declares an exact optional @pierre/trees peer and matching devDependency', () => {
    expect(pkg.peerDependencies['@pierre/trees']).toBe('1.0.0-beta.6');
    expect(pkg.devDependencies['@pierre/trees']).toBe('1.0.0-beta.6');
    expect(pkg.peerDependenciesMeta['@pierre/trees']?.optional).toBe(true);
  });

  it.each(['file-tree.mjs', 'file-tree.cjs'] as const)(
    'dist/%s keeps bare @pierre/trees imports and inlines no preact runtime',
    (fileName) => {
      const bundle = readDistArtifact(fileName);
      expect(bundle).toMatch(/@pierre\/trees/);
      expect(bundle.match(/\bpreact\b/gi) ?? []).toHaveLength(0);
    }
  );

  it('exports kit-owned types only from file-tree declarations', () => {
    for (const fileName of ['file-tree.d.mts', 'file-tree.d.cts'] as const) {
      const types = readDistArtifact(fileName);
      expect(types).toContain('FileTree');
      expect(types).toContain('FileTreePath');
      expect(types).not.toMatch(/from\s+["']@pierre\/trees/);
      expect(types).not.toMatch(/\bpreact\b/i);
    }
  });
});

describe('INV-16: the ./file-tree subpath is ESM-only at runtime', () => {
  it('documents that the peer publishes no require condition', () => {
    const peer = JSON.parse(
      readFileSync(join(PACKAGE_ROOT, 'node_modules/@pierre/trees/package.json'), 'utf-8')
    ) as { type?: string; exports: Record<string, Record<string, string>> };

    // The kit ships dist/file-tree.cjs and declares a `require` condition for it,
    // but that build re-exports @pierre/trees. While the peer stays import-only,
    // `require('@openzeppelin/ui-components/file-tree')` cannot resolve under Node,
    // and docs/file-tree/api-reference.md says so. If this ever passes a `require`
    // condition, drop the ESM-only caveat from the docs.
    expect(peer.type).toBe('module');
    for (const subpath of ['.', './react'] as const) {
      expect(
        peer.exports[subpath]?.import,
        `${subpath} must keep an import condition`
      ).toBeTruthy();
      expect(peer.exports[subpath]?.require, `${subpath} must stay import-only`).toBeUndefined();
    }
  });
});

describe('INV-17: missing-peer failure stays resolver-owned', () => {
  it('uses static Pierre imports in the built file-tree bundle (no async loader)', () => {
    const bundle = readDistArtifact('file-tree.mjs');
    expect(bundle).toMatch(/from\s+["']@pierre\/trees/);
    expect(bundle).not.toMatch(/import\s*\(/);
  });
});
