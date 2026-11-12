/**
 * @vitest-environment jsdom
 *
 * SF-15 · Internal core capabilities locked for SF-17 — INV-21 (grouping),
 * INV-22 (disabled options), INV-23 (core owns the option element), INV-32
 * (single mode), INV-40 (focus return with a custom ref-forwarding trigger).
 * artifacts/005-uikit-requests/sf-15-searchable-multi-select/03-invariants.md
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  activeOptionLabel,
  brokenIdRefs,
  CoreHarness,
  q,
  type Net,
  type OptionState,
} from './helpers';

afterEach(() => vi.restoreAllMocks());

const trigger = () => screen.getByTestId('custom-trigger');

const GROUPED: readonly Net[] = [
  { id: 'a1', name: 'Alpha One', group: 'EVM' },
  { id: 's1', name: 'Sol One', group: 'Solana' },
  { id: 'a2', name: 'Alpha Two', group: 'EVM' },
  { id: 't1', name: 'Tron One', group: 'Tron' },
];

describe('INV-21: grouping order (core)', () => {
  it('groups render in first-item order, labelled by a non-option header', async () => {
    const user = userEvent.setup();
    render(<CoreHarness items={GROUPED} getItemGroup={(n) => n.group ?? ''} />);
    await user.click(trigger());
    const groups = within(q.listbox()).getAllByRole('group');
    expect(groups.map((g) => g.getAttribute('aria-labelledby')).every(Boolean)).toBe(true);
    expect(screen.getByRole('group', { name: 'EVM' })).toBe(groups[0]);
    expect(screen.getByRole('group', { name: 'Solana' })).toBe(groups[1]);
    expect(screen.getByRole('group', { name: 'Tron' })).toBe(groups[2]);
    expect(
      within(groups[0] as HTMLElement)
        .getAllByRole('option')
        .map((o) => o.textContent)
    ).toEqual(['Alpha One', 'Alpha Two']);
    expect(q.options().every((o) => !/^(EVM|Solana|Tron)$/.test(o.textContent ?? ''))).toBe(true);
    expect(brokenIdRefs()).toEqual([]);
  });

  it('ArrowDown order equals DOM option order and never lands on a header', async () => {
    const user = userEvent.setup();
    render(<CoreHarness items={GROUPED} getItemGroup={(n) => n.group ?? ''} />);
    await user.click(trigger());
    const visited = [activeOptionLabel()];
    for (let i = 0; i < 4; i += 1) {
      await user.keyboard('{ArrowDown}');
      visited.push(activeOptionLabel());
    }
    expect(visited).toEqual(['Alpha One', 'Alpha Two', 'Sol One', 'Tron One', 'Alpha One']);
    expect(visited.slice(0, 4)).toEqual(q.labels());
  });

  it('a query that empties a group removes that group', async () => {
    const user = userEvent.setup();
    render(<CoreHarness items={GROUPED} getItemGroup={(n) => n.group ?? ''} />);
    await user.click(trigger());
    await user.type(q.search(), 'alpha');
    expect(within(q.listbox()).getAllByRole('group')).toHaveLength(1);
    expect(screen.queryByRole('group', { name: 'Solana' })).toBeNull();
  });

  it('boundary: without getItemGroup no role="group" is rendered', async () => {
    const user = userEvent.setup();
    render(<CoreHarness items={GROUPED} />);
    await user.click(trigger());
    expect(q.listbox().querySelector('[role="group"]')).toBeNull();
  });
});

describe('INV-22: disabled options are inert (core)', () => {
  const DEDED: readonly Net[] = [
    { id: 'd1', name: 'D1', off: true },
    { id: 'e1', name: 'E1' },
    { id: 'd2', name: 'D2', off: true },
    { id: 'e2', name: 'E2' },
    { id: 'd3', name: 'D3', off: true },
  ];

  it('first enabled is active; arrows skip disabled and wrap', async () => {
    const user = userEvent.setup();
    render(<CoreHarness items={DEDED} />);
    await user.click(trigger());
    expect(activeOptionLabel()).toBe('E1');
    await user.keyboard('{ArrowDown}');
    expect(activeOptionLabel()).toBe('E2');
    await user.keyboard('{ArrowDown}');
    expect(activeOptionLabel()).toBe('E1');
    await user.keyboard('{ArrowUp}');
    expect(activeOptionLabel()).toBe('E2');
  });

  it('click and hover on a disabled option do nothing; it keeps its true aria-selected', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    render(<CoreHarness items={DEDED} initial={['d2']} onActivate={onActivate} />);
    await user.click(trigger());
    const d2 = q.option('D2');
    expect(d2.getAttribute('aria-disabled')).toBe('true');
    expect(d2.getAttribute('aria-selected')).toBe('true');
    expect(q.option('E1').hasAttribute('aria-disabled')).toBe(false);
    await user.hover(d2);
    expect(activeOptionLabel()).toBe('E1');
    await user.click(d2);
    fireEvent.click(q.option('D1'));
    expect(onActivate).not.toHaveBeenCalled();
    expect(activeOptionLabel()).toBe('E1');
    expect(d2.getAttribute('aria-selected')).toBe('true');
  });

  it('failure boundary: all disabled → no active option, arrows and Enter are no-ops', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    render(<CoreHarness items={DEDED.filter((n) => n.off)} onActivate={onActivate} />);
    await user.click(trigger());
    expect(q.search().hasAttribute('aria-activedescendant')).toBe(false);
    await user.keyboard('{ArrowDown}{ArrowUp}{Enter}');
    expect(activeOptionLabel()).toBeNull();
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('items changing while open: a stored index that becomes disabled falls back to first enabled (INV-26)', async () => {
    const user = userEvent.setup();
    const items: Net[] = [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
      { id: 'c', name: 'C' },
    ];
    const { rerender } = render(<CoreHarness items={items} />);
    await user.click(trigger());
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(activeOptionLabel()).toBe('C');
    rerender(<CoreHarness items={items.map((n) => (n.id === 'c' ? { ...n, off: true } : n))} />);
    expect(activeOptionLabel()).toBe('A');
  });
});

describe('INV-23: the core owns the option element (core)', () => {
  it('custom content renders inside the option; ARIA and state stay core-owned', async () => {
    const user = userEvent.setup();
    const seen = new Map<string, OptionState>();
    const renderItemContent = vi.fn((n: Net, state: OptionState) => {
      seen.set(n.id, state);
      return (
        <span>
          <img alt="" src="data:," />
          <button type="button" tabIndex={-1} role="presentation">
            {n.name}
          </button>
        </span>
      );
    });
    const items: Net[] = [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B', off: true },
      { id: 'c', name: 'C' },
    ];
    render(<CoreHarness items={items} renderItemContent={renderItemContent} />);
    await user.click(trigger());
    await user.keyboard('{Enter}{ArrowDown}');

    const options = q.options();
    expect(options).toHaveLength(3);
    for (const [i, option] of options.entries()) {
      const n = items[i] as Net;
      const state = seen.get(n.id) as OptionState;
      expect(option.getAttribute('role')).toBe('option');
      expect(option.id).toBe(`${q.listbox().id}-opt-${i}`);
      expect(option.querySelector('img')).not.toBeNull();
      expect(option.getAttribute('data-slot')).toBe('searchable-multi-select-option');
      expect(option.getAttribute('aria-selected')).toBe(String(state.selected));
      expect(option.getAttribute('aria-disabled') === 'true').toBe(state.disabled);
      expect(option.hasAttribute('data-active')).toBe(state.active);
    }
    expect(seen.get('a')).toEqual({ selected: true, disabled: false, active: false });
    expect(seen.get('b')).toEqual({ selected: false, disabled: true, active: false });
    expect(seen.get('c')).toEqual({ selected: false, disabled: false, active: true });
  });
});

describe('INV-32 / INV-40: single mode closes on pick and refocuses a custom trigger', () => {
  it('Enter activates once, closes, and focus returns to the ref-forwarding custom trigger', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    render(<CoreHarness items={GROUPED} multiple={false} onActivate={onActivate} />);
    await user.click(trigger());
    expect(q.listbox().hasAttribute('aria-multiselectable')).toBe(false);
    expect(q.options()[0]?.querySelector('[aria-hidden="true"]')).toBeNull();
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onActivate.mock.calls[0]?.[0].id).toBe('s1');
    expect(q.dialog()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('a click in single mode closes too', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    render(<CoreHarness items={GROUPED} multiple={false} onActivate={onActivate} />);
    await user.click(trigger());
    await user.click(q.option('Tron One'));
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(q.dialog()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('failure boundary: Enter with no active option only prevents default and stays open', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    render(<CoreHarness items={GROUPED} multiple={false} onActivate={onActivate} />);
    await user.click(trigger());
    await user.type(q.search(), 'zzz');
    expect(fireEvent.keyDown(q.search(), { key: 'Enter' })).toBe(false);
    expect(onActivate).not.toHaveBeenCalled();
    expect(q.dialog()).not.toBeNull();
  });

  it('Escape from a custom trigger session returns focus to it', async () => {
    const user = userEvent.setup();
    render(<CoreHarness items={GROUPED} />);
    await user.click(trigger());
    expect(trigger().getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger().getAttribute('aria-controls')).toBe(q.listbox().id);
    await user.keyboard('{Escape}');
    expect(document.activeElement).toBe(trigger());
  });
});
