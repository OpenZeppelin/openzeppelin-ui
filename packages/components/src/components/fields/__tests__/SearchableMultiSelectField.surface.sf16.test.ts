/**
 * @vitest-environment jsdom
 *
 * 005 SF-16 · INV-6 public surface: exported once, narrow, import boundaries kept.
 * The type-level half (forbidden props, inference) is the compile-only fixture
 * `SearchableMultiSelectField.types.sf16-check.tsx`.
 * artifacts/005-uikit-requests/sf-16-searchable-multi-select-field/03-invariants.md
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import * as root from '../../../index';
import * as fields from '../index';
import { SearchableMultiSelectField } from '../SearchableMultiSelectField';

const FIELDS_DIR = path.resolve(__dirname, '..');
const SMS_DIR = path.resolve(__dirname, '../../ui/searchable-multi-select');

/** Module specifiers a source file imports (static `from '…'` and side-effect imports). */
function importsOf(file: string): string[] {
  const src = readFileSync(file, 'utf8');
  return Array.from(src.matchAll(/(?:from|import)\s+['"]([^'"]+)['"]/g), (m) => m[1] as string);
}

describe('INV-6: exported once from the fields barrel and the package root', () => {
  it('happy: the root and fields barrels expose the same component', () => {
    expect(root.SearchableMultiSelectField).toBe(SearchableMultiSelectField);
    expect(fields.SearchableMultiSelectField).toBe(SearchableMultiSelectField);
    expect(SearchableMultiSelectField.displayName).toBe('SearchableMultiSelectField');
  });

  it('boundary: the barrel line is exactly one, before SelectField', () => {
    const barrel = readFileSync(path.join(FIELDS_DIR, 'index.ts'), 'utf8').split('\n');
    const lines = barrel.filter((l) => l.includes('SearchableMultiSelectField'));
    expect(lines).toEqual(["export * from './SearchableMultiSelectField';"]);
    expect(barrel.indexOf(lines[0] as string)).toBeLessThan(
      barrel.indexOf("export * from './SelectField';")
    );
  });

  it('failure guard: the SF-15 core and list model never reach the package root', () => {
    const exported = Object.keys(root);
    expect(exported).not.toContain('SearchableSelectCore');
    expect(exported).not.toContain('buildListModel');
    expect(exported).not.toContain('toggleId');
    expect(exported).toContain('SearchableMultiSelect');
  });
});

describe('INV-6: import boundaries', () => {
  it('the field imports the public SF-15 entry, never the core or list model', () => {
    const specs = importsOf(path.join(FIELDS_DIR, 'SearchableMultiSelectField.tsx'));
    expect(specs).toContain('../ui/searchable-multi-select');
    expect(specs.filter((s) => /searchable-select-core|list-model/.test(s))).toEqual([]);
  });

  it('nothing under ui/searchable-multi-select/ (source) imports react-hook-form', () => {
    const sources = readdirSync(SMS_DIR).filter((f) => /\.tsx?$/.test(f));
    expect(sources.length).toBeGreaterThanOrEqual(4);
    for (const f of sources) {
      expect(
        importsOf(path.join(SMS_DIR, f)).filter((s) => s.startsWith('react-hook-form'))
      ).toEqual([]);
    }
  });
});
