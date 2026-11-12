/**
 * @vitest-environment jsdom
 *
 * SF-15 · Interaction & transition — INV-24 (open/close), INV-25 (disabled),
 * INV-26 (active option), INV-27 (arrows), INV-28 (Enter / IME / no submit),
 * INV-29 (pointer), INV-30 (Clear all), INV-31 (query survives), INV-33
 * (Escape inside a Dialog).
 * artifacts/005-uikit-requests/sf-15-searchable-multi-select/03-invariants.md
 */
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as React from 'react';

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../../dialog';
import { SearchableMultiSelect } from '../index';
import {
  activeOptionLabel,
  Controlled,
  COUNTRIES,
  countryId,
  countryLabel,
  pageSnapshot,
  q,
  type Country,
} from './helpers';

let scrollSpy: ReturnType<typeof vi.fn>;
beforeEach(() => {
  scrollSpy = vi.fn();
  Element.prototype.scrollIntoView = scrollSpy as unknown as Element['scrollIntoView'];
});
afterEach(() => {
  vi.restoreAllMocks();
  delete (Element.prototype as Partial<Element>).scrollIntoView;
});

const setup = () => userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });

describe('INV-24: open/close transitions', () => {
  it.each(['click', '{Enter}', ' ', '{ArrowDown}', '{ArrowUp}'])(
    'opening input %s shows the dialog and focuses the search box',
    async (input) => {
      const user = setup();
      render(<Controlled />);
      if (input === 'click') await user.click(q.trigger());
      else {
        q.trigger().focus();
        await user.keyboard(input);
      }
      expect(q.dialog()).not.toBeNull();
      expect(document.activeElement).toBe(q.search());
      expect(activeOptionLabel()).toBe('France');
    }
  );

  it('multi mode: activation, Clear all, typing, arrows, Tab, hover and prop changes never close', async () => {
    const user = setup();
    const { rerender } = render(<Controlled />);
    await user.click(q.trigger());
    await user.keyboard('{Enter}');
    await user.click(q.option('Spain'));
    await user.type(q.search(), 'a');
    await user.keyboard('{ArrowDown}{ArrowUp}');
    await user.tab();
    await user.hover(q.option('Spain'));
    await user.click(q.clear() as HTMLButtonElement);
    rerender(<Controlled items={[...COUNTRIES]} initial={['IT']} />);
    expect(q.dialog()).not.toBeNull();
  });

  it('Escape and an outside pointer close; closing never emits and never clears the query', async () => {
    const user = setup();
    const onChange = vi.fn();
    render(
      <>
        <button type="button">Elsewhere</button>
        <Controlled onChange={onChange} />
      </>
    );
    await user.click(q.trigger());
    await user.type(q.search(), 'sp');
    await user.keyboard('{Escape}');
    expect(q.dialog()).toBeNull();
    await user.click(q.trigger());
    expect(q.search().value).toBe('sp');
    await user.click(screen.getByText('Elsewhere'));
    expect(q.dialog()).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('INV-25: disabled means unopenable, including mid-session', () => {
  it('click, Enter and ArrowDown on a disabled trigger open nothing', async () => {
    const user = setup();
    render(<Controlled disabled />);
    await user.click(q.trigger());
    fireEvent.keyDown(q.trigger(), { key: 'Enter' });
    fireEvent.keyDown(q.trigger(), { key: 'ArrowDown' });
    fireEvent.keyDown(q.trigger(), { key: 'ArrowUp' });
    expect(q.dialog()).toBeNull();
    expect(q.trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('becoming disabled while open closes at once, cleans up, emits nothing, and stays closed when re-enabled', async () => {
    const user = setup();
    const onChange = vi.fn();
    const { rerender } = render(<Controlled onChange={onChange} />);
    const baseline = pageSnapshot();
    await user.click(q.trigger());
    rerender(<Controlled onChange={onChange} disabled />);
    expect(q.dialog()).toBeNull();
    expect(pageSnapshot()).toEqual(baseline);
    rerender(<Controlled onChange={onChange} />);
    expect(q.dialog()).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('INV-26: active-option rule', () => {
  it('first on open, first match on query change, unchanged after toggle and Clear all', async () => {
    const user = setup();
    render(<Controlled />);
    await user.click(q.trigger());
    expect(activeOptionLabel()).toBe('France');
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(activeOptionLabel()).toBe('Georgia');
    await user.keyboard('{Enter}');
    expect(activeOptionLabel()).toBe('Georgia');
    await user.type(q.search(), 'i');
    expect(activeOptionLabel()).toBe('Spain'); // first match of "i"
    await user.keyboard('{ArrowDown}');
    const before = activeOptionLabel();
    await user.click(q.clear() as HTMLButtonElement);
    expect(activeOptionLabel()).toBe(before);
  });

  it('a fresh open resets to the first enabled option', async () => {
    const user = setup();
    render(<Controlled />);
    await user.click(q.trigger());
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    await user.keyboard('{Escape}');
    await user.click(q.trigger());
    expect(activeOptionLabel()).toBe('France');
  });

  it('boundary: items shrinking below the stored index falls back to the first enabled', async () => {
    const user = setup();
    const { rerender } = render(<Controlled />);
    await user.click(q.trigger());
    await user.keyboard('{ArrowUp}');
    expect(activeOptionLabel()).toBe('Italy');
    rerender(<Controlled items={COUNTRIES.slice(0, 2)} />);
    expect(activeOptionLabel()).toBe('France');
    rerender(<Controlled items={[]} />);
    expect(activeOptionLabel()).toBeNull();
  });
});

describe('INV-27: arrow navigation wraps and keeps the caret', () => {
  it('ArrowUp from the first wraps to the last; ArrowDown from the last wraps to the first', async () => {
    const user = setup();
    render(<Controlled />);
    await user.click(q.trigger());
    await user.keyboard('{ArrowUp}');
    expect(activeOptionLabel()).toBe('Italy');
    await user.keyboard('{ArrowDown}');
    expect(activeOptionLabel()).toBe('France');
  });

  it('keyboard moves scroll the new active option into view with block: nearest', async () => {
    const user = setup();
    render(<Controlled />);
    await user.click(q.trigger());
    scrollSpy.mockClear();
    await user.keyboard('{ArrowDown}');
    expect(scrollSpy).toHaveBeenCalledTimes(1);
    expect(scrollSpy).toHaveBeenCalledWith({ block: 'nearest' });
    expect(scrollSpy.mock.contexts[0]).toBe(q.option('Spain'));
  });

  it('arrows are prevented; Home, End, Left and Right are not', async () => {
    const user = setup();
    render(<Controlled />);
    await user.click(q.trigger());
    const search = q.search();
    expect(fireEvent.keyDown(search, { key: 'ArrowDown' })).toBe(false);
    expect(fireEvent.keyDown(search, { key: 'ArrowUp' })).toBe(false);
    for (const key of ['Home', 'End', 'ArrowLeft', 'ArrowRight', ' ']) {
      expect(fireEvent.keyDown(search, { key }), key).toBe(true);
    }
  });

  it('Home still moves the caret in the query', async () => {
    const user = setup();
    render(<Controlled />);
    await user.click(q.trigger());
    await user.type(q.search(), 'fra');
    await user.keyboard('{Home}');
    expect(q.search().selectionStart).toBe(0);
    await user.keyboard('{ArrowDown}');
    expect(q.search().selectionStart).toBe(0);
  });

  it('boundary: one option → arrows keep it active; none → arrows do nothing', async () => {
    const user = setup();
    render(<Controlled />);
    await user.click(q.trigger());
    await user.type(q.search(), 'spa');
    await user.keyboard('{ArrowDown}{ArrowUp}');
    expect(activeOptionLabel()).toBe('Spain');
    await user.type(q.search(), 'zz');
    scrollSpy.mockClear();
    await user.keyboard('{ArrowDown}');
    expect(activeOptionLabel()).toBeNull();
    expect(scrollSpy).not.toHaveBeenCalled();
  });
});

describe('INV-28: Enter never submits an enclosing form; one Enter is one activation', () => {
  function InForm({ onSubmit }: { readonly onSubmit: () => void }): React.ReactElement {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <input aria-label="Other field" />
        <Controlled />
        <button type="submit">Save</button>
      </form>
    );
  }

  it('Enter on an active option, after ArrowDown, and on an empty result never submits', async () => {
    const user = setup();
    const onSubmit = vi.fn();
    render(<InForm onSubmit={onSubmit} />);
    q.trigger().focus();
    await user.keyboard('{Enter}'); // opens, does not submit
    expect(q.dialog()).not.toBeNull();
    await user.keyboard('{Enter}');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(screen.getByTestId('readout').textContent).toBe('FR,ES');
    await user.type(q.search(), 'zzz');
    await user.keyboard('{Enter}');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('every non-composing Enter keydown in the search box is default-prevented', async () => {
    const user = setup();
    render(<Controlled />);
    await user.click(q.trigger());
    expect(fireEvent.keyDown(q.search(), { key: 'Enter' })).toBe(false);
    await user.type(q.search(), 'zzz');
    expect(fireEvent.keyDown(q.search(), { key: 'Enter' })).toBe(false);
  });

  it('a React keydown handler on the form never sees an un-prevented Enter from the popover', async () => {
    const user = setup();
    const seen: boolean[] = [];
    render(
      <form onKeyDown={(e) => e.key === 'Enter' && seen.push(e.defaultPrevented)}>
        <Controlled />
      </form>
    );
    await user.click(q.trigger());
    await user.keyboard('{Enter}');
    expect(seen).toEqual([true]);
  });

  it('Enter on a focused Clear all clears without submitting', async () => {
    const user = setup();
    const onSubmit = vi.fn();
    render(<InForm onSubmit={onSubmit} />);
    await user.click(q.trigger());
    await user.keyboard('{Enter}');
    await user.tab();
    expect(document.activeElement).toBe(q.clear());
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('readout').textContent).toBe('None');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it.each([
    { name: 'isComposing', init: { key: 'Enter', isComposing: true } },
    { name: 'keyCode 229', init: { key: 'Enter', keyCode: 229 } },
  ])('IME composition Enter ($name) neither activates nor is prevented (A4)', async ({ init }) => {
    const user = setup();
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    await user.click(q.trigger());
    expect(fireEvent.keyDown(q.search(), init)).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('one Enter is exactly one activation', async () => {
    const user = setup();
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    await user.click(q.trigger());
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe('INV-29: pointer interaction keeps focus in the search box', () => {
  it('click activates once, keeps focus in search, and makes the option active', async () => {
    const user = setup();
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    await user.click(q.trigger());
    await user.click(q.option('Germany'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(['DE']);
    expect(document.activeElement).toBe(q.search());
    expect(activeOptionLabel()).toBe('Germany');
  });

  it('pointerdown and mousedown on an option are default-prevented', async () => {
    const user = setup();
    render(<Controlled />);
    await user.click(q.trigger());
    expect(fireEvent.pointerDown(q.option('Spain'))).toBe(false);
    expect(fireEvent.mouseDown(q.option('Spain'))).toBe(false);
  });

  it('hover moves the highlight without scrolling (A5)', async () => {
    const user = setup();
    render(<Controlled />);
    await user.click(q.trigger());
    scrollSpy.mockClear();
    await user.hover(q.option('Italy'));
    expect(activeOptionLabel()).toBe('Italy');
    expect(scrollSpy).not.toHaveBeenCalled();
  });
});

describe('INV-30: Clear all keeps the user in the popover', () => {
  it.each([
    { how: 'Enter', act: async (u: ReturnType<typeof setup>) => u.keyboard('{Enter}') },
    { how: 'Space', act: async (u: ReturnType<typeof setup>) => u.keyboard(' ') },
    { how: 'click', act: async (u: ReturnType<typeof setup>) => u.click(q.clear() as HTMLElement) },
  ])('$how: one emit [], focus → search, dialog open, query and active kept', async ({ act }) => {
    const user = setup();
    const onChange = vi.fn();
    render(<Controlled initial={['FR', 'ES']} onChange={onChange} />);
    await user.click(q.trigger());
    await user.type(q.search(), 'g');
    await user.keyboard('{ArrowDown}');
    const active = q.active()[0]?.id;
    await user.tab();
    expect(document.activeElement).toBe(q.clear());
    await act(user);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([]);
    expect(q.clear()).toBeNull();
    expect(document.activeElement).toBe(q.search());
    expect(document.activeElement).not.toBe(document.body);
    expect(q.dialog()).not.toBeNull();
    expect(q.search().value).toBe('g');
    expect(q.active()[0]?.id).toBe(active);
  });
});

describe('INV-31: the query survives close and reopen', () => {
  it('type "spa", Escape, reopen → value "spa", only Spain, Spain active', async () => {
    const user = setup();
    render(<Controlled />);
    await user.click(q.trigger());
    await user.type(q.search(), 'spa');
    await user.keyboard('{Escape}');
    await user.click(q.trigger());
    expect(q.search().value).toBe('spa');
    expect(q.labels()).toEqual(['Spain']);
    expect(activeOptionLabel()).toBe('Spain');
  });

  it('also survives an outside-pointer close', async () => {
    const user = setup();
    render(
      <>
        <p>Outside</p>
        <Controlled />
      </>
    );
    await user.click(q.trigger());
    await user.type(q.search(), 'ger');
    await user.click(screen.getByText('Outside'));
    await user.click(q.trigger());
    expect(q.search().value).toBe('ger');
    expect(q.labels()).toEqual(['Germany']);
  });
});

/**
 * INV-33 needs the real browser: in jsdom the duplicated Radix focus-scope copies
 * (see the KNOWN DEFECT note in searchable-multi-select.sf15.browser.test.tsx) ping-pong
 * focusin until the stack overflows, so this case is asserted in Chromium only.
 */
describe.skip('INV-33: Escape closes only the popover inside a kit Dialog (Chromium only, see note)', () => {
  function InDialog({ onOpenChange }: { readonly onOpenChange: (o: boolean) => void }) {
    const [open, setOpen] = React.useState(true);
    const [ids, setIds] = React.useState<string[]>(['FR']);
    return (
      <Dialog
        open={open}
        onOpenChange={(o) => {
          onOpenChange(o);
          setOpen(o);
        }}
      >
        <DialogContent>
          <DialogTitle>Add alias</DialogTitle>
          <DialogDescription>Pick countries</DialogDescription>
          <SearchableMultiSelect<Country>
            aria-label="Countries"
            items={COUNTRIES}
            getItemId={countryId}
            getItemLabel={countryLabel}
            selectedIds={ids}
            onSelectionChange={setIds}
          />
        </DialogContent>
      </Dialog>
    );
  }

  it('first Escape closes the popover only; the second closes the dialog', async () => {
    const user = setup();
    const onOpenChange = vi.fn();
    render(<InDialog onOpenChange={onOpenChange} />);
    await user.click(q.trigger());
    await user.type(q.search(), 'sp');
    await user.keyboard('{Escape}');
    expect(q.dialog()).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Add alias' })).toBeTruthy();
    expect(document.activeElement).toBe(q.trigger());
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(q.trigger().textContent).toBe('1 selected');
    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByRole('dialog', { name: 'Add alias' })).toBeNull();
  });
});
