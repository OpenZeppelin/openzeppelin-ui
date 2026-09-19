/**
 * SF-12 · Pure helpers — INV-304, INV-317.
 */
import { describe, expect, it } from 'vitest';

import { defaultSortButtonName } from '../helpers';

describe('INV-304 / INV-317: defaultSortButtonName is the shipped English builder', () => {
  it('pins none / asc / desc strings without an “unsorted” word', () => {
    expect(defaultSortButtonName('Amount', 'none')).toBe('Sort by Amount');
    expect(defaultSortButtonName('Amount', 'asc')).toBe('Sort by Amount, ascending');
    expect(defaultSortButtonName('Amount', 'desc')).toBe('Sort by Amount, descending');
  });

  it('is pure: same inputs yield the same string', () => {
    const first = defaultSortButtonName('Label', 'asc');
    const second = defaultSortButtonName('Label', 'asc');
    expect(first).toBe(second);
    expect(first).toBe('Sort by Label, ascending');
  });
});
