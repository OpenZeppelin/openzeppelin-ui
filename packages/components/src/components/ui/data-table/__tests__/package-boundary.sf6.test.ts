/**
 * @vitest-environment node
 *
 * SF-6 · Package / source boundary — INV-166, INV-175.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { PACKAGE_ROOT, readDistArtifact } from '../../../../__tests__/distArtifact';
import * as UiBarrel from '../../index';
import * as DataTableFolder from '../index';
import type { DataTableInfiniteScroll } from '../types';

const DATA_TABLE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('INV-175: infinite type is exported; helpers and sentinel key stay off the barrel', () => {
  it('does not runtime-export sentinel helpers or a public infinite hook', () => {
    expect('DATA_TABLE_INFINITE_SENTINEL_KEY' in DataTableFolder).toBe(false);
    expect('resolveAriaRowCount' in DataTableFolder).toBe(false);
    expect('shouldRequestMoreFromVirtualRange' in DataTableFolder).toBe(false);
    expect('isShortPage' in DataTableFolder).toBe(false);
    expect('isVerticalScrollport' in DataTableFolder).toBe(false);
    expect('DATA_TABLE_SHORT_PAGE_EPSILON_PX' in DataTableFolder).toBe(false);
    expect('useDataTableInfiniteScroll' in DataTableFolder).toBe(false);
    expect('DataTableScroller' in DataTableFolder).toBe(false);
    expect('DATA_TABLE_INFINITE_SENTINEL_KEY' in UiBarrel).toBe(false);
    expect('resolveAriaRowCount' in UiBarrel).toBe(false);
    expect('isShortPage' in UiBarrel).toBe(false);
  });

  it('type-only exports DataTableInfiniteScroll', () => {
    expectTypeOf<DataTableInfiniteScroll>().toMatchTypeOf<{
      readonly hasMore: boolean;
      readonly onLoadMore: () => void;
      readonly busy?: boolean;
    }>();
  });

  it('publishes the type on built declarations and omits helper value exports', () => {
    const mainTypes = readDistArtifact('index.d.mts');
    expect(mainTypes).toMatch(/\bDataTableInfiniteScroll\b/);
    expect(mainTypes).not.toMatch(/export\s+.*\bDATA_TABLE_INFINITE_SENTINEL_KEY\b/);
    expect(mainTypes).not.toMatch(/export\s+.*\bresolveAriaRowCount\b/);
    expect(mainTypes).not.toMatch(/export\s+.*\bisShortPage\b/);
    expect(mainTypes).not.toMatch(/export\s+.*\bshouldRequestMoreFromVirtualRange\b/);
    const folderIndex = readFileSync(join(DATA_TABLE_DIR, 'index.ts'), 'utf8');
    expect(folderIndex).toMatch(/DataTableInfiniteScroll/);
    expect(folderIndex).not.toMatch(/from\s+['"]\.\/virtualization['"]/);
    expect(folderIndex).not.toMatch(/DATA_TABLE_INFINITE_SENTINEL_KEY/);
  });
});

describe('INV-166: package pin and no new infinite dependencies', () => {
  it('keeps @tanstack/react-virtual at ^3.13.13 and adds no Query/Virtuoso', () => {
    const pkg = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf-8')) as {
      dependencies: Record<string, string>;
      exports: Record<string, unknown>;
    };
    expect(pkg.dependencies['@tanstack/react-virtual']).toBe('^3.13.13');
    expect(pkg.dependencies['@tanstack/react-query']).toBeUndefined();
    expect(pkg.dependencies['react-virtuoso']).toBeUndefined();
    expect(pkg.exports['./data-table']).toBeUndefined();
  });
});
