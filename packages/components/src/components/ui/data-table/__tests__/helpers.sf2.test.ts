/**
 * SF-2 · Pure helpers — INV-31, INV-32, INV-38, INV-59.
 */
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';

import {
  alignClass,
  headerNamesItself,
  isNonblank,
  resolveAlign,
  resolveColumnName,
} from '../helpers';
import type { DataTableColumn } from '../types';

type Row = { id: string };

describe('INV-38: isNonblank', () => {
  it('accepts strings with a non-whitespace character', () => {
    expect(isNonblank('Amount'), 'INV-38: visible header text is non-blank').toBe(true);
    expect(isNonblank(' a '), 'INV-38: padded text is non-blank').toBe(true);
  });

  it('rejects blank strings and non-strings', () => {
    expect(isNonblank(''), 'INV-38: empty string is blank').toBe(false);
    expect(isNonblank('  '), 'INV-38: whitespace is blank').toBe(false);
    expect(isNonblank(0), 'INV-38: number is not a name string').toBe(false);
    expect(isNonblank(true), 'INV-38: boolean is not a name string').toBe(false);
    expect(isNonblank(null), 'INV-38: null is not a name string').toBe(false);
    expect(isNonblank(undefined), 'INV-38: undefined is not a name string').toBe(false);
  });
});

describe('INV-31: headerNamesItself and resolveColumnName matrix', () => {
  const checkbox = createElement('span', { 'aria-label': 'Select all' });

  it.each([
    ['Amount', undefined, true, 'Amount'],
    ['', 'Select', false, 'Select'],
    ['  ', 'Select', false, 'Select'],
    [0, 'Zero', false, 'Zero'],
    [true, 'Flag', false, 'Flag'],
    [null, 'Empty', false, 'Empty'],
    [checkbox, 'Select', false, 'Select'],
    [checkbox, undefined, false, 'select'],
    [checkbox, '  ', false, 'select'],
    ['', undefined, false, 'select'],
  ])('header=%j headerLabel=%j → self=%s name=%s', (header, headerLabel, namesItself, name) => {
    const column = {
      id: 'select',
      header,
      headerLabel,
      cell: () => null,
    } as DataTableColumn<Row>;

    expect(
      headerNamesItself(column),
      'INV-31: aria-label on th only when header does not name itself'
    ).toBe(namesItself);
    expect(resolveColumnName(column), 'INV-31 / INV-25 name fallback').toBe(name);
  });
});

describe('INV-32 / INV-59: resolveAlign and alignClass', () => {
  it('maps start, end, and omitted to logical tokens', () => {
    expect(resolveAlign('start')).toBe('start');
    expect(resolveAlign('end')).toBe('end');
    expect(resolveAlign(undefined), 'INV-32: omitted align is start').toBe('start');
    expect(alignClass('start')).toBe('text-start');
    expect(alignClass('end')).toBe('text-end');
    expect(alignClass(undefined)).toBe('text-start');
  });

  it('never returns physical left/right classes', () => {
    expect(alignClass('start')).not.toBe('text-left');
    expect(alignClass('end')).not.toBe('text-right');
    expect(alignClass(undefined)).not.toMatch(/text-left|text-right/);
  });
});
