/**
 * @vitest-environment node
 *
 * SF-1 · Package / source boundary — INV-1, INV-2, INV-15, INV-18, INV-20, INV-21.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { PACKAGE_ROOT, readDistArtifact } from '../../../../__tests__/distArtifact';
import * as UiBarrel from '../../index';
import * as DataTableFolder from '../index';

const DATA_TABLE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES_PKG_SRC = join(PACKAGE_ROOT, '../types/src');

const PRODUCT_FILES = readdirSync(DATA_TABLE_DIR)
  .filter((name) => /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name))
  .map((name) => join(DATA_TABLE_DIR, name));

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function walkTsFiles(directory: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '__tests__') {
      continue;
    }
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkTsFiles(path));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) {
      out.push(path);
    }
  }
  return out;
}

const TYPES_ONLY_FILES = PRODUCT_FILES.filter((file) => {
  const name = file.split('/').pop();
  return name === 'types.ts' || name === 'index.ts' || name === 'helpers.ts';
});

describe('INV-1: constructing columns mounts nothing; INV-52: renderer is the only runtime export', () => {
  it('ships a non-empty product source set under data-table/', () => {
    const names = PRODUCT_FILES.map((file) => file.split('/').pop());
    expect(
      names,
      'product files must include types.ts, index.ts, helpers.ts, and data-table.tsx'
    ).toEqual(expect.arrayContaining(['types.ts', 'index.ts', 'helpers.ts', 'data-table.tsx']));
  });

  it('folder barrel’s only runtime value is DataTable (helpers stay off the barrel)', () => {
    expect(
      Object.keys(DataTableFolder),
      'INV-52 / INV-136 / INV-190: data-table/index runtime exports stay curated'
    ).toEqual([
      'DataTable',
      'DATA_TABLE_DEFAULT_ESTIMATE_SIZE',
      'DATA_TABLE_DEFAULT_OVERSCAN',
      'DATA_TABLE_DEFAULT_VIRTUALIZED_MAX_HEIGHT',
      'DATA_TABLE_SELECT_COLUMN_ID',
    ]);
  });

  it('publishes DataTable on the main UI barrel; column types remain type-only', () => {
    expect('DataTable' in UiBarrel, 'INV-52: DataTable must be a value on the main UI barrel').toBe(
      true
    );
    expect('DataTableColumn' in UiBarrel).toBe(false);
    expect('DataTableAlign' in UiBarrel).toBe(false);
    expect('DataTableSortValue' in UiBarrel).toBe(false);
    expect('DataTableName' in UiBarrel).toBe(false);
    expect('DataTableProps' in UiBarrel).toBe(false);
    expect('DataTableSortDirection' in UiBarrel).toBe(false);
    expect('DataTableSortState' in UiBarrel).toBe(false);
  });

  it.each(TYPES_ONLY_FILES.map((file) => [file.split('/').pop() as string, file]))(
    'keeps %s as a .ts module with no createElement / JSX factory',
    (name, file) => {
      expect(
        name?.endsWith('.tsx'),
        `INV-1: ${name} must stay types/helpers (.ts); JSX is allowed only in data-table.tsx`
      ).toBe(false);
      const source = stripComments(readFileSync(file, 'utf-8'));
      expect(source, `INV-1: ${file} must not call createElement`).not.toMatch(/\bcreateElement\b/);
      expect(source, `INV-1: ${file} must not import jsx-runtime`).not.toMatch(
        /react\/jsx-runtime/
      );
    }
  );
});

describe('INV-2: cell paint is integrator composition, never a kit widget map', () => {
  it('does not import kit widgets to choose integrator cell content', () => {
    const forbidden = ['badge', 'address-display', 'overflow-menu', 'checkbox', 'button'];
    for (const file of PRODUCT_FILES) {
      const source = stripComments(readFileSync(file, 'utf-8'));
      for (const widget of forbidden) {
        if (widget === 'button' && file.endsWith('pagination-controls.tsx')) {
          continue;
        }
        if (widget === 'checkbox' && file.endsWith('data-table.tsx')) {
          expect(
            source,
            'INV-176: DataTable may import Checkbox only for the kit-owned selection column'
          ).toMatch(/from\s+['"]\.\.\/checkbox['"]/);
          continue;
        }
        expect(
          source,
          `INV-2: ${file} must not import ${widget} to choose a cell widget`
        ).not.toMatch(new RegExp(`from\\s+['"]\\.\\./${widget}['"]`));
      }
    }
  });
});

describe('INV-15: column types live in ui-components, not ui-types', () => {
  it('does not mention DataTableColumn in @openzeppelin/ui-types product sources', () => {
    const files = walkTsFiles(TYPES_PKG_SRC);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const source = readFileSync(file, 'utf-8');
      expect(
        source,
        `INV-15: ${file} must not declare DataTableColumn (React-coupled generic stays in ui-components)`
      ).not.toMatch(/\bDataTableColumn\b/);
    }
  });

  it('declares DataTableColumn on the built main types entry', () => {
    const mainTypes = readDistArtifact('index.d.mts');
    expect(mainTypes, 'INV-15: main barrel declarations must export DataTableColumn').toMatch(
      /\bDataTableColumn\b/
    );
    expect(mainTypes).toMatch(/\bDataTableAlign\b/);
    expect(mainTypes).toMatch(/\bDataTableSortValue\b/);
  });
});

describe('INV-18: column module emits no events', () => {
  it('does not declare sort/page/select callbacks in product sources', () => {
    for (const file of PRODUCT_FILES) {
      const source = stripComments(readFileSync(file, 'utf-8'));
      expect(source, `INV-18: ${file} must not add onSort`).not.toMatch(/\bonSort\b/);
      if (!/(?:types|data-table|pagination-controls)\.tsx?$/.test(file)) {
        expect(source, `INV-18: ${file} must not add onPageChange`).not.toMatch(/\bonPageChange\b/);
      }
      expect(source, `INV-18: ${file} must not add onSelect`).not.toMatch(/\bonSelect\b/);
    }
  });
});

describe('INV-20: column declarations do not subscribe and do not fetch', () => {
  it('imports no query/fetch libraries from data-table product sources', () => {
    const forbidden = ['@tanstack/react-query', 'axios', 'graphql', 'swr'];
    for (const file of PRODUCT_FILES) {
      const source = stripComments(readFileSync(file, 'utf-8'));
      for (const spec of forbidden) {
        expect(source, `INV-20: ${file} must not import ${spec}`).not.toContain(`'${spec}`);
        expect(source).not.toContain(`"${spec}`);
      }
      expect(source, `INV-20: ${file} must not call fetch`).not.toMatch(/\bfetch\s*\(/);
    }
  });
});

describe('INV-21: main barrel stays free of optional-heavy virtualization deps', () => {
  it('does not import @pierre/trees, editors, or a virtualizer from SF-1 sources', () => {
    for (const file of PRODUCT_FILES) {
      const source = stripComments(readFileSync(file, 'utf-8'));
      expect(source, `${file} must not import @pierre/trees`).not.toContain('@pierre/trees');
      expect(source).not.toContain('@uiw/react-textarea-code-editor');
      expect(source).not.toMatch(/react-window|react-virtuoso/);
      expect(source).not.toMatch(/@tanstack\/react-table/);
      if (file.endsWith('data-table-scroller.tsx')) {
        expect(source).toMatch(/@tanstack\/react-virtual/);
      } else {
        expect(source).not.toMatch(/@tanstack\/react-virtual/);
      }
    }
  });

  it('does not add a ./data-table package export (types ride the main barrel)', () => {
    const pkg = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf-8')) as {
      exports: Record<string, unknown>;
    };
    expect(
      pkg.exports['./data-table'],
      'INV-21: SF-1 must not introduce a data-table subpath; virtualization subpath is an SF-4 decision'
    ).toBeUndefined();
    expect(pkg.exports['./file-tree']).toBeDefined();
    expect(pkg.exports['./code-view']).toBeDefined();
  });

  it('keeps the built main bundle free of @pierre/trees', () => {
    for (const fileName of ['index.mjs', 'index.cjs'] as const) {
      const bundle = readDistArtifact(fileName);
      expect(bundle, `${fileName} must stay free of Pierre after SF-1 types land`).not.toContain(
        '@pierre/trees'
      );
    }
  });
});
