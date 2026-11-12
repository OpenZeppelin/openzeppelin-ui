/**
 * @vitest-environment jsdom
 *
 * SF-15 · Prop / state contract — INV-9 (controlled), INV-10 (order, in the
 * component), INV-11 (one emit per act), INV-12 (identity by id), INV-13 /
 * INV-14 (duplicate ids / labels), INV-15 (totality), INV-16 (pass-throughs),
 * INV-18 (diagnostics), INV-20 (filtering never changes selection).
 * artifacts/005-uikit-requests/sf-15-searchable-multi-select/03-invariants.md
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as React from 'react';

import { SearchableMultiSelect, type SearchableMultiSelectProps } from '../index';
import {
  activeOptionLabel,
  Controlled,
  COUNTRIES,
  countryId,
  countryLabel,
  q,
  seeded,
  type Country,
} from './helpers';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

type Props = SearchableMultiSelectProps<Country>;

function Plain(props: Partial<Props>): React.ReactElement {
  return (
    <SearchableMultiSelect
      aria-label="Countries"
      items={COUNTRIES}
      getItemId={countryId}
      getItemLabel={countryLabel}
      selectedIds={[]}
      onSelectionChange={() => undefined}
      {...props}
    />
  );
}

const kitWarns = (warn: { readonly mock: { readonly calls: unknown[][] } }): string[] =>
  warn.mock.calls.map((c) => String(c[0])).filter((m) => m.includes('SearchableMultiSelect'));

describe('INV-9: selection is fully controlled', () => {
  it('failure: a consumer that ignores onSelectionChange sees no change on screen', async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(<Plain onSelectionChange={onSelectionChange} />);
    await user.click(q.trigger());
    await user.keyboard('{Enter}');
    expect(onSelectionChange).toHaveBeenCalledWith(['FR']);
    expect(q.option('France').getAttribute('aria-selected')).toBe('false');
    expect(q.option('France').querySelector('svg')).toBeNull();
    expect(q.summary()).toBeNull();
    expect(q.trigger().textContent).toBe('Select items');
  });

  it('an outside change to selectedIds while open is reflected and the popover stays open', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Plain />);
    await user.click(q.trigger());
    rerender(<Plain selectedIds={['ES', 'IT']} />);
    expect(q.dialog()).not.toBeNull();
    expect(q.option('Spain').getAttribute('aria-selected')).toBe('true');
    expect(q.option('Italy').getAttribute('aria-selected')).toBe('true');
    expect(q.summary()?.textContent).toContain('2 selected');
    expect(q.trigger().textContent).toBe('2 selected');
    rerender(<Plain selectedIds={[]} />);
    expect(q.summary()).toBeNull();
    expect(q.selectedFlags().every((f) => f === 'false')).toBe(true);
  });
});

describe('INV-10: emitted order is selection order, not source order', () => {
  it('select Spain, France, Italy by keyboard → [ES, FR, IT]; deselect France → [ES, IT]', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    await user.click(q.trigger());
    await user.keyboard('{ArrowDown}{Enter}'); // Spain
    await user.keyboard('{ArrowUp}{Enter}'); // France
    await user.type(q.search(), 'ita');
    await user.keyboard('{Enter}'); // Italy
    expect(onChange.mock.calls.map((c) => c[0])).toEqual([
      ['ES'],
      ['ES', 'FR'],
      ['ES', 'FR', 'IT'],
    ]);
    await user.clear(q.search());
    await user.click(q.option('France'));
    expect(onChange).toHaveBeenLastCalledWith(['ES', 'IT']);
    expect(screen.getByTestId('readout').textContent).toBe('ES,IT');
  });

  it('stale ids are kept in place; the emitted array is new and the prop is not mutated', async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    const selectedIds = Object.freeze(['GONE', 'FR']);
    render(<Plain selectedIds={selectedIds} onSelectionChange={onSelectionChange} />);
    await user.click(q.trigger());
    await user.click(q.option('Spain'));
    const [[emitted]] = onSelectionChange.mock.calls as [[string[]]];
    expect(emitted).toEqual(['GONE', 'FR', 'ES']);
    expect(emitted).not.toBe(selectedIds);
    expect(selectedIds).toEqual(['GONE', 'FR']);
    await user.click(q.option('France'));
    expect(onSelectionChange).toHaveBeenLastCalledWith(['GONE']);
  });
});

describe('INV-11: onSelectionChange fires once per user act, and only then', () => {
  it('no non-activating input emits; Enter, click and Clear all emit exactly once each', async () => {
    const user = userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });
    const spy = vi.fn();
    const outside = document.createElement('button');
    outside.textContent = 'outside';
    document.body.appendChild(outside);

    const { rerender, unmount } = render(<Plain selectedIds={['FR']} onSelectionChange={spy} />);
    await user.click(q.trigger()); // open
    await user.type(q.search(), 'a'); // typing
    await user.keyboard('{ArrowDown}{ArrowUp}'); // arrows
    await user.hover(q.option('Spain')); // hover
    await user.tab(); // Tab to Clear all
    await user.tab({ shift: true });
    await user.keyboard('{Escape}'); // close
    await user.click(q.trigger());
    await user.click(outside); // outside pointer
    rerender(<Plain selectedIds={['FR']} onSelectionChange={spy} items={[...COUNTRIES]} />);
    rerender(<Plain selectedIds={['ES']} onSelectionChange={spy} />);
    rerender(<Plain selectedIds={['ES']} onSelectionChange={spy} disabled />);
    rerender(<Plain selectedIds={['ES']} onSelectionChange={spy} />);
    expect(spy).not.toHaveBeenCalled();

    await user.click(q.trigger());
    await user.clear(q.search());
    await user.keyboard('{Enter}');
    expect(spy).toHaveBeenCalledTimes(1);
    await user.click(q.option('Italy'));
    expect(spy).toHaveBeenCalledTimes(2);
    await user.click(q.clear() as HTMLButtonElement);
    expect(spy).toHaveBeenCalledTimes(3);
    expect(spy.mock.calls.map((c) => c[0])).toEqual([['ES', 'FR'], ['ES', 'IT'], []]);

    unmount();
    expect(spy).toHaveBeenCalledTimes(3);
    outside.remove();
  });

  it('failure guard: pointerdown / mousedown alone never emit', async () => {
    const user = userEvent.setup();
    const spy = vi.fn();
    render(<Plain onSelectionChange={spy} />);
    await user.click(q.trigger());
    fireEvent.pointerDown(q.option('Spain'));
    fireEvent.mouseDown(q.option('Spain'));
    fireEvent.pointerUp(q.option('Spain'));
    fireEvent.mouseUp(q.option('Spain'));
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('INV-12: identity is getItemId, never object identity', () => {
  it('rebuilding items with new objects keeps active option, query, selection and open state', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Plain selectedIds={['DE']} />);
    await user.click(q.trigger());
    await user.type(q.search(), 'e');
    await user.keyboard('{ArrowDown}{ArrowDown}');
    const before = {
      active: activeOptionLabel(),
      activeId: q.active()[0]?.id,
      flags: q.selectedFlags(),
      labels: q.labels(),
    };
    expect(before.active).toBe('Georgia');

    for (let i = 0; i < 3; i += 1) {
      rerender(<Plain selectedIds={['DE']} items={COUNTRIES.map((c) => ({ ...c }))} />);
    }
    expect(q.dialog()).not.toBeNull();
    expect(q.search().value).toBe('e');
    expect(q.labels()).toEqual(before.labels);
    expect(q.selectedFlags()).toEqual(before.flags);
    expect(activeOptionLabel()).toBe(before.active);
    expect(before.activeId).toBe(`${q.listbox().id}-opt-3`); // the second Georgia (US-GA)
    expect(q.active()[0]?.id).toBe(before.activeId);
  });
});

describe('INV-13 / INV-18: duplicate ids behave deterministically and warn once in dev', () => {
  const dupes: readonly Country[] = [
    { code: 'X', name: 'One' },
    { code: 'X', name: 'Two' },
    { code: 'Y', name: 'Three' },
  ];

  it('separate options, distinct DOM ids, shared aria-selected, toggled by the INV-10 rule', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled items={dupes} onChange={onChange} />);
    await user.click(q.trigger());
    expect(q.labels()).toEqual(['One', 'Two', 'Three']);
    expect(new Set(q.options().map((o) => o.id)).size).toBe(3);
    await user.click(q.option('Two'));
    expect(onChange).toHaveBeenLastCalledWith(['X']);
    expect(q.selectedFlags()).toEqual(['true', 'true', 'false']);
    await user.click(q.option('One'));
    expect(onChange).toHaveBeenLastCalledWith([]);
    expect(q.selectedFlags()).toEqual(['false', 'false', 'false']);
  });

  it('one warn naming the id per instance across rerenders', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { rerender } = render(<Plain items={dupes} />);
    for (let i = 0; i < 5; i += 1) rerender(<Plain items={[...dupes]} />);
    const msgs = kitWarns(warn);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toContain('Duplicate item id "X"');
  });

  it('two instances warn independently (per instance, not per module)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(
      <>
        <Plain items={dupes} />
        <Plain items={dupes} />
      </>
    );
    expect(kitWarns(warn)).toHaveLength(2);
  });

  it('INV-18: both conditions and 10 rerenders give exactly 2 warns and never throw', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const el = (
      <SearchableMultiSelect
        items={dupes}
        getItemId={countryId}
        getItemLabel={countryLabel}
        selectedIds={[]}
        onSelectionChange={() => undefined}
      />
    );
    const { rerender } = render(el);
    for (let i = 0; i < 10; i += 1) expect(() => rerender(el)).not.toThrow();
    expect(kitWarns(warn)).toHaveLength(2);
  });

  it('production build: neither diagnostic logs', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubEnv('NODE_ENV', 'production');
    vi.resetModules();
    const mod = await import('../searchable-multi-select');
    render(
      <mod.SearchableMultiSelect
        items={dupes}
        getItemId={countryId}
        getItemLabel={countryLabel}
        selectedIds={[]}
        onSelectionChange={() => undefined}
      />
    );
    expect(kitWarns(warn)).toEqual([]);
  });

  it('boundary: unique ids and a name → no warn at all', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    render(<Plain />);
    expect(kitWarns(warn)).toEqual([]);
  });
});

describe('INV-14: duplicate labels with distinct ids are independent options', () => {
  it('"geo" lists both Georgias; each toggles only its own id', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    await user.click(q.trigger());
    await user.type(q.search(), 'geo');
    const [ge, usga] = q.options() as [HTMLElement, HTMLElement];
    expect(q.labels()).toEqual(['Georgia', 'Georgia']);
    expect(ge.id).not.toBe(usga.id);
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenLastCalledWith(['GE']);
    expect(q.selectedFlags()).toEqual(['true', 'false']);
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenLastCalledWith(['GE', 'US-GA']);
    await user.click(usga);
    expect(onChange).toHaveBeenLastCalledWith(['GE']);
    expect(q.selectedFlags()).toEqual(['true', 'false']);
  });
});

class Boundary extends React.Component<{ readonly children: React.ReactNode }, { error: unknown }> {
  override state = { error: null as unknown };
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  override render() {
    return this.state.error ? <p data-testid="caught">caught</p> : this.props.children;
  }
}

describe('INV-15: total rendering — nothing the kit owns throws', () => {
  it('seeded generated table: arbitrary ids, labels, counts and selections never throw', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const user = userEvent.setup();
    const rand = seeded(15);
    const chars = ['a', 'B', ' ', '"', '#', ':', '🙂', '.', '(', '\\', ''];
    const pick = () => chars[Math.floor(rand() * chars.length)] as string;
    const str = (max: number) => Array.from({ length: Math.floor(rand() * max) }, pick).join('');

    for (let run = 0; run < 20; run += 1) {
      const n = Math.floor(rand() * 51);
      const items: Country[] = Array.from({ length: n }, () => ({ code: str(4), name: str(6) }));
      if (run === 0) items.push({ code: 'long', name: 'L'.repeat(10_000) });
      const selected = Array.from({ length: Math.floor(rand() * (n + 3)) }, () => str(4));
      if (run === 1) selected.push(...items.map((i) => i.code));
      const { unmount } = render(<Plain items={items} selectedIds={selected} />);
      await user.click(q.trigger());
      await user.keyboard('{ArrowDown}{Enter}');
      const query = str(3);
      if (query) await user.type(q.search(), query);
      await user.keyboard('{ArrowUp}{Enter}');
      expect(q.dialog()).not.toBeNull();
      unmount();
    }
  });

  it.each([
    { name: 'items = []', props: { items: [] } },
    { name: 'unknown, duplicate and empty selectedIds', props: { selectedIds: ['?', '?', ''] } },
    {
      name: 'more selected than items',
      props: { selectedIds: Array.from({ length: 20 }, (_, i) => `${i}`) },
    },
    { name: "'' labels", props: { items: [{ code: 'a', name: '' }] } },
  ] as const)('boundary: $name renders closed and open', async ({ props }) => {
    const user = userEvent.setup();
    expect(() => render(<Plain {...(props as Partial<Props>)} />)).not.toThrow();
    await user.click(q.trigger());
    expect(q.dialog()).not.toBeNull();
  });

  it('failure: a throwing consumer callback propagates the same error to an error boundary', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const user = userEvent.setup();
    const boom = new Error('filter blew up');
    render(
      <Boundary>
        <Plain
          filterItem={() => {
            throw boom;
          }}
        />
      </Boundary>
    );
    await user.click(q.trigger());
    let thrown: unknown;
    try {
      await user.type(q.search(), 'x');
    } catch (e) {
      thrown = e;
    }
    expect(thrown === undefined || thrown === boom).toBe(true);
    expect(screen.getByTestId('caught')).toBeTruthy();
  });

  it('failure: a throwing onSelectionChange is not swallowed', async () => {
    const boom = new Error('consumer handler failed');
    const user = userEvent.setup();
    const errors: unknown[] = [];
    const onError = (e: ErrorEvent) => {
      errors.push(e.error);
      e.preventDefault();
    };
    window.addEventListener('error', onError);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <Plain
        onSelectionChange={() => {
          throw boom;
        }}
      />
    );
    await user.click(q.trigger());
    await act(async () => {
      fireEvent.click(q.option('Spain'));
    });
    window.removeEventListener('error', onError);
    expect(errors).toContain(boom);
  });
});

describe('INV-16: only the ten pass-throughs reach the trigger; the ref is the trigger', () => {
  it('object and callback refs resolve to the trigger button and focus it', () => {
    const objectRef = React.createRef<HTMLButtonElement>();
    let callbackEl: HTMLButtonElement | null = null;
    render(
      <>
        <Plain ref={objectRef} aria-label="A" />
        <Plain ref={(el) => void (callbackEl = el)} aria-label="B" />
      </>
    );
    expect(objectRef.current).toBe(screen.getByRole('combobox', { name: 'A' }));
    expect(callbackEl).toBe(screen.getByRole('combobox', { name: 'B' }));
    objectRef.current?.focus();
    expect(document.activeElement).toBe(objectRef.current);
  });

  it('id, aria-describedby, aria-invalid, aria-required land on the trigger only', async () => {
    const user = userEvent.setup();
    render(
      <>
        <p id="h">Help</p>
        <Plain id="countries" aria-describedby="h" aria-invalid aria-required />
      </>
    );
    const trigger = q.trigger();
    expect(trigger.id).toBe('countries');
    expect(trigger.getAttribute('aria-describedby')).toBe('h');
    expect(trigger.getAttribute('aria-invalid')).toBe('true');
    expect(trigger.getAttribute('aria-required')).toBe('true');
    await user.click(trigger);
    for (const el of [q.dialog(), q.search(), q.listbox(), q.status()]) {
      for (const a of ['aria-describedby', 'aria-invalid', 'aria-required']) {
        expect(el?.hasAttribute(a), `${a} on ${el?.getAttribute('data-slot')}`).toBe(false);
      }
    }
    expect(document.querySelectorAll('[aria-describedby="h"]')).toHaveLength(1);
  });

  it('boundary: undefined pass-throughs leave the attribute absent, never ""', () => {
    render(
      <Plain
        id={undefined}
        aria-describedby={undefined}
        aria-invalid={undefined}
        aria-required={undefined}
        aria-labelledby={undefined}
      />
    );
    const trigger = q.trigger();
    for (const a of [
      'id',
      'aria-describedby',
      'aria-invalid',
      'aria-required',
      'aria-labelledby',
    ]) {
      expect(trigger.hasAttribute(a), a).toBe(false);
    }
  });

  it('className merges with the kit classes', () => {
    const { rerender } = render(<Plain />);
    const kit = q.trigger().className.split(/\s+/);
    rerender(<Plain className="x-consumer" />);
    const merged = q.trigger().className.split(/\s+/);
    expect(merged).toContain('x-consumer');
    expect(merged).toContain('justify-between');
    expect(merged).toContain('border');
    expect(kit.every((c) => merged.includes(c))).toBe(true);
  });

  it('disabled reaches the trigger as native disabled', () => {
    render(<Plain disabled />);
    expect(q.trigger().disabled).toBe(true);
  });

  it('onBlur fires once when opening moves focus to the search box (OQ-3)', async () => {
    const user = userEvent.setup();
    const onBlur = vi.fn();
    render(<Plain onBlur={onBlur} />);
    await user.click(q.trigger());
    expect(document.activeElement).toBe(q.search());
    expect(onBlur).toHaveBeenCalledTimes(1);
    expect(onBlur.mock.calls[0]?.[0].target).toBe(q.trigger());
  });
});

describe('INV-20: filtering never changes selection', () => {
  it('hidden selections stay counted and Clear all clears them too', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled initial={['FR', 'ES']} onChange={onChange} />);
    await user.click(q.trigger());
    await user.type(q.search(), 'spa');
    expect(q.labels()).toEqual(['Spain']);
    expect(q.trigger().textContent).toBe('2 selected');
    expect(q.summary()?.textContent).toContain('2 selected');
    await user.keyboard('{Escape}');
    expect(onChange).not.toHaveBeenCalled();
    await user.click(q.trigger());
    await user.click(q.clear() as HTMLButtonElement);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith([]);
    await user.clear(q.search());
    expect(q.option('France').getAttribute('aria-selected')).toBe('false');
    expect(screen.getByTestId('readout').textContent).toBe('None');
  });
});
