import { describe, expect, it } from 'vitest';

import { parseFamilyValues } from './use';

describe('parseFamilyValues', () => {
  it('deduplicates repeated family flags while preserving order', () => {
    expect(parseFamilyValues(['ui', 'adapters', 'ui', 'adapters'])).toEqual(['ui', 'adapters']);
  });

  it('rejects unsupported family values', () => {
    expect(() => parseFamilyValues(['unknown'])).toThrow(/unsupported family/i);
  });
});
