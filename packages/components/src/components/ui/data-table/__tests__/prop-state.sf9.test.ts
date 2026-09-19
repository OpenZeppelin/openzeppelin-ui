/**
 * SF-9 · Prop/state contract — INV-222.
 */
import { describe, expect, it } from 'vitest';

import type { DataTableProps } from '../types';
import { captionTableProps, type TokenRow } from './sf2-fixtures';

const propsWithoutChromeVariant: DataTableProps<TokenRow> = captionTableProps();

const propsWithUnsupportedDensity = {
  ...captionTableProps(),
  // @ts-expect-error INV-222: visual parity is the default, not a density API.
  density: 'compact',
} satisfies DataTableProps<TokenRow>;

describe('INV-222: SF-9 adds no density or variant prop', () => {
  it('keeps the existing prop contract usable without a chrome choice', () => {
    expect(propsWithoutChromeVariant.caption).toBe('Tokenization requests');
    expect('density' in propsWithoutChromeVariant).toBe(false);
    expect('variant' in propsWithoutChromeVariant).toBe(false);
    expect(propsWithUnsupportedDensity.density).toBe('compact');
  });
});
