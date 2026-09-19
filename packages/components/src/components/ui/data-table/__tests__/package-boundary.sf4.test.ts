/**
 * @vitest-environment node
 *
 * SF-4 · Package / source boundary — INV-127, INV-136, INV-148, INV-21*, INV-52*.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { PACKAGE_ROOT, readDistArtifact } from '../../../../__tests__/distArtifact';
import * as UiBarrel from '../../index';
import * as DataTableFolder from '../index';
import type {
  DataTableScrollToAlign,
  DataTableVirtualization,
  DataTableVirtualizationHandle,
} from '../types';

const DATA_TABLE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('INV-136 / INV-148: TanStack is a regular dependency; helpers stay off the barrel', () => {
  it('exports DataTable plus the three default constants from the folder barrel', () => {
    expect(Object.keys(DataTableFolder).sort()).toEqual(
      [
        'DataTable',
        'DATA_TABLE_DEFAULT_ESTIMATE_SIZE',
        'DATA_TABLE_DEFAULT_OVERSCAN',
        'DATA_TABLE_DEFAULT_VIRTUALIZED_MAX_HEIGHT',
        'DATA_TABLE_SELECT_COLUMN_ID',
      ].sort()
    );
    expect('resolveVirtualization' in DataTableFolder).toBe(false);
    expect('ariaRowCount' in DataTableFolder).toBe(false);
    expect('spacerHeights' in DataTableFolder).toBe(false);
    expect('mergeFocusedIndex' in DataTableFolder).toBe(false);
    expect('findBodyIndexByKey' in DataTableFolder).toBe(false);
    expect('isInvalidVirtualizedMaxHeight' in DataTableFolder).toBe(false);
    expect('DataTableScroller' in DataTableFolder).toBe(false);
    expect('DataTable' in UiBarrel).toBe(true);
    expect('DATA_TABLE_DEFAULT_ESTIMATE_SIZE' in UiBarrel).toBe(true);
    expect('resolveVirtualization' in UiBarrel).toBe(false);
  });

  it('type-only exports the virtualization public types', () => {
    expectTypeOf<DataTableVirtualizationHandle>().toMatchTypeOf<{
      scrollToRowKey: (key: string, align?: DataTableScrollToAlign) => void;
    }>();
    expectTypeOf<DataTableVirtualization>().toMatchTypeOf<{
      readonly estimateSize?: number | ((index: number) => number);
      readonly overscan?: number;
      readonly maxHeight?: number;
    }>();
  });

  it('keeps useVirtualizer in the scroller and off data-table.tsx', () => {
    const table = stripComments(readFileSync(join(DATA_TABLE_DIR, 'data-table.tsx'), 'utf8'));
    const scroller = stripComments(
      readFileSync(join(DATA_TABLE_DIR, 'data-table-scroller.tsx'), 'utf8')
    );
    const fromMatches = [...table.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
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
      expect(allowed.has(spec ?? ''), `INV-136: unexpected import ${spec}`).toBe(true);
    }
    expect(table).not.toMatch(/@tanstack\//);
    expect(scroller).toMatch(/from\s+['"]@tanstack\/react-virtual['"]/);
    expect(scroller).not.toMatch(/@pierre\/trees/);
    expect(scroller).not.toMatch(/react-window/);
    expect(scroller).not.toMatch(/react-virtuoso/);
    expect(scroller).not.toMatch(/@tanstack\/react-table/);
  });

  it('declares @tanstack/react-virtual ^3.13.13 and no ./data-table subpath', () => {
    const pkg = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf-8')) as {
      dependencies: Record<string, string>;
      exports: Record<string, unknown>;
    };
    expect(pkg.dependencies['@tanstack/react-virtual']).toBe('^3.13.13');
    expect(pkg.exports['./data-table']).toBeUndefined();
    expect(pkg.dependencies['@pierre/trees']).toBeUndefined();
    expect(pkg.dependencies['react-window']).toBeUndefined();
    expect(pkg.dependencies['react-virtuoso']).toBeUndefined();
    expect(pkg.dependencies['@tanstack/react-table']).toBeUndefined();
    const folderIndex = readFileSync(join(DATA_TABLE_DIR, 'index.ts'), 'utf8');
    expect(folderIndex).not.toMatch(/from\s+['"]\.\/virtualization['"]/);
    expect(folderIndex).not.toMatch(/from\s+['"]\.\/data-table-scroller['"]/);
  });

  it('publishes virtualization types and constants on the built main declarations', () => {
    const mainTypes = readDistArtifact('index.d.mts');
    expect(mainTypes).toMatch(/\bDataTableVirtualization\b/);
    expect(mainTypes).toMatch(/\bDataTableVirtualizationHandle\b/);
    expect(mainTypes).toMatch(/\bDataTableScrollToAlign\b/);
    expect(mainTypes).toMatch(/\bDATA_TABLE_DEFAULT_ESTIMATE_SIZE\b/);
    expect(mainTypes).not.toMatch(/export\s+.*\bresolveVirtualization\b/);
    expect(mainTypes).not.toMatch(/export\s+.*\bDataTableScroller\b/);
    expect(mainTypes).not.toMatch(/export\s+.*\buseVirtualizer\b/);
  });

  it('does not leak Pierre into the main JS bundles', () => {
    for (const fileName of ['index.mjs', 'index.cjs'] as const) {
      const bundle = readDistArtifact(fileName);
      expect(bundle).toMatch(/DataTable/);
      expect(bundle.toLowerCase()).not.toMatch(/@pierre\/trees/);
    }
  });
});
