/**
 * @vitest-environment node
 *
 * SF-4 · Package boundary — INV-4, INV-16, INV-17.
 * Build externalization was verified in Code; this suite asserts regression guards.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const pkg = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf-8'));

describe('INV-4: FileTree is subpath-only', () => {
  it('exports ./file-tree from package.json', () => {
    expect(pkg.exports['./file-tree']).toBeDefined();
  });

  it('does not mention FileTree in the built main declaration file', () => {
    const mainTypes = readFileSync(join(PACKAGE_ROOT, 'dist/index.d.mts'), 'utf-8');
    expect(mainTypes).not.toMatch(/\bFileTree\b/);
  });

  it('does not reference @pierre/trees in the built main bundle', () => {
    for (const fileName of ['index.mjs', 'index.cjs'] as const) {
      const bundle = readFileSync(join(PACKAGE_ROOT, 'dist', fileName), 'utf-8');
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
      const bundle = readFileSync(join(PACKAGE_ROOT, 'dist', fileName), 'utf-8');
      expect(bundle).toMatch(/@pierre\/trees/);
      expect(bundle.match(/\bpreact\b/gi) ?? []).toHaveLength(0);
    }
  );

  it('exports kit-owned types only from file-tree declarations', () => {
    for (const fileName of ['file-tree.d.mts', 'file-tree.d.cts'] as const) {
      const types = readFileSync(join(PACKAGE_ROOT, 'dist', fileName), 'utf-8');
      expect(types).toContain('FileTree');
      expect(types).toContain('FileTreePath');
      expect(types).not.toMatch(/from\s+["']@pierre\/trees/);
      expect(types).not.toMatch(/\bpreact\b/i);
    }
  });
});

describe('INV-17: missing-peer failure stays resolver-owned', () => {
  it('uses static Pierre imports in the built file-tree bundle (no async loader)', () => {
    const bundle = readFileSync(join(PACKAGE_ROOT, 'dist/file-tree.mjs'), 'utf-8');
    expect(bundle).toMatch(/from\s+["']@pierre\/trees/);
    expect(bundle).not.toMatch(/import\s*\(/);
  });
});
