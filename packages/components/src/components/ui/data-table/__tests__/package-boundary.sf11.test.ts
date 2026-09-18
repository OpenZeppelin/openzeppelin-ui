/**
 * @vitest-environment node
 *
 * SF-11 · Package / source boundary — INV-252 / INV-110*.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { readDistArtifact } from '../../../../__tests__/distArtifact';
import * as UiBarrel from '../../index';
import * as DataTableFolder from '../index';

const DATA_TABLE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('INV-252: numbered-pager helpers and chrome stay off the public barrel', () => {
  it('does not runtime-export buildPageItems, isTotalKnown, sibling count, or pager chrome', () => {
    for (const barrel of [DataTableFolder, UiBarrel]) {
      expect('buildPageItems' in barrel).toBe(false);
      expect('isTotalKnown' in barrel).toBe(false);
      expect('DATA_TABLE_PAGINATION_SIBLING_COUNT' in barrel).toBe(false);
      expect('DATA_TABLE_PAGINATION_CHROME' in barrel).toBe(false);
      expect('DATA_TABLE_PAGINATION_PAGES_CHROME' in barrel).toBe(false);
      expect('DATA_TABLE_PAGINATION_ROOT_CHROME' in barrel).toBe(false);
      expect('DataTablePageListItem' in barrel).toBe(false);
    }
    expect(Object.keys(DataTableFolder)).toEqual([
      'DataTable',
      'DATA_TABLE_DEFAULT_ESTIMATE_SIZE',
      'DATA_TABLE_DEFAULT_OVERSCAN',
      'DATA_TABLE_DEFAULT_VIRTUALIZED_MAX_HEIGHT',
      'DATA_TABLE_SELECT_COLUMN_ID',
    ]);
  });

  it('does not re-export helpers from the folder index or package.json', () => {
    const folderIndex = readFileSync(join(DATA_TABLE_DIR, 'index.ts'), 'utf8');
    expect(folderIndex).not.toMatch(/buildPageItems/);
    expect(folderIndex).not.toMatch(/isTotalKnown/);
    expect(folderIndex).not.toMatch(/DATA_TABLE_PAGINATION_SIBLING_COUNT/);
    expect(folderIndex).not.toMatch(/from\s+['"]\.\/chrome['"]/);
    expect(folderIndex).not.toMatch(/from\s+['"]\.\/pagination-controls['"]/);
    const pager = stripComments(
      readFileSync(join(DATA_TABLE_DIR, 'pagination-controls.tsx'), 'utf8')
    );
    expect(pager).toMatch(/from\s+['"]\.\.\/button['"]/);
    const mainTypes = readDistArtifact('index.d.mts');
    expect(mainTypes).not.toMatch(/export\s+.*\bbuildPageItems\b/);
    expect(mainTypes).not.toMatch(/export\s+.*\bisTotalKnown\b/);
    expect(mainTypes).not.toMatch(/DATA_TABLE_PAGINATION_SIBLING_COUNT/);
  });
});
