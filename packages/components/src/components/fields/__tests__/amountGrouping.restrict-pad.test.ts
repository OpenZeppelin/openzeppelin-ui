/**
 * Pure helpers for the grouped exact opt-ins: `isAllowedRestrictedAmountText` (restrictInput
 * gate) and `groupPaddedAmountText` (padDecimals unfocused display). Happy / boundary /
 * failure for each. No DOM.
 */
import { describe, expect, it } from 'vitest';

import {
  groupAmountText,
  groupPaddedAmountText,
  isAllowedRestrictedAmountText,
} from '../utils/amountGrouping';

describe('isAllowedRestrictedAmountText: empty and valid grammar pass', () => {
  it('happy: empty string is always allowed', () => {
    expect(isAllowedRestrictedAmountText('', 2)).toBe(true);
  });

  it('happy: plain and grouped amounts within decimals pass', () => {
    expect(isAllowedRestrictedAmountText('123000', 2)).toBe(true);
    expect(isAllowedRestrictedAmountText('123000.5', 2)).toBe(true);
    expect(isAllowedRestrictedAmountText('123000.50', 2)).toBe(true);
    expect(isAllowedRestrictedAmountText('123,000.50', 2)).toBe(true);
    expect(isAllowedRestrictedAmountText('-12.3', 2)).toBe(true);
  });

  it('boundary: fraction length equal to decimals still passes', () => {
    expect(isAllowedRestrictedAmountText('1.23', 2)).toBe(true);
    expect(isAllowedRestrictedAmountText('1.230', 3)).toBe(true);
  });

  it('boundary: misconfigured decimals only enforces grammar', () => {
    expect(isAllowedRestrictedAmountText('1.23456', Number.NaN)).toBe(true);
    expect(isAllowedRestrictedAmountText('1.23456', -1)).toBe(true);
    expect(isAllowedRestrictedAmountText('1.23456', 1.5)).toBe(true);
    expect(isAllowedRestrictedAmountText('abc', Number.NaN)).toBe(false);
  });
});

describe('isAllowedRestrictedAmountText: letters, separators, excess decimals refused', () => {
  it('failure: letters and scientific notation are refused', () => {
    expect(isAllowedRestrictedAmountText('12a', 2)).toBe(false);
    expect(isAllowedRestrictedAmountText('a', 2)).toBe(false);
    expect(isAllowedRestrictedAmountText('1e18', 2)).toBe(false);
  });

  it('failure: a second decimal separator is refused', () => {
    expect(isAllowedRestrictedAmountText('1.2.3', 2)).toBe(false);
    expect(isAllowedRestrictedAmountText('12..3', 2)).toBe(false);
  });

  it('failure: more fraction digits than decimals is refused', () => {
    expect(isAllowedRestrictedAmountText('1.234', 2)).toBe(false);
    expect(isAllowedRestrictedAmountText('123,000.001', 2)).toBe(false);
  });

  it('failure: incomplete grammar fragments are refused', () => {
    expect(isAllowedRestrictedAmountText('-', 2)).toBe(false);
    expect(isAllowedRestrictedAmountText('.', 2)).toBe(false);
    expect(isAllowedRestrictedAmountText('-.', 2)).toBe(false);
  });
});

describe('groupPaddedAmountText: pads only valid plain amounts', () => {
  it('happy: pads a plain integer to decimals places then groups', () => {
    expect(groupPaddedAmountText('123000', 2)).toBe('123,000.00');
    expect(groupPaddedAmountText('123000.5', 2)).toBe('123,000.50');
    expect(groupPaddedAmountText('1234', 2)).toBe('1,234.00');
  });

  it('boundary: decimals 0 strips a trailing empty fraction and never invents a point', () => {
    expect(groupPaddedAmountText('123000', 0)).toBe('123,000');
    expect(groupPaddedAmountText('123000.', 0)).toBe('123,000');
    expect(groupPaddedAmountText('5.', 0)).toBe('5');
  });

  it('boundary: already at decimals length is unchanged aside from grouping', () => {
    expect(groupPaddedAmountText('123000.50', 2)).toBe('123,000.50');
  });

  it('failure: over-decimal plain text is grouped without padding so the error stays visible', () => {
    expect(groupPaddedAmountText('123000.456', 2)).toBe(groupAmountText('123000.456'));
    expect(groupPaddedAmountText('123000.456', 2)).toBe('123,000.456');
  });

  it('failure: non-plain or unusable decimals leave the text alone (or group when possible)', () => {
    expect(groupPaddedAmountText('1e18', 2)).toBe('1e18');
    expect(groupPaddedAmountText('abc', 2)).toBe('abc');
    expect(groupPaddedAmountText('123000', Number.NaN)).toBe(groupAmountText('123000'));
    expect(groupPaddedAmountText('123000', -1)).toBe(groupAmountText('123000'));
  });
});
