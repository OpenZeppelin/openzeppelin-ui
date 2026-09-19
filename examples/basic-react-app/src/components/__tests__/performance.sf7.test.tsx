/**
 * SF-7 · Performance / stability — DEMO-INV-5, DEMO-INV-7.
 */
import { fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { logger } from '@openzeppelin/ui-utils';

import { expectedUnsortedTokenOrder, renderDemo, SLOT, tokenOrder } from './sf7-helpers';

describe('DEMO-INV-5: section identity survives empty/restore', () => {
  it('reuses the same DataTable wrapper node across clear and restore', () => {
    const { container, getByRole, getAllByRole } = renderDemo();
    const wrap = container.querySelector(SLOT.wrap);
    expect(wrap).not.toBeNull();
    fireEvent.click(getByRole('button', { name: 'Clear rows' }));
    expect(
      container.querySelector(SLOT.wrap),
      'DEMO-INV-5: wrapper must not remount on empty'
    ).toBe(wrap);
    const restoreButtons = getAllByRole('button', { name: 'Restore sample rows' });
    fireEvent.click(restoreButtons[0]);
    expect(
      container.querySelector(SLOT.wrap),
      'DEMO-INV-5: wrapper must not remount on restore'
    ).toBe(wrap);
    expect(tokenOrder(container)).toEqual([...expectedUnsortedTokenOrder()]);
  });
});

describe('DEMO-INV-7: mount/unmount loop does not throw', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mounts and unmounts the demo 50 times without leftover table nodes', () => {
    // jsdom reports clientHeight 0 even with the kit default maxHeight (384), so
    // DataTable's zero-height virtualizer diagnostic fires on every mount.
    vi.spyOn(logger, 'error').mockImplementation(() => {});
    for (let i = 0; i < 50; i += 1) {
      const view = renderDemo();
      expect(view.container.querySelector(SLOT.table)).not.toBeNull();
      view.unmount();
    }
    expect(
      document.querySelector(SLOT.table),
      'DEMO-INV-7: no leaked table after unmount'
    ).toBeNull();
  }, 30_000);
});
