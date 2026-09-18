/**
 * @vitest-environment node
 *
 * SF-2 · Package / source boundary — INV-52 (plus INV-40 source already in performance).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { PACKAGE_ROOT, readDistArtifact } from '../../../../__tests__/distArtifact';
import * as DataTableFolder from '../index';

const DATA_TABLE_TSX = join(dirname(fileURLToPath(import.meta.url)), '..', 'data-table.tsx');

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('INV-52: dependency and barrel boundary', () => {
  it('limits data-table.tsx imports to the Design allow-list', () => {
    const source = stripComments(readFileSync(DATA_TABLE_TSX, 'utf8'));
    const fromMatches = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
    const allowed = new Set([
      'react',
      'lucide-react',
      '@openzeppelin/ui-utils',
      '../checkbox',
      '../empty-state',
      './chrome',
      './data-table-scroller',
      './helpers',
      './pagination-controls',
      './selection',
      './sort',
      './types',
      './virtualization',
    ]);
    for (const spec of fromMatches) {
      expect(allowed.has(spec ?? ''), `INV-52: unexpected import ${spec}`).toBe(true);
    }
    expect(source).not.toMatch(/from\s+['"]\.\.\/badge['"]/);
    expect(source).not.toMatch(/@pierre\/trees/);
    expect(source).not.toMatch(/@tanstack\//);
  });

  it('does not re-export helpers from the folder barrel', () => {
    expect(Object.keys(DataTableFolder)).toEqual([
      'DataTable',
      'DATA_TABLE_DEFAULT_ESTIMATE_SIZE',
      'DATA_TABLE_DEFAULT_OVERSCAN',
      'DATA_TABLE_DEFAULT_VIRTUALIZED_MAX_HEIGHT',
      'DATA_TABLE_SELECT_COLUMN_ID',
    ]);
    expect('resolveColumnName' in DataTableFolder).toBe(false);
    expect('alignClass' in DataTableFolder).toBe(false);
    expect('headerSelectionState' in DataTableFolder).toBe(false);
  });

  it('does not add a production dependency for SF-2', () => {
    const pkg = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf-8')) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };
    expect(pkg.dependencies['axe-core'], 'INV-52: axe-core is test-only').toBeUndefined();
    expect(
      pkg.devDependencies['axe-core'],
      'INV-60: axe-core allowed as a Tests-stage devDependency'
    ).toBeDefined();
    expect(pkg.dependencies.playwright, 'INV-52: playwright is test-only').toBeUndefined();
    expect(
      pkg.devDependencies.playwright,
      'INV-56: playwright is a Tests-stage devDependency so CI can install Chromium'
    ).toBeDefined();
  });

  it('ships DataTable on the built main JS bundles', () => {
    for (const fileName of ['index.mjs', 'index.cjs'] as const) {
      const bundle = readDistArtifact(fileName);
      expect(bundle, `${fileName} must include the DataTable runtime export`).toMatch(/DataTable/);
    }
  });

  it('wires the Chromium browser suite into GitHub CI (INV-56 High-stakes proof)', () => {
    const ci = readFileSync(join(PACKAGE_ROOT, '../../.github/workflows/ci.yml'), 'utf8');
    expect(ci, 'INV-56: CI must install Playwright Chromium before the browser suite').toMatch(
      /playwright install chromium --with-deps/
    );
    expect(ci, 'INV-56: CI must run @openzeppelin/ui-components test:browser').toMatch(
      /pnpm --filter @openzeppelin\/ui-components test:browser/
    );
    expect(ci, 'INV-56: CI must run the example DataTable Playwright smoke').toMatch(
      /@openzeppelin\/ui-example-basic-react-app test:browser/
    );
  });
});
