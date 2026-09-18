/**
 * @vitest-environment node
 *
 * SF-9 · Package / source boundary — INV-213, INV-219, INV-223, INV-225, INV-226.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import * as UiBarrel from '../../index';
import * as DataTableFolder from '../index';

const DATA_TABLE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

function source(fileName: string): string {
  return readFileSync(join(DATA_TABLE_DIR, fileName), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

describe('INV-213 / INV-219: chrome literals have one internal owner', () => {
  it('does not duplicate pinned visual tokens in renderer source', () => {
    const renderers = `${source('data-table.tsx')}\n${source('data-table-scroller.tsx')}`;
    for (const token of [
      'bg-muted/50',
      'hover:bg-accent/50',
      'data-[state=selected]:bg-accent/30',
    ]) {
      expect(renderers, `INV-213: "${token}" belongs only in chrome.ts`).not.toContain(token);
    }
    expect(
      source('chrome.ts').match(/data-\[state=selected\]:bg-accent\/30/g),
      'INV-219: selected fill has exactly one owner'
    ).toHaveLength(1);
  });
});

describe('INV-223 / INV-225: chrome remains internal without wrapper dependencies', () => {
  it('does not export chrome constants from either public barrel', () => {
    for (const barrel of [DataTableFolder, UiBarrel]) {
      expect('DATA_TABLE_WRAPPER_CHROME' in barrel).toBe(false);
      expect('DATA_TABLE_ROW_CHROME' in barrel).toBe(false);
      expect('DATA_TABLE_CAPTION_CHROME' in barrel).toBe(false);
      expect('DATA_TABLE_DEFAULT_ESTIMATE_SIZE' in barrel).toBe(true);
    }
    expect(source('index.ts')).not.toMatch(/from\s+['"]\.\/chrome['"]/);
  });

  it('imports no Card, Role Manager module, or density implementation', () => {
    const productSource = ['chrome.ts', 'types.ts', 'data-table.tsx', 'data-table-scroller.tsx']
      .map(source)
      .join('\n');
    expect(productSource, 'INV-225: DataTable must not import Card').not.toMatch(
      /from\s+['"][^'"]*card[^'"]*['"]/
    );
    expect(productSource).not.toMatch(/role-manager|tokenization-platform/i);
    expect(productSource).not.toMatch(/from\s+['"][^'"]*density[^'"]*['"]/i);
  });
});

describe('INV-226: visual states are CSS-only', () => {
  it('adds no hover or pointer listeners to the table renderers', () => {
    const renderers = `${source('data-table.tsx')}\n${source('data-table-scroller.tsx')}`;
    expect(renderers).not.toMatch(/\bonMouse(?:Enter|Leave|Move)\b/);
    expect(renderers).not.toMatch(/\bonPointer(?:Enter|Leave|Move|Over|Out)\b/);
  });
});
