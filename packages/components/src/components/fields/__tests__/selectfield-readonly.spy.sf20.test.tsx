/**
 * @vitest-environment jsdom
 *
 * 005 SF-20 · SelectField read-only, internal seams (jsdom, module spy).
 * `getReadOnlyState` is wrapped (pass-through) so each SelectField render is counted exactly.
 * INV-7 (the helper gets `undefined` for `readOnly` without the opt-in, the raw value with it)
 * and INV-21 (one switch costs at most two SelectField renders, list open or closed).
 */
import { act, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { getReadOnlyState } from '../utils/readOnlyState';
import {
  EDITABLE_OPTED_IN,
  fillJsdomGaps,
  mountSelect,
  READONLY,
} from './selectfield-readonly.sf20-kit';

vi.mock('../utils/readOnlyState', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/readOnlyState')>();
  return { ...actual, getReadOnlyState: vi.fn(actual.getReadOnlyState) };
});

const spy = vi.mocked(getReadOnlyState);

beforeAll(fillJsdomGaps);
beforeEach(() => spy.mockClear());
afterEach(cleanup);

describe('INV-7: what SelectField passes to getReadOnlyState', () => {
  const RO = [undefined, false, true] as const;
  const MODES = [undefined, 'disabled', 'readonly', 'bogus'] as const;

  it.each(RO.flatMap((r) => MODES.map((m) => [r, m] as const)))(
    'readOnly=%s, readOnlyMode=%s',
    (readOnly, readOnlyMode) => {
      mountSelect({ value: 'beta', readOnly, readOnlyMode });
      expect(spy).toHaveBeenCalled();
      const expectedRO = readOnlyMode === 'readonly' ? readOnly : undefined;
      for (const call of spy.mock.calls) {
        expect(call).toStrictEqual([expectedRO, readOnlyMode]);
      }
      const result = spy.mock.results[spy.mock.results.length - 1];
      expect(result.type).toBe('return');
      if (result.type === 'return') {
        expect(result.value.controllerDisabled).toBe(
          readOnlyMode === 'readonly' ? false : undefined
        );
        expect(result.value.isFocusableReadOnly).toBe(
          readOnly === true && readOnlyMode === 'readonly'
        );
      }
    }
  );
});

describe('INV-21: SelectField renders per switch', () => {
  function rendersFor(fn: () => void): number {
    spy.mockClear();
    fn();
    return spy.mock.calls.length;
  }

  it('list closed: each switch on / off costs at most two SelectField renders', () => {
    const m = mountSelect({ value: 'beta', readOnlyMode: 'readonly' });
    for (const s of [
      READONLY,
      EDITABLE_OPTED_IN,
      READONLY,
      { readOnly: true, readOnlyMode: 'disabled' },
    ]) {
      expect(rendersFor(() => m.rerender(s))).toBeLessThanOrEqual(2);
    }
  });

  it('list open at the switch: the close costs at most two SelectField renders, then nothing more', async () => {
    const m = mountSelect({ value: 'beta', ...EDITABLE_OPTED_IN });
    const user = userEvent.setup();
    act(() => m.trigger().focus());
    await user.keyboard('{Enter}');
    expect(m.listbox()).not.toBeNull();
    expect(rendersFor(() => m.rerender(READONLY))).toBeLessThanOrEqual(2);
    expect(m.listbox()).toBeNull();
    // Nothing keeps rendering afterwards (no effect loop).
    expect(
      rendersFor(() => {
        act(() => undefined);
      })
    ).toBe(0);
  });

  it('sensitivity: the count is per render (a no-op rerender is one render)', () => {
    const m = mountSelect({ value: 'beta', ...READONLY });
    expect(rendersFor(() => m.rerender(READONLY))).toBe(1);
  });
});
