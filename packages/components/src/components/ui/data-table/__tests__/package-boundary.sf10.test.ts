/**
 * @vitest-environment node
 *
 * SF-10 · Package/source boundaries — INV-274 … INV-276, INV-280, INV-283, INV-284, INV-298.
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

describe('INV-274 / INV-298: sticky chrome remains an internal implementation detail', () => {
  it('does not add sticky constants or aliases to either public barrel', () => {
    for (const barrel of [DataTableFolder, UiBarrel]) {
      expect('DATA_TABLE_HEADER_CELL_STICKY_CHROME' in barrel).toBe(false);
      expect('DataTableStickyHeader' in barrel).toBe(false);
    }
    expect(source('index.ts')).not.toMatch(/from\s+['"]\.\/chrome['"]/);
  });

  it('keeps the literal sticky token set owned only by chrome.ts', () => {
    expect(source('chrome.ts').match(/sticky top-0 z-20 bg-muted/g)).toHaveLength(1);
    const renderers = `${source('data-table.tsx')}\n${source('data-table-scroller.tsx')}`;
    expect(renderers).not.toContain('sticky top-0 z-20 bg-muted');
  });
});

describe('INV-275 / INV-280 / INV-284: sticky adds no state, focus, or scroll handler', () => {
  it('resolves the prop directly without sticky-keyed hooks or imperative focus', () => {
    const renderers = `${source('data-table.tsx')}\n${source('data-table-scroller.tsx')}`;
    expect(renderers).toMatch(/headerIsSticky\s*=\s*stickyHeader\s*!==\s*false/);
    expect(renderers).not.toMatch(/use(?:State|Reducer)\([^)]*sticky/i);
    expect(renderers).not.toMatch(/\.focus\s*\(/);
    expect(renderers).not.toMatch(/onScroll\s*=/);
    expect(renderers).not.toMatch(/translateY/);
  });
});

describe('INV-276 / INV-283: virtualization measurement does not branch on sticky', () => {
  it('keeps caption+thead ResizeObserver measurement and the existing scroll host', () => {
    const scroller = source('data-table-scroller.tsx');
    const measurementStart = scroller.indexOf('const measure = ()');
    const measurementEnd = scroller.indexOf('}, [resolved.active, nameKind]);', measurementStart);
    const measurement = scroller.slice(measurementStart, measurementEnd);
    expect(measurementStart).toBeGreaterThan(-1);
    expect(measurement).toContain('captionRef.current?.offsetHeight');
    expect(measurement).toContain('theadRef.current?.offsetHeight');
    expect(measurement).toContain('new ResizeObserver(measure)');
    expect(measurement).not.toContain('stickyHeader');
    expect(scroller).toMatch(/const setWrapperNode = useCallback/);
    expect(scroller).toMatch(/getScrollElement.*wrapperRef\.current/s);
    expect(scroller).toContain('scrollPaddingStart: paddingStart');
  });
});
