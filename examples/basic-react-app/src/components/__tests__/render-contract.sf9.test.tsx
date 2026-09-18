/**
 * SF-9 · Example-app visual parity — INV-231.
 */
import { describe, expect, it } from 'vitest';

import { primaryWrap, renderDemo, SLOT } from './sf7-helpers';

describe('INV-231: demo proves the Role Manager-shaped default contract', () => {
  it('uses kit card chrome and visually hidden names on every strategy', () => {
    const { container } = renderDemo();
    const wraps = [...container.querySelectorAll(SLOT.wrap)];
    expect(
      wraps,
      'INV-231: standard, selectable, virtualized, paginated, and infinite tables'
    ).toHaveLength(5);
    for (const wrap of wraps) {
      expect(wrap.className).toContain('rounded-xl');
      expect(wrap.className).toContain('border');
      expect(wrap.className).toContain('bg-card');
      expect(wrap.querySelector(SLOT.caption)?.className).toContain('sr-only');
    }
  });

  it('uses five dense columns including an accessible trailing text action', () => {
    const { container } = renderDemo();
    for (const wrap of container.querySelectorAll(SLOT.wrap)) {
      const selectionColumnCount =
        wrap.querySelector(SLOT.caption)?.textContent === 'Accounts (selectable)' ? 1 : 0;
      expect(
        wrap.querySelectorAll(SLOT.headerCell),
        'INV-231: every strategy reuses the holdings recipe'
      ).toHaveLength(5 + selectionColumnCount);
      const actionHeader = wrap.querySelector(
        `${SLOT.headerCell}[data-column-id="actions"][aria-label="Actions"]`
      );
      expect(actionHeader, 'INV-231: empty visible action header remains named').not.toBeNull();
    }
    const primaryAction = primaryWrap(container).querySelector(
      `${SLOT.cell}[data-column-id="actions"] button`
    );
    expect(primaryAction?.textContent).toBe('Edit Roles');
    expect(primaryAction?.getAttribute('data-slot')).toBe('button');
  });

  it('keeps application search and filter chrome outside the kit table demo', () => {
    const { container } = renderDemo();
    for (const wrap of container.querySelectorAll(SLOT.wrap)) {
      expect(wrap.querySelector('input[type="search"]')).toBeNull();
      expect(wrap.querySelector('[data-slot="select-trigger"]')).toBeNull();
    }
  });
});
