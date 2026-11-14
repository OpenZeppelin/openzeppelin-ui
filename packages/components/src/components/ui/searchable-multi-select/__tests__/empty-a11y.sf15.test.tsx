/**
 * @vitest-environment jsdom
 *
 * SF-15 · Empty state and accessibility (jsdom layer) — INV-37 (empty result),
 * INV-38 (status region), INV-39 (focus stays in the popover), INV-40 (focus
 * returns to the trigger), INV-41 (not by color alone, structural half).
 * Real-browser focus, axe and screenshots: searchable-multi-select.sf15.browser.test.tsx
 * and the prove-it-works proof.
 * artifacts/005-uikit-requests/sf-15-searchable-multi-select/03-invariants.md
 */
import { render, screen, within } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Controlled, q } from './helpers';

afterEach(() => vi.restoreAllMocks());

const setup = () => userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });

describe('INV-37: empty result is shown, announced, and keeps focus (scenario 2)', () => {
  it('"zzz" → custom empty text, hidden listbox still resolvable, no activedescendant, focus kept', async () => {
    const user = setup();
    const onChange = vi.fn();
    render(<Controlled emptyText="No country matches" onChange={onChange} />);
    await user.click(q.trigger());
    await user.type(q.search(), 'zzz');
    const status = within(q.dialog() as HTMLElement).getByRole('status');
    expect(status.textContent).toBe('No country matches');
    const listbox = q.listbox();
    expect(listbox.hidden).toBe(true);
    expect(document.getElementById(q.search().getAttribute('aria-controls') ?? '')).toBe(listbox);
    expect(q.options()).toHaveLength(0);
    expect(q.search().hasAttribute('aria-activedescendant')).toBe(false);
    expect(document.activeElement).toBe(q.search());
    await user.keyboard('{Enter}');
    expect(onChange).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(q.search());
  });

  it('deleting back to a match restores the list and empties the status text', async () => {
    const user = setup();
    render(<Controlled emptyText="No country matches" />);
    await user.click(q.trigger());
    await user.type(q.search(), 'zzz');
    await user.keyboard('{Backspace}{Backspace}');
    expect(q.search().value).toBe('z');
    await user.clear(q.search());
    expect(q.listbox().hidden).toBe(false);
    expect(q.status().textContent).toBe('');
  });

  it('boundary: items = [] shows emptyText with no query', async () => {
    const user = setup();
    render(<Controlled items={[]} emptyText="Nothing to pick" />);
    await user.click(q.trigger());
    expect(q.search().value).toBe('');
    expect(q.status().textContent).toBe('Nothing to pick');
    expect(q.listbox().hidden).toBe(true);
  });

  it('non-empty: listbox visible and status text is ""', async () => {
    const user = setup();
    render(<Controlled />);
    await user.click(q.trigger());
    expect(q.listbox().hidden).toBe(false);
    expect(q.status().textContent).toBe('');
  });
});

describe('INV-38: the status region exists before its text changes', () => {
  it('one polite status, the same element from first open frame to no-match', async () => {
    const user = setup();
    render(<Controlled emptyText="None found" />);
    await user.click(q.trigger());
    const dialog = q.dialog() as HTMLElement;
    const statuses = within(dialog).getAllByRole('status');
    expect(statuses).toHaveLength(1);
    const status = statuses[0] as HTMLElement;
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).toBe('');
    await user.type(q.search(), 'qqq');
    expect(q.status()).toBe(status);
    expect(status.textContent).toBe('None found');
    expect(document.body.textContent?.split('None found')).toHaveLength(2);
  });
});

describe('INV-39: focus stays in the popover, in the search box unless the user tabs', () => {
  it('scripted session: activeElement ∈ {search, Clear all} after every step', async () => {
    const user = setup();
    const { rerender } = render(<Controlled initial={['FR']} />);
    await user.click(q.trigger());
    const inPopover = () =>
      expect([q.search(), q.clear()]).toContain(document.activeElement as HTMLElement);

    const steps: Array<() => Promise<void>> = [
      () => user.type(q.search(), 'g'),
      () => user.keyboard('{ArrowDown}{ArrowUp}'),
      () => user.keyboard('{Enter}'),
      () => user.click(q.options()[1] as HTMLElement),
      () => user.hover(q.options()[0] as HTMLElement),
      () => user.type(q.search(), 'zzz'),
      () => user.clear(q.search()),
      async () => rerender(<Controlled initial={['FR']} items={[]} />),
    ];
    for (const step of steps) {
      await step();
      inPopover();
      expect(document.activeElement).toBe(q.search());
    }
  });

  it('Tab cycles search ↔ Clear all only', async () => {
    const user = setup();
    render(
      <>
        <button type="button">Before</button>
        <Controlled initial={['FR']} />
        <button type="button">After</button>
      </>
    );
    await user.click(q.trigger());
    await user.tab();
    expect(document.activeElement).toBe(q.clear());
    await user.tab();
    expect(document.activeElement).toBe(q.search());
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(q.clear());
  });

  it('boundary: with no selection Tab stays on the search box', async () => {
    const user = setup();
    render(
      <>
        <button type="button">Before</button>
        <Controlled />
        <button type="button">After</button>
      </>
    );
    await user.click(q.trigger());
    await user.tab();
    expect(document.activeElement).toBe(q.search());
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(q.search());
  });

  it('options are never tabbable', async () => {
    const user = setup();
    render(<Controlled />);
    await user.click(q.trigger());
    for (const o of q.options()) expect(o.hasAttribute('tabindex')).toBe(false);
  });
});

describe('INV-40: focus returns to the trigger on close', () => {
  it('Escape → trigger', async () => {
    const user = setup();
    render(<Controlled />);
    await user.click(q.trigger());
    await user.keyboard('{Escape}');
    expect(document.activeElement).toBe(q.trigger());
  });

  it('outside pointer → trigger, never body', async () => {
    const user = setup();
    render(
      <>
        <p>Outside text</p>
        <Controlled />
      </>
    );
    await user.click(q.trigger());
    await user.click(screen.getByText('Outside text'));
    expect(q.dialog()).toBeNull();
    expect(document.activeElement).toBe(q.trigger());
  });

  it('exception: closing because of disabled leaves the (now disabled) trigger unfocusable', async () => {
    const user = setup();
    const { rerender } = render(<Controlled />);
    await user.click(q.trigger());
    rerender(<Controlled disabled />);
    expect(q.dialog()).toBeNull();
    expect(q.trigger().disabled).toBe(true);
  });
});

describe('INV-41: state is not conveyed by color alone (structural half)', () => {
  it('selected = check icon + aria-selected; active = data-active, distinct from selected styling', async () => {
    const user = setup();
    render(<Controlled initial={['FR']} />);
    await user.click(q.trigger());
    await user.keyboard('{ArrowDown}');
    const fr = q.option('France');
    const es = q.option('Spain');
    expect(fr.getAttribute('aria-selected')).toBe('true');
    expect(fr.querySelector('svg')).not.toBeNull();
    expect(fr.hasAttribute('data-active')).toBe(false);
    expect(es.hasAttribute('data-active')).toBe(true);
    expect(es.querySelector('svg')).toBeNull();
    expect(es.className).toContain('data-[active]:bg-accent');
    const frBox = fr.querySelector('[aria-hidden="true"]') as HTMLElement;
    const esBox = es.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(frBox.className).toContain('bg-selected');
    expect(esBox.className).not.toContain('bg-selected');
  });
});
