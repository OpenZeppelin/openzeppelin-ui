/**
 * SF-6 · DOM-free ARIA + request-more seams — INV-144*, INV-151, INV-160, INV-171, INV-175.
 */
import { describe, expect, it } from 'vitest';

import {
  ariaRowCount,
  DATA_TABLE_INFINITE_SENTINEL_KEY,
  DATA_TABLE_SHORT_PAGE_EPSILON_PX,
  isShortPage,
  isVerticalScrollport,
  resolveAriaRowCount,
  shouldRequestMoreFromVirtualRange,
} from '../virtualization';

describe('INV-171 / INV-144: resolveAriaRowCount mode table', () => {
  it.each([
    {
      name: 'infinite hasMore unvirtualized → -1',
      virtualizedActive: false,
      infiniteHasMore: true,
      bodyRowCount: 20,
      expected: -1,
    },
    {
      name: 'infinite hasMore virtualized → -1 (not 1+n+1)',
      virtualizedActive: true,
      infiniteHasMore: true,
      bodyRowCount: 20,
      expected: -1,
    },
    {
      name: 'finite virtualized → 1+n',
      virtualizedActive: true,
      infiniteHasMore: false,
      bodyRowCount: 200,
      expected: 201,
    },
    {
      name: 'finite virtualized server-page-sized body → 1+n not totalCount',
      virtualizedActive: true,
      infiniteHasMore: false,
      bodyRowCount: 100,
      expected: 101,
    },
    {
      name: 'P1 omit',
      virtualizedActive: false,
      infiniteHasMore: false,
      bodyRowCount: 20,
      expected: undefined,
    },
    {
      name: 'exhausted unvirtualized feed omits',
      virtualizedActive: false,
      infiniteHasMore: false,
      bodyRowCount: 0,
      expected: undefined,
    },
    {
      name: 'exhausted virtualized feed → 1+n',
      virtualizedActive: true,
      infiniteHasMore: false,
      bodyRowCount: 40,
      expected: 41,
    },
  ])('$name', ({ virtualizedActive, infiniteHasMore, bodyRowCount, expected }) => {
    expect(
      resolveAriaRowCount({ virtualizedActive, infiniteHasMore, bodyRowCount }),
      'INV-171: sentinel is never added to APG rowcount'
    ).toBe(expected);
  });

  it('keeps the finite ariaRowCount helper (SF-4 INV-144 lock)', () => {
    expect(ariaRowCount(0), 'INV-144: empty body still counts the header').toBe(1);
    expect(ariaRowCount(10)).toBe(11);
    expect(ariaRowCount(200)).toBe(201);
  });
});

describe('INV-160: shouldRequestMoreFromVirtualRange (last data index in window)', () => {
  it('fires when the last virtual index is the last data row or the sentinel', () => {
    expect(shouldRequestMoreFromVirtualRange({ lastVirtualIndex: 19, bodyRowCount: 20 })).toBe(
      true
    );
    expect(
      shouldRequestMoreFromVirtualRange({ lastVirtualIndex: 20, bodyRowCount: 20 }),
      'INV-160: sentinel index is past last data and still eligible'
    ).toBe(true);
  });

  it('does not fire mid-window, on empty body, or with a missing last index', () => {
    expect(shouldRequestMoreFromVirtualRange({ lastVirtualIndex: 18, bodyRowCount: 20 })).toBe(
      false
    );
    expect(
      shouldRequestMoreFromVirtualRange({ lastVirtualIndex: 0, bodyRowCount: 0 }),
      'INV-151 / INV-160: empty body uses the short-page clause, not this helper'
    ).toBe(false);
    expect(
      shouldRequestMoreFromVirtualRange({ lastVirtualIndex: undefined, bodyRowCount: 20 })
    ).toBe(false);
  });
});

describe('INV-160: short-page ε and scrollport root choice', () => {
  it('pins ε to 1px', () => {
    expect(DATA_TABLE_SHORT_PAGE_EPSILON_PX).toBe(1);
  });

  it('treats positive equal heights and a 1px remainder as a short page', () => {
    expect(isShortPage(384, 384)).toBe(true);
    expect(isShortPage(385, 384)).toBe(true);
    expect(isShortPage(386, 384)).toBe(false);
    expect(isShortPage(0, 0), 'jsdom zero layout is not a bounded short page').toBe(false);
  });

  it('uses the wrapper as IO root only when it is a vertical scrollport', () => {
    expect(isVerticalScrollport(386, 384)).toBe(true);
    expect(isVerticalScrollport(385, 384)).toBe(false);
    expect(isVerticalScrollport(0, 384)).toBe(false);
  });
});

describe('INV-150 / INV-175: sentinel key is the internal identity', () => {
  it('pins the constant used by getItemKey and data-row-key', () => {
    expect(DATA_TABLE_INFINITE_SENTINEL_KEY).toBe('__data-table-infinite-sentinel');
  });
});
