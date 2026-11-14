/**
 * @vitest-environment jsdom
 *
 * SF-15 · Performance, scalability & stability — INV-34 (1,000 items without
 * virtualization), INV-35 (navigation never recomputes the model), INV-36
 * (modal popover always cleans up the page).
 * Chromium timing probe and real-browser cleanup: searchable-multi-select.sf15.browser.test.tsx.
 * artifacts/005-uikit-requests/sf-15-searchable-multi-select/03-invariants.md
 */
import { render, screen } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SearchableMultiSelect } from '../index';
import { activeOptionLabel, Controlled, pageSnapshot, q, type Country } from './helpers';

afterEach(() => vi.restoreAllMocks());

const setup = () => userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });

const MANY: readonly Country[] = Array.from({ length: 1000 }, (_, i) => ({
  code: `C${i}`,
  name: `Country ${String(i).padStart(4, '0')}`,
}));

describe('INV-34: correct up to 1,000 items without virtualization', () => {
  it('all options mounted; ArrowUp wraps to the last; Enter emits its id; Clear all works', async () => {
    const user = setup();
    const onChange = vi.fn();
    render(<Controlled items={MANY} onChange={onChange} />);
    await user.click(q.trigger());
    expect(q.options()).toHaveLength(1000);
    await user.keyboard('{ArrowUp}');
    expect(activeOptionLabel()).toBe('Country 0999');
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenLastCalledWith(['C999']);
    await user.keyboard('{ArrowDown}');
    expect(activeOptionLabel()).toBe('Country 0000');
    await user.click(q.clear() as HTMLButtonElement);
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('filterItem runs at most once per item per query change', async () => {
    const user = setup();
    const filterItem = vi.fn((c: Country, query: string) => c.name.includes(query));
    render(<Controlled items={MANY} filterItem={filterItem} />);
    await user.click(q.trigger());
    for (const ch of ['0', '9', '9']) {
      filterItem.mockClear();
      await user.type(q.search(), ch);
      expect(filterItem.mock.calls.length).toBeGreaterThan(0);
      expect(filterItem.mock.calls.length).toBeLessThanOrEqual(1000);
    }
    expect(q.labels()).toEqual(MANY.filter((c) => c.name.includes('099')).map((c) => c.name));
  });
});

describe('INV-35: navigation and hover do not recompute the model', () => {
  it('10 ArrowDowns and 5 hovers call no accessor', async () => {
    const user = setup();
    const getItemId = vi.fn((c: Country) => c.code);
    const getItemLabel = vi.fn((c: Country) => c.name);
    const filterItem = vi.fn((c: Country, query: string) => c.name.includes(query));
    const items = MANY.slice(0, 50);
    const selectedIds = ['C3'];
    const onSelectionChange = () => undefined;
    render(
      <SearchableMultiSelect
        aria-label="Countries"
        items={items}
        getItemId={getItemId}
        getItemLabel={getItemLabel}
        filterItem={filterItem}
        selectedIds={selectedIds}
        onSelectionChange={onSelectionChange}
      />
    );
    await user.click(q.trigger());
    await user.type(q.search(), 'Country');
    getItemId.mockClear();
    getItemLabel.mockClear();
    filterItem.mockClear();
    for (let i = 0; i < 10; i += 1) await user.keyboard('{ArrowDown}');
    for (let i = 0; i < 5; i += 1) await user.hover(q.options()[i * 3] as HTMLElement);
    expect(activeOptionLabel()).toBe('Country 0012');
    expect(getItemId).not.toHaveBeenCalled();
    expect(getItemLabel).not.toHaveBeenCalled();
    expect(filterItem).not.toHaveBeenCalled();
  });
});

describe('INV-36: the modal popover always cleans up the page', () => {
  it('50 open/close cycles (Escape and outside pointer alternating) restore the baseline', async () => {
    const user = setup();
    render(
      <>
        <p>Outside</p>
        <Controlled />
      </>
    );
    const baseline = pageSnapshot();
    for (let i = 0; i < 50; i += 1) {
      await user.click(q.trigger());
      expect(q.dialog()).not.toBeNull();
      if (i % 2 === 0) await user.keyboard('{Escape}');
      else await user.click(screen.getByText('Outside'));
      expect(q.dialog()).toBeNull();
    }
    expect(pageSnapshot()).toEqual(baseline);
  });

  it('while open the page IS modified (the probe detects a leak), then restored', async () => {
    const user = setup();
    render(
      <>
        <p>Outside</p>
        <Controlled />
      </>
    );
    const baseline = pageSnapshot();
    await user.click(q.trigger());
    expect(pageSnapshot()).not.toEqual(baseline);
    await user.keyboard('{Escape}');
    expect(pageSnapshot()).toEqual(baseline);
  });

  it('50 mount → open → unmount-while-open cycles restore the baseline and leave no listeners', async () => {
    const user = setup();
    const outside = document.createElement('main');
    outside.textContent = 'page';
    document.body.appendChild(outside);
    const baseline = pageSnapshot();

    const live = new Map<string, Set<EventListenerOrEventListenerObject>>();
    const add = document.addEventListener.bind(document);
    const remove = document.removeEventListener.bind(document);
    vi.spyOn(document, 'addEventListener').mockImplementation((type, listener, options) => {
      if (listener) (live.get(type) ?? live.set(type, new Set()).get(type))?.add(listener);
      add(type, listener, options);
    });
    vi.spyOn(document, 'removeEventListener').mockImplementation((type, listener, options) => {
      if (listener) live.get(type)?.delete(listener);
      remove(type, listener, options);
    });

    for (let i = 0; i < 50; i += 1) {
      const { unmount } = render(<Controlled />);
      await user.click(q.trigger());
      expect(q.dialog()).not.toBeNull();
      unmount();
    }
    // Radix registers some listeners in a timeout; let them settle.
    await new Promise((r) => setTimeout(r, 20));
    vi.restoreAllMocks();
    const leaked = [...live.entries()]
      .filter(([, set]) => set.size > 0)
      .map(([t, s]) => `${t}×${s.size}`);
    expect(leaked).toEqual([]);
    expect(pageSnapshot()).toEqual(baseline);
    outside.remove();
  });
});
