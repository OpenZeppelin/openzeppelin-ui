import { describe, expect, it } from 'vitest';

import { parseFamilyValues } from '../lib/parseFamilyValues';

describe('init family parsing', () => {
  it('deduplicates repeated family flags while preserving order', () => {
    expect(parseFamilyValues(['ui', 'adapters', 'ui'])).toEqual(['ui', 'adapters']);
  });
});
