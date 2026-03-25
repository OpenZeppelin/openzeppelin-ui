import { describe, expect, it } from 'vitest';

import { parseFamilyValues } from '../lib/parseFamilyValues';

describe('parseFamilyValues', () => {
  it('deduplicates repeated family flags while preserving order', () => {
    expect(parseFamilyValues(['ui', 'adapters', 'ui', 'adapters'])).toEqual(['ui', 'adapters']);
  });

  it('rejects unsupported family values', () => {
    expect(() => parseFamilyValues(['unknown'])).toThrow(/unsupported family/i);
  });

  it('rejects inherited object keys that are not real family names', () => {
    expect(() => parseFamilyValues(['toString'])).toThrow(/unsupported family/i);
    expect(() => parseFamilyValues(['__proto__'])).toThrow(/unsupported family/i);
  });
});
