/**
 * @vitest-environment jsdom
 *
 * 005 SF-16 · Interaction & transition + stability (jsdom layer).
 * INV-14 onOpenChange sequences (ordering is proven in Chromium), INV-16 touched lifecycle,
 * INV-17 failed submit focuses the trigger, INV-18 error lifecycle, INV-19 Enter never
 * submits, INV-20 label click, INV-23 clean unmount.
 * artifacts/005-uikit-requests/sf-16-searchable-multi-select-field/03-invariants.md
 */
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import type { FieldValues, Mode } from 'react-hook-form';

import { SearchableMultiSelect } from '../../ui/searchable-multi-select';
import { SearchableSelectCore } from '../../ui/searchable-multi-select/searchable-select-core';
import { FieldHarness, type FieldOptions } from './smsf.sf16-harness';
import {
  api,
  COUNTRIES,
  countryId,
  countryLabel,
  FIELD_NAME,
  newHandle,
  pageSnapshot,
  q,
  seeded,
  type Country,
  type FieldHandle,
} from './smsf.sf16-kit';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const setup = () => userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });

function mount(
  options: FieldOptions = {},
  extra: { defaultValues?: FieldValues; mode?: Mode; textFirst?: boolean } = {}
) {
  const handle = newHandle();
  const utils = render(<FieldHarness handle={handle} options={options} {...extra} />);
  return { handle, ...utils };
}

const touched = (h: FieldHandle): boolean => api(h).getFieldState(FIELD_NAME).isTouched;
const submitBtn = () => screen.getByRole('button', { name: 'Submit' });

// ── INV-14 (sequences; Chromium proves the before-focus ordering) ────────────────────────────
interface BareProps {
  readonly onOpenChange?: (open: boolean) => void;
  readonly onBlur?: () => void;
  readonly disabled?: boolean;
}

function Bare({ onOpenChange, onBlur, disabled }: BareProps): React.ReactElement {
  const [ids, setIds] = React.useState<string[]>([]);
  return (
    <>
      <button type="button">Outside</button>
      <SearchableMultiSelect<Country>
        id="bare"
        aria-label="Bare"
        items={COUNTRIES}
        getItemId={countryId}
        getItemLabel={countryLabel}
        selectedIds={ids}
        onSelectionChange={setIds}
        onOpenChange={onOpenChange}
        onBlur={onBlur}
        disabled={disabled}
      />
    </>
  );
}

const bare = () => document.getElementById('bare') as HTMLButtonElement;

describe('INV-14: onOpenChange — once per effective change, strictly alternating', () => {
  it.each(['click', '{Enter}', ' ', '{ArrowDown}', '{ArrowUp}'])(
    'open by %s → [true]; Escape → [true, false]',
    async (input) => {
      const user = setup();
      const spy = vi.fn();
      render(<Bare onOpenChange={spy} />);
      if (input === 'click') await user.click(bare());
      else {
        bare().focus();
        await user.keyboard(input);
      }
      expect(spy.mock.calls).toEqual([[true]]);
      await user.keyboard('{Escape}');
      expect(spy.mock.calls).toEqual([[true], [false]]);
    }
  );

  it('outside pointer closes → false once', async () => {
    const user = setup();
    const spy = vi.fn();
    render(<Bare onOpenChange={spy} />);
    await user.click(bare());
    await user.click(screen.getByRole('button', { name: 'Outside', hidden: true }));
    expect(q.dialog()).toBeNull();
    expect(spy.mock.calls).toEqual([[true], [false]]);
  });

  it('toggles, typing, arrows and Clear all while open: no call', async () => {
    const user = setup();
    const spy = vi.fn();
    render(<Bare onOpenChange={spy} />);
    await user.click(bare());
    await user.click(q.option('France'));
    await user.type(q.search() as HTMLInputElement, 'a');
    await user.keyboard('{ArrowDown}{ArrowUp}{Enter}');
    await user.click(q.clear() as HTMLButtonElement);
    expect(spy.mock.calls).toEqual([[true]]);
  });

  it('refused open (disabled): no call by click, keys', async () => {
    const user = setup();
    const spy = vi.fn();
    render(<Bare onOpenChange={spy} disabled />);
    await user.click(bare());
    bare().focus();
    await user.keyboard('{Enter}{ArrowDown} ');
    expect(spy).not.toHaveBeenCalled();
  });

  it('disable while open: exactly one false, after commit (trigger already disabled), no render-phase update', async () => {
    const user = setup();
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const seen: string[] = [];
    // A parent setState inside the callback: React errors if this ran during render.
    function Host({ disabled }: { readonly disabled: boolean }): React.ReactElement {
      const [, setOpen] = React.useState(false);
      return (
        <Bare
          disabled={disabled}
          onOpenChange={(open) => {
            seen.push(`${open}:${bare().disabled ? 'committed' : 'pre-commit'}`);
            setOpen(open);
          }}
        />
      );
    }
    const { rerender } = render(<Host disabled={false} />);
    await user.click(bare());
    rerender(<Host disabled />);
    rerender(<Host disabled />);
    expect(seen).toEqual(['true:pre-commit', 'false:committed']);
    expect(errors.mock.calls.some((c) => String(c[0]).includes('while rendering'))).toBe(false);
    // Re-enable: no spurious call; next open reports again.
    rerender(<Host disabled={false} />);
    expect(seen.length).toBe(2);
    await user.click(bare());
    expect(seen.at(-1)).toBe('true:pre-commit');
  });

  it('StrictMode: mount reports nothing; one open reports one true', async () => {
    const user = setup();
    const spy = vi.fn();
    render(
      <React.StrictMode>
        <Bare onOpenChange={spy} />
      </React.StrictMode>
    );
    expect(spy).not.toHaveBeenCalled();
    await user.click(bare());
    expect(spy.mock.calls).toEqual([[true]]);
  });

  it('unmount while open: no call', async () => {
    const user = setup();
    const spy = vi.fn();
    const { unmount } = render(<Bare onOpenChange={spy} />);
    await user.click(bare());
    spy.mockClear();
    unmount();
    expect(spy).not.toHaveBeenCalled();
  });

  it('single-mode pick (core): reports false once', async () => {
    const user = setup();
    const spy = vi.fn();
    render(
      <SearchableSelectCore<Country>
        items={COUNTRIES}
        getItemId={countryId}
        getItemLabel={countryLabel}
        multiple={false}
        isSelected={() => false}
        onActivate={() => undefined}
        renderTrigger={({ triggerAria }) => (
          <button type="button" id="single" aria-label="Single" {...triggerAria}>
            Pick
          </button>
        )}
        searchPlaceholder="Search"
        searchLabel="Search"
        emptyText="None"
        listName={{ 'aria-label': 'Single' }}
        onOpenChange={spy}
      />
    );
    await user.click(document.getElementById('single') as HTMLElement);
    await user.click(q.option('Italy'));
    expect(q.dialog()).toBeNull();
    expect(spy.mock.calls).toEqual([[true], [false]]);
  });

  it('absent onOpenChange: unchanged behaviour; onBlur still fires on the open transition', async () => {
    const user = setup();
    const onBlur = vi.fn();
    render(<Bare onBlur={onBlur} />);
    await user.click(bare());
    expect(q.dialog()).not.toBeNull();
    expect(document.activeElement).toBe(q.search());
    expect(onBlur).toHaveBeenCalledTimes(1);
    await user.keyboard('{Escape}');
    expect(q.dialog()).toBeNull();
  });

  it('property: 20 seeded open/close/toggle sequences alternate true,false,… starting true', async () => {
    const rand = seeded(1416);
    for (let run = 0; run < 20; run += 1) {
      const user = setup();
      const calls: boolean[] = [];
      const { unmount } = render(<Bare onOpenChange={(o) => calls.push(o)} />);
      for (let i = 0; i < 8; i += 1) {
        const r = rand();
        const isOpen = q.dialog() !== null;
        if (!isOpen && r < 0.5) await user.click(bare());
        else if (!isOpen) {
          bare().focus();
          await user.keyboard(r < 0.75 ? '{Enter}' : '{ArrowDown}');
        } else if (r < 0.4) await user.keyboard('{Escape}');
        else if (r < 0.6)
          await user.click(screen.getByRole('button', { name: 'Outside', hidden: true }));
        else await user.click(q.options()[Math.floor(rand() * 6)] as HTMLElement);
      }
      calls.forEach((v, i) => expect(v).toBe(i % 2 === 0));
      expect(calls.length % 2 === 1).toBe(q.dialog() !== null);
      unmount();
    }
  });
});

// ── INV-16 (jsdom layer; real Tab / blur timing in Chromium) ──────────────────────────────────
describe('INV-16: touched means focus left the control', () => {
  it('open, pick, type, Clear all, Escape: never touched; Tab away: touched once', async () => {
    const user = setup();
    const { handle } = mount({ validation: { required: true } }, { mode: 'onTouched' });
    await user.click(q.trigger());
    await user.click(q.option('France'));
    await user.type(q.search() as HTMLInputElement, 'ger');
    await user.click(q.clear() as HTMLButtonElement);
    expect(touched(handle)).toBe(false);
    await user.keyboard('{Escape}');
    expect(document.activeElement).toBe(q.trigger());
    expect(touched(handle)).toBe(false);
    expect(q.error()).toBeNull();
    await user.tab();
    expect(touched(handle)).toBe(true);
    expect(q.error()?.textContent).toBe('This field is required');
  });

  it('boundary: closing by outside click returns focus to the trigger, not touched', async () => {
    const user = setup();
    const { handle } = mount({}, { mode: 'onTouched' });
    await user.click(q.trigger());
    await user.click(screen.getByRole('button', { name: 'After', hidden: true }));
    expect(q.dialog()).toBeNull();
    expect(touched(handle)).toBe(false);
  });

  it('forced close by readOnly resets the gate: next real blur marks touched', async () => {
    const user = setup();
    const handle = newHandle();
    const { rerender } = render(<FieldHarness handle={handle} mode="onTouched" />);
    await user.click(q.trigger());
    rerender(<FieldHarness handle={handle} mode="onTouched" options={{ readOnly: true }} />);
    rerender(<FieldHarness handle={handle} mode="onTouched" />);
    expect(touched(handle)).toBe(false);
    act(() => q.trigger().focus());
    await user.tab();
    expect(touched(handle)).toBe(true);
  });
});

// ── INV-17 ────────────────────────────────────────────────────────────────────────────────
describe('INV-17: failed submit focuses the trigger and nothing else', () => {
  it('happy: required empty → trigger focused, popover closed, success not called, error same update', async () => {
    const user = setup();
    const { handle } = mount({ validation: { required: true } });
    await user.click(submitBtn());
    expect(document.activeElement).toBe(q.trigger());
    expect(q.dialog()).toBeNull();
    expect(handle.submits).toEqual([]);
    expect(q.error()?.textContent).toBe('This field is required');
    expect(q.trigger().getAttribute('aria-invalid')).toBe('true');
  });

  it('keyboard submit (Enter on Submit) focuses the trigger too', async () => {
    const user = setup();
    mount({ validation: { required: true } });
    submitBtn().focus();
    await user.keyboard('{Enter}');
    expect(document.activeElement).toBe(q.trigger());
  });

  it('boundary: an earlier invalid field wins focus (registration order)', async () => {
    const user = setup();
    mount({ validation: { required: true } }, { textFirst: true });
    await user.click(submitBtn());
    expect(document.activeElement).toBe(screen.getByLabelText('First'));
    expect(q.error()).not.toBeNull();
  });

  it('setFocus(name) focuses the trigger, does not open, does not touch', async () => {
    const { handle } = mount();
    // react-hook-form defers setFocus with a timeout, so assert eventually.
    act(() => api(handle).setFocus(FIELD_NAME));
    await waitFor(() => expect(document.activeElement).toBe(q.trigger()));
    expect(q.dialog()).toBeNull();
    expect(touched(handle)).toBe(false);
  });

  it('failure: valid value → submit succeeds and focus is not moved to the trigger', async () => {
    const user = setup();
    const { handle } = mount(
      { validation: { required: true } },
      { defaultValues: { countries: ['FR'] } }
    );
    await user.click(submitBtn());
    expect(handle.submits).toEqual([{ countries: ['FR'] }]);
    expect(document.activeElement).toBe(submitBtn());
  });
});

// ── INV-18 ────────────────────────────────────────────────────────────────────────────────
describe('INV-18: error lifecycle after a failed submit and on change', () => {
  it('first pick clears the error in the same act; Clear all brings it back; popover stays', async () => {
    const user = setup();
    mount({ validation: { required: true } });
    await user.click(submitBtn());
    expect(q.error()).not.toBeNull();
    await user.click(q.trigger());
    await user.click(q.option('Spain'));
    expect(q.error()).toBeNull();
    expect(q.trigger().getAttribute('aria-invalid')).not.toBe('true');
    expect(q.dialog()).not.toBeNull();
    expect(document.activeElement).toBe(q.search());
    await user.click(q.clear() as HTMLButtonElement);
    expect(q.error()?.textContent).toBe('This field is required');
    expect(q.dialog()).not.toBeNull();
    expect(document.activeElement).toBe(q.search());
  });

  it.each(['onChange', 'all'] as const)(
    'mode=%s: every toggle and Clear all validates',
    async (mode) => {
      const user = setup();
      const spy = vi.fn(() => true);
      mount({ validateSelection: spy }, { mode });
      await user.click(q.trigger());
      await user.click(q.option('France'));
      await user.click(q.option('Italy'));
      expect(spy).toHaveBeenCalledTimes(2);
      await user.click(q.clear() as HTMLButtonElement);
      // Clear all → [] → empty; the rule is skipped but validation ran: field stays valid.
      expect(spy).toHaveBeenCalledTimes(2);
    }
  );

  it('mode=onSubmit before any submit: toggles do not validate', async () => {
    const user = setup();
    const spy = vi.fn(() => true);
    mount({ validateSelection: spy });
    await user.click(q.trigger());
    await user.click(q.option('France'));
    expect(spy).not.toHaveBeenCalled();
  });

  it('validation never changes the query or the active option', async () => {
    const user = setup();
    mount({ validateSelection: (ids) => (ids.length > 1 ? 'Max 1' : true) }, { mode: 'onChange' });
    await user.click(q.trigger());
    await user.type(q.search() as HTMLInputElement, 'a'); // France, Italy, Spain, Brazil, Japan
    await user.keyboard('{ArrowDown}{Enter}');
    const active = document.querySelector('[data-active]')?.textContent;
    await user.keyboard('{ArrowDown}{Enter}');
    expect(q.error()?.textContent).toBe('Max 1');
    expect((q.search() as HTMLInputElement).value).toBe('a');
    expect(document.querySelector('[data-active]')?.textContent).not.toBe(active);
    expect(document.activeElement).toBe(q.search());
    expect(q.dialog()).not.toBeNull();
  });
});

// ── INV-19 ────────────────────────────────────────────────────────────────────────────────
describe('INV-19: Enter never submits the enclosing form', () => {
  it('Enter on the closed trigger opens and does not submit; 5× Enter toggles 5×, submits 0×', async () => {
    const user = setup();
    const { handle } = mount();
    q.trigger().focus();
    await user.keyboard('{Enter}');
    expect(q.dialog()).not.toBeNull();
    expect(handle.nativeSubmits).toBe(0);
    let writes = 0;
    const sub = api(handle).watch((_v, info) => {
      if (info.type === 'change') writes += 1;
    });
    await user.keyboard('{ArrowDown}{Enter}');
    expect(writes).toBe(1);
    await user.keyboard('{Enter}{Enter}{Enter}{Enter}{Enter}');
    expect(writes).toBe(6);
    expect(handle.nativeSubmits).toBe(0);
    sub.unsubscribe();
  });

  it('Space on the closed trigger opens and does not submit', async () => {
    const user = setup();
    const { handle } = mount();
    q.trigger().focus();
    await user.keyboard(' ');
    expect(q.dialog()).not.toBeNull();
    expect(handle.nativeSubmits).toBe(0);
  });

  it('sensitivity control: the form still submits through its own submit button', async () => {
    const user = setup();
    const { handle } = mount();
    await user.click(submitBtn());
    expect(handle.nativeSubmits).toBe(1);
    expect(q.trigger().getAttribute('type')).toBe('button');
  });
});

// ── INV-20 ────────────────────────────────────────────────────────────────────────────────
describe('INV-20: label click opens the popover like a trigger click', () => {
  it('opens once, focuses search, not touched, no emit', async () => {
    const user = setup();
    const { handle } = mount({}, { mode: 'onTouched' });
    let writes = 0;
    const sub = api(handle).watch(() => {
      writes += 1;
    });
    await user.click(screen.getByText('Allowed countries'));
    expect(q.dialog()).not.toBeNull();
    expect(document.activeElement).toBe(q.search());
    expect(touched(handle)).toBe(false);
    expect(writes).toBe(0);
    sub.unsubscribe();
  });

  it('readOnly: label click opens nothing', async () => {
    const user = setup();
    mount({ readOnly: true });
    await user.click(screen.getByText('Allowed countries'));
    expect(q.dialog()).toBeNull();
  });
});

// ── INV-23 ────────────────────────────────────────────────────────────────────────────────
describe('INV-23: unmount is clean', () => {
  it('unmount while open: page restored, no errors, value kept (shouldUnregister default)', async () => {
    const user = setup();
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const handle = newHandle();
    const dv = { countries: ['FR'] };
    const { rerender } = render(<FieldHarness handle={handle} defaultValues={dv} />);
    const before = pageSnapshot();
    await user.click(q.trigger());
    await user.click(q.option('Italy'));
    const v = api(handle).getValues(FIELD_NAME);
    rerender(<FieldHarness handle={handle} defaultValues={dv} show={false} />);
    expect(q.dialog()).toBeNull();
    expect(pageSnapshot()).toEqual(before);
    expect(document.body.style.pointerEvents).toBe('');
    expect(api(handle).getValues(FIELD_NAME)).toBe(v);
    expect(errors).not.toHaveBeenCalled();
  });

  it('no onOpenChange / onBlur / onSelectionChange after unmount while open', async () => {
    const user = setup();
    const calls: string[] = [];
    function Spied(): React.ReactElement {
      return (
        <SearchableMultiSelect<Country>
          aria-label="Spied"
          id="spied"
          items={COUNTRIES}
          getItemId={countryId}
          getItemLabel={countryLabel}
          selectedIds={[]}
          onSelectionChange={() => calls.push('select')}
          onOpenChange={(o) => calls.push(`open:${o}`)}
          onBlur={() => calls.push('blur')}
        />
      );
    }
    const { unmount } = render(<Spied />);
    await user.click(document.getElementById('spied') as HTMLElement);
    const n = calls.length;
    unmount();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(calls.slice(n)).toEqual([]);
  });

  it('50 open + unmount cycles: no growth in body children or aria-hidden', async () => {
    const user = setup();
    const before = { children: document.body.children.length, ...pageSnapshot() };
    for (let i = 0; i < 50; i += 1) {
      const { unmount, container } = mount();
      if (i % 5 === 0) await user.click(q.trigger());
      unmount();
      container.remove(); // RTL's own container; the kit's portal must already be gone
    }
    expect({ children: document.body.children.length, ...pageSnapshot() }).toEqual(before);
  });
});
