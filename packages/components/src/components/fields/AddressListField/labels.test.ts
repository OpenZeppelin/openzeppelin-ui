import { describe, expect, it } from 'vitest';

import { DEFAULT_ADDRESS_LIST_FIELD_LABELS, formatAddressBulkSummary } from './labels';

const validA = 'C' + 'A'.repeat(55);
const validB = 'C' + 'B'.repeat(55);

describe('formatAddressBulkSummary', () => {
  it('summarizes mixed bulk add outcomes', () => {
    const summary = formatAddressBulkSummary(
      {
        accepted: [validA],
        invalid: ['bad'],
        alreadyListed: [validB],
        duplicatesInInput: [],
      },
      1,
      DEFAULT_ADDRESS_LIST_FIELD_LABELS
    );
    expect(summary).toBe('Added 1 address. 1 invalid format. 1 already listed.');
  });

  it('returns null when there is nothing to report', () => {
    const summary = formatAddressBulkSummary(
      {
        accepted: [validA],
        invalid: [],
        alreadyListed: [],
        duplicatesInInput: [],
      },
      0,
      DEFAULT_ADDRESS_LIST_FIELD_LABELS
    );
    expect(summary).toBeNull();
  });
});
