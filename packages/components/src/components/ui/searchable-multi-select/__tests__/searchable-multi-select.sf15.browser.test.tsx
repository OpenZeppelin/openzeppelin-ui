/**
 * SF-15 · Chromium verification — INV-29 (real pointer keeps focus), INV-33 +
 * INV-42 + Design OQ-2 (inside a kit Dialog: Escape, focus trap, list scroll),
 * INV-34 (timing probe, recorded not gated), INV-36 (real-browser cleanup),
 * INV-39 (real Tab trap), INV-42 (axe in every reachable state).
 * Opt-in via `pnpm test:browser`. Not part of default jsdom `pnpm test`.
 * artifacts/005-uikit-requests/sf-15-searchable-multi-select/03-invariants.md
 */
import { fireEvent, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import * as React from 'react';

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../dialog';
import { SearchableMultiSelect } from '../index';
import {
  activeOptionLabel,
  Controlled,
  CoreHarness,
  countryId,
  countryLabel,
  pageSnapshot,
  q,
  type Country,
  type Net,
} from './helpers';

/** The kit CSS is not loaded here; give the listbox its real scroll box so scrolling is observable. */
function listboxScrollStyle(): () => void {
  const style = document.createElement('style');
  style.textContent =
    '[data-slot="searchable-multi-select-listbox"]{max-height:300px;overflow-y:auto}' +
    '[data-slot="searchable-multi-select-option"]{display:flex;height:32px}';
  document.head.appendChild(style);
  return () => style.remove();
}

async function axeViolations(): Promise<string[]> {
  const results = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  });
  return results.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`
  );
}

const MANY: readonly Country[] = Array.from({ length: 1000 }, (_, i) => ({
  code: `C${i}`,
  name: `Country ${String(i).padStart(4, '0')}`,
}));

let cleanupStyle: (() => void) | undefined;
afterEach(() => {
  cleanupStyle?.();
  cleanupStyle = undefined;
});

describe('INV-29: a real mouse click keeps focus in the search box', () => {
  it('click toggles once and focus never leaves the search box', async () => {
    const changes: string[][] = [];
    render(<Controlled onChange={(ids) => changes.push(ids)} />);
    await userEvent.click(q.trigger());
    expect(document.activeElement).toBe(q.search());
    await userEvent.click(q.option('Germany'));
    expect(changes).toEqual([['DE']]);
    expect(document.activeElement).toBe(q.search());
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(changes.at(-1)).toEqual(['DE', 'IT']);
  });
});

describe('INV-39: real Tab stays inside the popover', () => {
  it('Tab cycles search ↔ Clear all; never reaches the page', async () => {
    render(
      <>
        <button type="button">Before</button>
        <Controlled initial={['FR']} />
        <button type="button">After</button>
      </>
    );
    await userEvent.click(q.trigger());
    await userEvent.tab();
    expect(document.activeElement).toBe(q.clear());
    await userEvent.tab();
    expect(document.activeElement).toBe(q.search());
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(q.clear());
    await userEvent.keyboard('{Enter}');
    expect(document.activeElement).toBe(q.search());
    expect(q.dialog()).not.toBeNull();
  });
});

describe('INV-36: real-browser cleanup', () => {
  it('open/close cycles and unmount-while-open leave the page as it was', async () => {
    const { unmount } = render(
      <>
        <p>Outside</p>
        <Controlled />
      </>
    );
    const baseline = pageSnapshot();
    for (let i = 0; i < 10; i += 1) {
      await userEvent.click(q.trigger());
      if (i % 2 === 0) await userEvent.keyboard('{Escape}');
      // body has pointer-events:none while the modal popover is open; a real pointer still
      // lands on the page, so skip Playwright's actionability check.
      else await userEvent.click(screen.getByText('Outside'), { force: true });
    }
    expect(pageSnapshot()).toEqual(baseline);
    expect(getComputedStyle(document.body).pointerEvents).not.toBe('none');

    await userEvent.click(q.trigger());
    expect(getComputedStyle(document.body).pointerEvents).toBe('none');
    unmount();
    expect(document.body.style.pointerEvents).toBe('');
    expect(document.querySelectorAll('[data-aria-hidden]')).toHaveLength(0);
    expect(document.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0);
  });
});

describe('INV-34: Chromium timing probe (recorded, not a gate)', () => {
  /** In-page cost of one synchronous React update. */
  const timeSync = (fn: () => void): number => {
    const t = performance.now();
    fn();
    return performance.now() - t;
  };
  // fireEvent wraps act(), so each update is rendered and committed before it returns.
  const typeChar = (input: HTMLInputElement, value: string): void => {
    fireEvent.change(input, { target: { value } });
  };
  const keyDown = (el: HTMLElement, key: string): void => {
    fireEvent.keyDown(el, { key });
  };

  it.for([250, 1000])(
    '%i items: open, keystroke and ArrowDown timings',
    async (n, { annotate }) => {
      const items = MANY.slice(0, n);
      render(<Controlled items={items} />);
      const t0 = performance.now();
      await userEvent.click(q.trigger());
      const openE2e = performance.now() - t0;
      const search = q.search();
      const keystroke = ['1', '12', '1', ''].map((v) => timeSync(() => typeChar(search, v)));
      const arrow = Array.from({ length: 5 }, () => timeSync(() => keyDown(search, 'ArrowDown')));
      const max = (xs: number[]) => Math.max(...xs).toFixed(1);
      await annotate(
        `[SF-15 timing] n=${n} open(e2e incl. Playwright RPC)=${openE2e.toFixed(1)}ms ` +
          `keystroke(in-page, max of 4)=${max(keystroke)}ms arrow(in-page, max of 5)=${max(arrow)}ms`
      );
      expect(search.value).toBe('');
      expect(activeOptionLabel()).toBe(items[5]?.name); // five ArrowDowns from the first
      keyDown(search, 'ArrowUp');
      expect(activeOptionLabel()).toBe(items[4]?.name);
      expect(q.options()).toHaveLength(n);
    }
  );
});

describe('INV-42: zero axe violations in every reachable state', () => {
  it('closed empty, closed with a selection, open, after ArrowDown, empty result', async () => {
    const { rerender } = render(<Controlled />);
    expect(await axeViolations()).toEqual([]);
    rerender(<Controlled key="sel" initial={['FR', 'ES']} />);
    expect(await axeViolations()).toEqual([]);
    await userEvent.click(q.trigger());
    expect(await axeViolations()).toEqual([]);
    await userEvent.keyboard('{ArrowDown}');
    expect(await axeViolations()).toEqual([]);
    await userEvent.type(q.search(), 'zzz');
    expect(await axeViolations()).toEqual([]);
  });

  it('open with groups and disabled options (core)', async () => {
    const items: Net[] = [
      { id: 'a', name: 'Alpha', group: 'EVM' },
      { id: 'b', name: 'Beta', group: 'Solana', off: true },
      { id: 'c', name: 'Gamma', group: 'EVM' },
    ];
    render(<CoreHarness items={items} getItemGroup={(n) => n.group ?? ''} initial={['b']} />);
    await userEvent.click(screen.getByTestId('custom-trigger'));
    expect(await axeViolations()).toEqual([]);
  });
});

describe('S1 in Chromium: filter, keyboard-toggle two, custom count, selected states', () => {
  it('countries with custom copy', async () => {
    render(
      <Controlled
        formatSelectedCount={(n, t) => (n === t ? 'All countries' : `${n} countries allowed`)}
      />
    );
    await userEvent.click(q.trigger());
    await userEvent.type(q.search(), 'g');
    expect(q.labels()).toEqual(['Georgia', 'Georgia', 'Germany']);
    await userEvent.keyboard('{Enter}{ArrowDown}{ArrowDown}{Enter}');
    expect(screen.getByTestId('readout').textContent).toBe('GE,DE');
    expect(q.selectedFlags()).toEqual(['true', 'false', 'true']);
    expect(q.trigger().textContent).toBe('2 countries allowed');
  });
});

function InDialog(): React.ReactElement {
  const [open, setOpen] = React.useState(true);
  const [ids, setIds] = React.useState<string[]>([]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogTitle>Add alias</DialogTitle>
        <DialogDescription>Pick countries</DialogDescription>
        <SearchableMultiSelect<Country>
          aria-label="Countries"
          items={MANY.slice(0, 60)}
          getItemId={countryId}
          getItemLabel={countryLabel}
          selectedIds={ids}
          onSelectionChange={setIds}
        />
        <output data-testid="dialog-readout">{ids.join(',')}</output>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Fixed by SF-32 (2026-11-12). These three tests were pinned with `it.fails` while
 * @radix-ui/react-dialog and react-popover resolved different copies of
 * react-focus-scope / react-dismissable-layer / react-focus-guards. Two copies keep two
 * module-level layer and focus stacks that never coordinate, which caused:
 *   (a) the Dialog's focus trap is never paused → the search box can't hold focus (INV-39);
 *   (b) both layers treat Escape as theirs → one Escape closes popover AND Dialog (INV-33);
 *   (c) the popover's layer records the Dialog's `pointer-events: none` as the body's
 *       original value and restores it → the page stays frozen after both close (INV-36).
 * SF-32 moved every kit Radix layering primitive to the popover's release, and
 * src/__tests__/radix-layering.sf32.test.ts fails if a second copy comes back.
 * Evidence: artifacts/005-uikit-requests/sf-15-searchable-multi-select/proof/dialog-*-probe.*
 */
describe('Inside a kit Dialog (Design OQ-2)', () => {
  // A leaked `pointer-events: none` (defect c) would make every later click time out.
  afterEach(() => {
    document.body.style.pointerEvents = '';
  });

  it('(a) INV-39: opening puts focus in the search box and the keyboard selects', async () => {
    render(<InDialog />);
    await userEvent.click(q.trigger());
    expect(document.activeElement).toBe(q.search());
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(screen.getByTestId('dialog-readout').textContent).toBe('C1');
    expect(document.activeElement).toBe(q.search());
  });

  it('(b) INV-33: the first Escape closes only the popover; the second closes the dialog', async () => {
    render(<InDialog />);
    await userEvent.click(q.trigger());
    await userEvent.keyboard('{Escape}');
    expect(q.dialog()).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Add alias' })).toBeTruthy();
    expect(document.activeElement).toBe(q.trigger());
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Add alias' })).toBeNull();
  });

  it('(c) INV-36: after the popover and the dialog close, the page takes pointer events again', async () => {
    render(<InDialog />);
    await userEvent.click(q.trigger());
    await userEvent.keyboard('{Escape}');
    if (screen.queryByRole('dialog', { name: 'Add alias' })) await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Add alias' })).toBeNull();
    expect(document.body.style.pointerEvents).toBe('');
  });

  it('wheel scrolls the list (the Dialog scroll lock does not swallow it)', async () => {
    cleanupStyle = listboxScrollStyle();
    render(<InDialog />);
    await userEvent.click(q.trigger());
    const listbox = q.listbox();
    expect(listbox.scrollHeight).toBeGreaterThan(listbox.clientHeight);
    await userEvent.wheel(listbox, { delta: { y: 300 } });
    await expect.poll(() => listbox.scrollTop).toBeGreaterThan(0);
  });

  it('INV-42: axe is clean with the popover open inside the dialog', async () => {
    render(<InDialog />);
    await userEvent.click(q.trigger());
    expect(q.dialog()).not.toBeNull();
    expect(await axeViolations()).toEqual([]);
  });
});
