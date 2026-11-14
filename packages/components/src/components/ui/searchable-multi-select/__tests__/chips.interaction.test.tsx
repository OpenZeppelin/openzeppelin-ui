/**
 * Chips mode interaction (jsdom): what a removal emits, that read-only and disabled can't
 * remove, where focus goes after a removal the consumer applies, refuses or delays, the
 * announcement, the open popover, tab order, lifecycle and two instances on one page.
 * The real-pointer, real-focus and first-frame checks are in the Chromium suite.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as React from 'react';

import { SearchableMultiSelect } from '../index';
import { CHIP_SLOT, chips, Consumer, newConsumer, type Policy } from './chips.harness';
import { Controlled, COUNTRIES, countryId, countryLabel, q, type Country } from './helpers';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const focusedLabel = (): string | null =>
  document.activeElement?.getAttribute('aria-label') ?? null;

type Way = 'click' | 'Enter' | 'Space';

async function activate(user: ReturnType<typeof userEvent.setup>, button: HTMLElement, way: Way) {
  if (way === 'click') {
    await user.click(button);
    return;
  }
  act(() => button.focus());
  await user.keyboard(way === 'Enter' ? '{Enter}' : ' ');
}

function mountSpy(initial: readonly string[], props: object = {}, policy: Policy = 'apply') {
  const handle = newConsumer();
  const onOpenChange = vi.fn();
  const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
  render(
    <form onSubmit={onSubmit}>
      <Consumer
        handle={handle}
        initial={initial}
        policy={policy}
        onOpenChange={onOpenChange}
        {...props}
      />
    </form>
  );
  return { handle, onOpenChange, onSubmit };
}

describe('a removal emits the selection without that id, once', () => {
  it.each<Way>(['click', 'Enter', 'Space'])(
    'by %s: one emit, stale ids kept in place, no popover, no form submit',
    async (way) => {
      const user = userEvent.setup();
      const { handle, onOpenChange, onSubmit } = mountSpy(['FR', 'XX', 'ES', 'DE']);
      await activate(user, chips.remove('Spain'), way);
      expect(handle.emits).toEqual([['FR', 'XX', 'DE']]);
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(onSubmit).not.toHaveBeenCalled();
      expect(chips.trigger().getAttribute('aria-expanded')).toBe('false');
      expect(chips.labels()).toEqual(['France', 'Germany']);
    }
  );

  it('boundary: a repeated id goes entirely, as unpicking it in the list does', async () => {
    const user = userEvent.setup();
    const { handle } = mountSpy(['FR', 'ES', 'FR']);
    await user.click(chips.remove('France'));
    expect(handle.emits).toEqual([['ES']]);
  });

  it('boundary: removing the only chip emits an empty selection', async () => {
    const user = userEvent.setup();
    const { handle } = mountSpy(['IT']);
    await user.click(chips.remove('Italy'));
    expect(handle.emits).toEqual([[]]);
  });

  it.each<Policy>(['ignore', 'rerender-same'])(
    'failure: a consumer that does not apply it (%s) gets no second emit',
    async (policy) => {
      const user = userEvent.setup();
      const { handle } = mountSpy(['FR', 'ES'], {}, policy);
      await user.click(chips.remove('Spain'));
      act(() => handle.churn());
      expect(handle.emits).toEqual([['FR']]);
    }
  );

  it('render and effects never emit on their own (mount, rerender, StrictMode)', () => {
    const onSelectionChange = vi.fn();
    const props = {
      'aria-label': 'Countries',
      showSelected: 'chips' as const,
      items: COUNTRIES,
      getItemId: countryId,
      getItemLabel: countryLabel,
      onSelectionChange,
    };
    const { rerender } = render(
      <React.StrictMode>
        <SearchableMultiSelect {...props} selectedIds={['ES', 'XX']} />
      </React.StrictMode>
    );
    rerender(
      <React.StrictMode>
        <SearchableMultiSelect {...props} selectedIds={['FR']} />
      </React.StrictMode>
    );
    rerender(
      <React.StrictMode>
        <SearchableMultiSelect {...props} selectedIds={[]} showSelected="count" />
      </React.StrictMode>
    );
    expect(onSelectionChange).not.toHaveBeenCalled();
  });
});

describe('read-only and disabled cannot remove anything', () => {
  it.each([
    ['read-only', { readOnly: true }],
    ['disabled', { disabled: true }],
    ['both', { readOnly: true, disabled: true }],
  ] as const)('%s: clicks and keys anywhere on the chips emit nothing', async (_name, props) => {
    const user = userEvent.setup();
    const { handle, onOpenChange } = mountSpy(['ES', 'FR', 'DE'], props);
    const root = chips.root();
    for (const li of Array.from(root.querySelectorAll<HTMLElement>(CHIP_SLOT))) {
      await user.click(li);
      await user.click(li.querySelector('span') as HTMLElement);
      await user.dblClick(li);
    }
    act(() => chips.trigger().focus());
    await user.keyboard('{Delete}{Backspace}{Enter} ');
    await user.tab();
    await user.keyboard('{Delete}{Backspace}{Enter} ');
    expect(handle.emits).toEqual([]);
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(chips.labels()).toEqual(['Spain', 'France', 'Germany']);
  });
});

describe('focus after a removal the consumer applies', () => {
  it('middle chip: focus moves to the next chip', async () => {
    const user = userEvent.setup();
    mountSpy(['FR', 'ES', 'DE']);
    await user.click(chips.remove('Spain'));
    expect(focusedLabel()).toBe('Remove Germany');
  });

  it('by keyboard: Enter on the first chip moves to the new first chip', async () => {
    const user = userEvent.setup();
    mountSpy(['FR', 'ES', 'DE']);
    await activate(user, chips.remove('France'), 'Enter');
    expect(focusedLabel()).toBe('Remove Spain');
    await user.keyboard('{Enter}');
    expect(focusedLabel()).toBe('Remove Germany');
    expect(chips.labels()).toEqual(['Germany']);
  });

  it('boundary: last chip: focus moves to the previous chip', async () => {
    const user = userEvent.setup();
    mountSpy(['FR', 'ES', 'DE']);
    await user.click(chips.remove('Germany'));
    expect(focusedLabel()).toBe('Remove Spain');
  });

  it('boundary: only chip: focus moves to the trigger, and the popover stays closed', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = mountSpy(['ES']);
    await user.click(chips.remove('Spain'));
    expect(document.activeElement).toBe(chips.trigger());
    expect(chips.trigger().getAttribute('aria-expanded')).toBe('false');
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(q.dialog()).toBeNull();
  });

  it('boundary: stale ids never shift the target (index counts rendered chips)', async () => {
    const user = userEvent.setup();
    mountSpy(['FR', 'XX', 'YY', 'ES', 'DE']);
    await user.click(chips.remove('France'));
    expect(focusedLabel()).toBe('Remove Spain');
    await user.click(chips.remove('Germany'));
    expect(focusedLabel()).toBe('Remove Spain');
  });

  it('same under StrictMode (effects run twice in development)', async () => {
    const user = userEvent.setup();
    const handle = newConsumer();
    render(
      <React.StrictMode>
        <Consumer handle={handle} initial={['FR', 'ES', 'DE']} />
      </React.StrictMode>
    );
    await user.click(chips.remove('Spain'));
    expect(focusedLabel()).toBe('Remove Germany');
    expect(chips.status().textContent).toBe('Spain removed');
    expect(handle.emits).toEqual([['FR', 'DE']]);
  });
});

describe('a removal the consumer does not apply changes nothing', () => {
  it.each<Policy>(['ignore', 'rerender-same'])(
    '%s: the chip stays, focus stays on its button, nothing is announced',
    async (policy) => {
      const user = userEvent.setup();
      mountSpy(['FR', 'ES', 'DE'], {}, policy);
      const button = chips.remove('Spain');
      await user.click(button);
      expect(chips.labels()).toEqual(['France', 'Spain', 'Germany']);
      expect(document.activeElement).toBe(button);
      expect(chips.status().textContent).toBe('');
    }
  );

  it('a later, unrelated change does not move focus because of the refused removal', async () => {
    const user = userEvent.setup();
    mountSpy(['FR', 'ES', 'DE'], {}, 'ignore-once');
    await user.click(chips.remove('Spain'));
    expect(chips.labels()).toEqual(['France', 'Spain', 'Germany']);
    // An unrelated selection change through the list.
    await user.click(chips.trigger());
    await user.click(q.option('Italy'));
    expect(chips.labels()).toEqual(['France', 'Spain', 'Germany', 'Italy']);
    expect(document.activeElement).toBe(q.search());
    expect(chips.status().textContent).toBe('');
  });

  it('Clear all after a refused removal neither announces it nor moves focus', async () => {
    const user = userEvent.setup();
    mountSpy(['FR', 'ES', 'DE'], {}, 'ignore-once');
    await user.click(chips.remove('Spain'));
    await user.click(chips.trigger());
    const search = q.search();
    await user.click(q.clear() as HTMLButtonElement);
    expect(chips.list()).toBeNull();
    expect(chips.status().textContent).toBe('');
    expect(document.activeElement).toBe(search);
  });

  it('unpicking the refused id in the list does not announce it as a chip removal', async () => {
    const user = userEvent.setup();
    mountSpy(['FR', 'ES', 'DE'], {}, 'ignore-once');
    await user.click(chips.remove('Spain'));
    await user.click(chips.trigger());
    await user.click(q.option('Spain'));
    expect(chips.labels()).toEqual(['France', 'Germany']);
    expect(chips.status().textContent).toBe('');
    expect(document.activeElement).toBe(q.search());
  });

  it('a reset that drops the refused id neither announces it nor moves focus', async () => {
    const user = userEvent.setup();
    const { handle } = mountSpy(['FR', 'ES', 'DE'], {}, 'ignore-once');
    await user.click(chips.remove('Spain'));
    // The reset unmounts the focused Spain button, so focus falls to <body> and stays there.
    act(() => handle.set(['FR']));
    expect(chips.labels()).toEqual(['France']);
    expect(chips.status().textContent).toBe('');
    expect(document.activeElement).toBe(document.body);
  });
});

describe('focus moves only if the user has not moved it', () => {
  it('a delayed apply after the user moved on leaves focus there, and still announces', async () => {
    const user = userEvent.setup();
    const { handle } = mountSpy(['FR', 'ES', 'DE'], {}, 'defer');
    await user.click(chips.remove('Spain'));
    const after = screen.getByRole('textbox', { name: 'After Countries' });
    await user.click(after);
    act(() => handle.apply());
    expect(chips.labels()).toEqual(['France', 'Germany']);
    expect(document.activeElement).toBe(after);
    expect(chips.status().textContent).toBe('Spain removed');
  });

  it('a delayed apply with focus still on the removed button moves it as usual', async () => {
    const user = userEvent.setup();
    const { handle } = mountSpy(['FR', 'ES', 'DE'], {}, 'defer');
    await user.click(chips.remove('Spain'));
    act(() => handle.apply());
    expect(focusedLabel()).toBe('Remove Germany');
    expect(chips.status().textContent).toBe('Spain removed');
  });
});

describe('other selection changes clear the announcement and do not move focus', () => {
  it('removing the same label twice announces it twice', async () => {
    const user = userEvent.setup();
    mountSpy(['FR', 'ES']);
    await user.click(chips.remove('France'));
    expect(chips.status().textContent).toBe('France removed');
    // Re-add France from the list.
    await user.click(chips.trigger());
    await user.click(q.option('France'));
    expect(chips.labels()).toEqual(['Spain', 'France']);
    expect(chips.status().textContent).toBe('');
    expect(document.activeElement).toBe(q.search());
    await user.keyboard('{Escape}');
    expect(document.activeElement).toBe(chips.trigger());
    await user.click(chips.remove('France'));
    expect(chips.status().textContent).toBe('France removed');
  });

  it('Clear all empties the status and does not pull focus to the chips', async () => {
    const user = userEvent.setup();
    mountSpy(['FR', 'ES', 'DE']);
    await user.click(chips.remove('France'));
    expect(chips.status().textContent).toBe('France removed');
    await user.click(chips.trigger());
    const search = q.search();
    await user.click(q.clear() as HTMLButtonElement);
    expect(chips.list()).toBeNull();
    expect(chips.status().textContent).toBe('');
    // Focus stays inside the open popover; the chips logic does not move it to the trigger.
    expect(q.dialog()?.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(search);
  });

  it('an unpick in the list empties the status', async () => {
    const user = userEvent.setup();
    mountSpy(['FR', 'ES', 'DE']);
    await user.click(chips.remove('Germany'));
    expect(chips.status().textContent).toBe('Germany removed');
    await user.click(chips.trigger());
    await user.click(q.option('Spain'));
    expect(chips.labels()).toEqual(['France']);
    expect(chips.status().textContent).toBe('');
    expect(document.activeElement).toBe(q.search());
  });
});

describe('the open popover and the chips', () => {
  it('chips update live while picking in the open list', async () => {
    const user = userEvent.setup();
    mountSpy(['FR']);
    await user.click(chips.trigger());
    await user.click(q.option('Italy'));
    expect(q.dialog()).not.toBeNull();
    expect(chips.labels()).toEqual(['France', 'Italy']);
    await user.keyboard('{Escape}');
    expect(document.activeElement).toBe(chips.trigger());
    expect(chips.trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('with the popover open, the remove buttons are outside the focus trap and blocked from the pointer', async () => {
    const user = userEvent.setup();
    const { handle } = mountSpy(['FR', 'ES']);
    await user.click(chips.trigger());
    // Radix's modal layer turns pointer events off for everything outside the content.
    expect(document.body.style.pointerEvents).toBe('none');
    // Tab cycles inside the content and never reaches a chip.
    for (let i = 0; i < 6; i += 1) {
      await user.tab();
      expect(q.dialog()?.contains(document.activeElement), `tab ${i}`).toBe(true);
    }
    expect(handle.emits).toEqual([]);
  });

  it('a removal with the popover closed starts no popover logic', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = mountSpy(['FR', 'ES', 'DE']);
    await activate(user, chips.remove('France'), 'Enter');
    await activate(user, chips.remove('Spain'), 'Space');
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(q.dialog()).toBeNull();
    expect(focusedLabel()).toBe('Remove Germany');
  });
});

describe('tab order and inert chip bodies', () => {
  it('trigger, then each remove button in chip order, then what follows the field', async () => {
    const user = userEvent.setup();
    mountSpy(['DE', 'FR', 'ES']);
    act(() => chips.trigger().focus());
    const visited: (string | null)[] = [];
    for (let i = 0; i < 4; i += 1) {
      await user.tab();
      visited.push(document.activeElement?.getAttribute('aria-label') ?? null);
    }
    expect(visited).toEqual(['Remove Germany', 'Remove France', 'Remove Spain', 'After Countries']);
    await user.tab({ shift: true });
    expect(focusedLabel()).toBe('Remove Spain');
  });

  it('chip bodies and labels are not focusable and do nothing on click', async () => {
    const user = userEvent.setup();
    const { handle, onOpenChange } = mountSpy(['FR', 'ES']);
    for (const li of Array.from(document.querySelectorAll<HTMLElement>(CHIP_SLOT))) {
      expect(li.hasAttribute('tabindex')).toBe(false);
      const label = li.querySelector('span') as HTMLElement;
      expect(label.hasAttribute('tabindex')).toBe(false);
      await user.click(label);
      await user.click(li);
    }
    expect(handle.emits).toEqual([]);
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(chips.trigger().getAttribute('aria-expanded')).toBe('false');
  });
});

describe('no extra work for unrelated renders', () => {
  it('typing in the search box and moving through the list does not rebuild the chips', async () => {
    const user = userEvent.setup();
    const removeLabel = vi.fn((label: string) => `Remove ${label}`);
    mountSpy(['FR', 'ES'], { formatRemoveLabel: removeLabel });
    await user.click(chips.trigger());
    const before = removeLabel.mock.calls.length;
    await user.keyboard('Ge');
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowUp}');
    await user.keyboard('{Backspace}{Backspace}i');
    expect(removeLabel.mock.calls.length).toBe(before);
  });

  it('a selection of every item renders, and a removal in the middle behaves', async () => {
    const user = userEvent.setup();
    const many: Country[] = Array.from({ length: 200 }, (_, i) => ({
      code: `C${i}`,
      name: `Country ${i}`,
    }));
    const handle = newConsumer();
    render(<Consumer handle={handle} items={many} initial={many.map((c) => c.code)} />);
    expect(chips.labels()).toHaveLength(200);
    expect(chips.labels()[0]).toBe('Country 0');
    expect(chips.labels()[199]).toBe('Country 199');
    await user.click(chips.remove('Country 100'));
    expect(chips.labels()).toHaveLength(199);
    expect(focusedLabel()).toBe('Remove Country 101');
    expect(handle.emits[0]).toHaveLength(199);
  });
});

describe('lifecycle', () => {
  it('a removal and its focus move schedule no timer, frame or listener', () => {
    render(<Controlled showSelected="chips" initial={['FR', 'ES', 'DE']} />);
    act(() => chips.remove('Spain').focus());
    // jsdom's own focus() schedules a selection timer; only callers outside jsdom count.
    const ownTimers: string[] = [];
    const realSetTimeout = window.setTimeout.bind(window);
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout').mockImplementation(((
      handler: TimerHandler,
      ms?: number
    ) => {
      const stack = String(new Error().stack);
      if (!stack.includes('/jsdom/lib/')) ownTimers.push(stack);
      return realSetTimeout(handler, ms);
    }) as typeof window.setTimeout);
    const spies = [
      vi.spyOn(window, 'setInterval'),
      vi.spyOn(window, 'requestAnimationFrame'),
      vi.spyOn(window, 'addEventListener'),
      vi.spyOn(document, 'addEventListener'),
      vi.spyOn(chips.root(), 'addEventListener'),
    ];
    fireEvent.click(chips.remove('Spain'));
    setTimeoutSpy.mockRestore();
    expect(focusedLabel()).toBe('Remove Germany');
    expect(chips.status().textContent).toBe('Spain removed');
    expect(ownTimers).toEqual([]);
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
  });

  it('unmounting with a removal pending neither throws nor logs, and a late apply is harmless', async () => {
    const user = userEvent.setup();
    const errors = vi.spyOn(console, 'error');
    const handle = newConsumer();
    const { unmount } = render(<Consumer handle={handle} policy="defer" initial={['FR', 'ES']} />);
    await user.click(chips.remove('France'));
    unmount();
    expect(() => act(() => handle.apply())).not.toThrow();
    expect(errors).not.toHaveBeenCalled();
  });

  it('removing the last chip unmounts the list and keeps the status region with the text', async () => {
    const user = userEvent.setup();
    mountSpy(['FR']);
    const status = chips.status();
    await user.click(chips.remove('France'));
    expect(chips.list()).toBeNull();
    expect(chips.status()).toBe(status);
    expect(status.textContent).toBe('France removed');
  });

  it('switching between count and chips at runtime does not throw or emit', () => {
    const onSelectionChange = vi.fn();
    const ref = React.createRef<HTMLButtonElement>();
    const props = {
      'aria-label': 'Countries',
      ref,
      items: COUNTRIES,
      getItemId: countryId,
      getItemLabel: countryLabel,
      selectedIds: ['FR', 'ES'],
      onSelectionChange,
    };
    const { rerender } = render(<SearchableMultiSelect {...props} showSelected="count" />);
    rerender(<SearchableMultiSelect {...props} showSelected="chips" />);
    expect(chips.labels()).toEqual(['France', 'Spain']);
    expect(ref.current).toBe(chips.trigger());
    rerender(<SearchableMultiSelect {...props} showSelected="count" />);
    expect(document.querySelector('[data-slot="searchable-multi-select"]')).toBeNull();
    expect(ref.current?.isConnected).toBe(true);
    expect(ref.current).toBe(q.trigger());
    expect(onSelectionChange).not.toHaveBeenCalled();
  });
});

describe('instances are isolated', () => {
  it('a removal in one never moves focus into, or announces in, the other', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Consumer handle={newConsumer()} initial={['FR', 'ES']} />
        <Consumer handle={newConsumer()} initial={['DE']} labelId="blocked-label" label="Blocked" />
      </>
    );
    const first = chips.root(0);
    const second = chips.root(1);
    await user.click(chips.remove('France', first));
    expect(chips.status(first).textContent).toBe('France removed');
    await user.click(chips.remove('Germany', second));
    expect(document.activeElement).toBe(chips.trigger(second));
    expect(chips.status(second).textContent).toBe('Germany removed');
    expect(chips.status(first).textContent).toBe('France removed');
    expect(screen.getByRole('button', { name: /^Blocked/ })).toBe(chips.trigger(second));
  });
});
