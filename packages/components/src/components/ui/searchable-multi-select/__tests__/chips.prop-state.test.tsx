/**
 * Chips mode prop and state contract (jsdom): the selected-item lookup the chips are built
 * from, one list feeding both the formatters and the chips, the chips deriving from
 * `selectedIds` on every render, the copy props, and the public surface.
 */
import { act, cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

import * as Root from '../../../../index';
import {
  SearchableMultiSelectField,
  type SearchableMultiSelectFieldProps,
} from '../../../../index';
import * as UiBarrel from '../../index';
import { SearchableMultiSelect, type SearchableMultiSelectProps } from '../index';
import { resolveSelectedItems } from '../list-model';
import { chips, Consumer, newConsumer } from './chips.harness';
import { Controlled, COUNTRIES, countryId, countryLabel, q, seeded, type Country } from './helpers';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const [FR, ES] = COUNTRIES as readonly [Country, Country];

describe('the selected-item lookup the chips are built from', () => {
  it('special ids resolve like any other string, never to Object.prototype', () => {
    const items: Country[] = [
      { code: '__proto__', name: 'Proto' },
      { code: 'constructor', name: 'Ctor' },
      { code: '', name: 'Empty' },
      { code: 'toString', name: 'Str' },
    ];
    expect(
      resolveSelectedItems(items, ['constructor', '', '__proto__', 'toString'], countryId).map(
        countryLabel
      )
    ).toEqual(['Ctor', 'Empty', 'Proto', 'Str']);
    // Not present: still nothing, even though plain objects have these keys.
    expect(
      resolveSelectedItems(COUNTRIES, ['constructor', '__proto__', 'hasOwnProperty'], countryId)
    ).toEqual([]);
  });

  it('special ids get chips, and stale special ids do not', () => {
    const items: Country[] = [
      { code: 'constructor', name: 'Ctor' },
      { code: '', name: 'Empty' },
    ];
    render(
      <Controlled
        showSelected="chips"
        items={items}
        initial={['__proto__', '', 'constructor', 'valueOf']}
      />
    );
    expect(chips.labels()).toEqual(['Empty', 'Ctor']);
    expect(chips.trigger().textContent).toBe('4 selected');
  });

  it('property: ordered, distinct, first item wins, stale skipped, inputs untouched', () => {
    const rand = seeded(6);
    for (let run = 0; run < 300; run += 1) {
      const items = Object.freeze(
        Array.from({ length: Math.floor(rand() * 15) }, (_, i) => ({
          code: `k${Math.floor(rand() * 10)}`,
          name: `n${i}`,
        }))
      );
      const ids = Object.freeze(
        Array.from({ length: Math.floor(rand() * 15) }, () => `k${Math.floor(rand() * 13)}`)
      );
      const getId = vi.fn(countryId);
      const out = resolveSelectedItems(items, ids, getId);
      // Reference model: first occurrence of each id that has an item; first such item.
      const seen = new Set<string>();
      const expected: Country[] = [];
      for (const id of ids) {
        if (seen.has(id)) continue;
        seen.add(id);
        const hit = items.find((it) => it.code === id);
        if (hit) expected.push(hit);
      }
      expect(out, `run ${run}`).toEqual(expected);
      for (let i = 0; i < out.length; i += 1) expect(out[i]).toBe(expected[i]);
      expect(getId.mock.calls.length, `run ${run}`).toBeLessThanOrEqual(items.length);
    }
  });
});

describe('one resolved list feeds the formatters and the chips', () => {
  it('the formatter gets the chips, in chip order, when the picks are not in list order', () => {
    const count = vi.fn((n: number, _t: number, _picked: readonly Country[]) => `${n} picked`);
    const summary = vi.fn((n: number, _t: number, _picked: readonly Country[]) => `${n} sum`);
    render(
      <Controlled
        showSelected="chips"
        initial={['ES', 'XX', 'FR']}
        formatSelectedCount={count}
        formatSelectionSummary={summary}
      />
    );
    const last = count.mock.calls.at(-1);
    expect(last?.[0]).toBe(3);
    expect(last?.[2].map(countryLabel)).toEqual(chips.labels());
    expect(chips.labels()).toEqual(['Spain', 'France']);
  });

  it('after a removal, both agree again', async () => {
    const user = userEvent.setup();
    const count = vi.fn(
      (n: number, _t: number, picked: readonly Country[]) =>
        `${n}: ${picked.map(countryLabel).join('|')}`
    );
    render(
      <Controlled showSelected="chips" initial={['DE', 'ES', 'FR']} formatSelectedCount={count} />
    );
    await user.click(chips.remove('Spain'));
    expect(chips.trigger().textContent).toBe('2: Germany|France');
    expect(chips.labels()).toEqual(['Germany', 'France']);
  });

  it('the lookup does not rerun for an unrelated prop change', () => {
    const getItemId = vi.fn(countryId);
    const props = {
      'aria-label': 'Countries',
      showSelected: 'chips' as const,
      items: COUNTRIES,
      getItemId,
      getItemLabel: countryLabel,
      selectedIds: ['ES', 'FR'],
      onSelectionChange: () => {},
    };
    const { rerender } = render(<SearchableMultiSelect {...props} placeholder="A" />);
    const before = getItemId.mock.calls.length;
    rerender(<SearchableMultiSelect {...props} placeholder="B" />);
    rerender(<SearchableMultiSelect {...props} placeholder="C" className="x" />);
    expect(getItemId.mock.calls.length).toBe(before);
    // A new selection array does rerun it.
    rerender(<SearchableMultiSelect {...props} selectedIds={['FR']} />);
    expect(getItemId.mock.calls.length).toBeGreaterThan(before);
    expect(chips.labels()).toEqual(['France']);
  });
});

describe('the kit keeps no copy of the selection', () => {
  it('a new selectedIds from the consumer shows in the same render, without any event', () => {
    const props = {
      'aria-label': 'Countries',
      showSelected: 'chips' as const,
      items: COUNTRIES,
      getItemId: countryId,
      getItemLabel: countryLabel,
      onSelectionChange: () => {},
    };
    const { rerender } = render(<SearchableMultiSelect {...props} selectedIds={['ES', 'FR']} />);
    expect(chips.labels()).toEqual(['Spain', 'France']);
    rerender(<SearchableMultiSelect {...props} selectedIds={['DE']} />);
    expect(chips.labels()).toEqual(['Germany']);
    rerender(<SearchableMultiSelect {...props} selectedIds={[]} />);
    expect(chips.list()).toBeNull();
    rerender(<SearchableMultiSelect {...props} selectedIds={['IT', 'ES']} />);
    expect(chips.labels()).toEqual(['Italy', 'Spain']);
  });

  it('a new items list relabels the chips and drops ids that no longer resolve', () => {
    const props = {
      'aria-label': 'Countries',
      showSelected: 'chips' as const,
      getItemId: countryId,
      getItemLabel: countryLabel,
      selectedIds: ['ES', 'FR'],
      onSelectionChange: () => {},
    };
    const { rerender } = render(<SearchableMultiSelect {...props} items={COUNTRIES} />);
    rerender(
      <SearchableMultiSelect {...props} items={[{ code: 'FR', name: 'République française' }]} />
    );
    expect(chips.labels()).toEqual(['République française']);
    expect(chips.trigger().textContent).toBe('2 selected');
  });

  it('an external reset clears the announcement too', async () => {
    const user = userEvent.setup();
    const handle = newConsumer();
    render(<Consumer handle={handle} initial={['ES', 'FR']} />);
    await user.click(chips.remove('Spain'));
    expect(chips.status().textContent).toBe('Spain removed');
    act(() => handle.set(['DE', 'IT']));
    expect(chips.labels()).toEqual(['Germany', 'Italy']);
    expect(chips.status().textContent).toBe('');
  });
});

describe('copy props', () => {
  it('defaults: "Remove {label}" and "{label} removed"', async () => {
    const user = userEvent.setup();
    render(<Controlled showSelected="chips" initial={['FR']} />);
    const button = chips.remove('France');
    expect(button.getAttribute('aria-label')).toBe('Remove France');
    await user.click(button);
    expect(chips.status().textContent).toBe('France removed');
  });

  it('both get the chip label and its item, and their result is used as is', async () => {
    const user = userEvent.setup();
    const removeLabel = vi.fn((label: string, item: Country) => `  Quitar ${label} (${item.code})`);
    const announce = vi.fn((label: string, item: Country) => `${label}/${item.code} quitado `);
    render(
      <Controlled
        showSelected="chips"
        initial={['ES', 'FR']}
        formatRemoveLabel={removeLabel}
        formatRemovedAnnouncement={announce}
      />
    );
    expect(removeLabel).toHaveBeenCalledWith('France', FR);
    expect(removeLabel).toHaveBeenCalledWith('Spain', ES);
    const button = chips
      .removes()
      .find((b) => b.getAttribute('aria-label') === '  Quitar France (FR)') as HTMLButtonElement;
    expect(button).toBeTruthy();
    expect(announce).not.toHaveBeenCalled();
    await user.click(button);
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith('France', FR);
    expect(chips.status().textContent).toBe('France/FR quitado ');
  });

  it('boundary: an empty string is used as is, with no fallback', () => {
    render(<Controlled showSelected="chips" initial={['FR']} formatRemoveLabel={() => ''} />);
    expect(chips.removes()[0]?.getAttribute('aria-label')).toBe('');
  });

  it('failure: a removal the consumer refuses is never announced', async () => {
    const user = userEvent.setup();
    const announce = vi.fn((label: string) => `${label} gone`);
    render(
      <Consumer
        handle={newConsumer()}
        policy="ignore"
        initial={['ES', 'FR']}
        formatRemovedAnnouncement={announce}
      />
    );
    await user.click(chips.remove('Spain'));
    expect(announce).not.toHaveBeenCalled();
    expect(chips.status().textContent).toBe('');
  });

  it('count mode never calls either copy formatter', async () => {
    const user = userEvent.setup();
    const removeLabel = vi.fn(() => 'x');
    const announce = vi.fn(() => 'y');
    render(
      <Controlled
        initial={['ES', 'FR']}
        formatRemoveLabel={removeLabel}
        formatRemovedAnnouncement={announce}
      />
    );
    await user.click(q.trigger());
    await user.click(q.option('Spain'));
    await user.keyboard('{Escape}');
    expect(removeLabel).not.toHaveBeenCalled();
    expect(announce).not.toHaveBeenCalled();
  });
});

describe('the public surface grows only by four optional props', () => {
  it('no new runtime export from the package root or the ui barrel', () => {
    for (const name of ['SelectedChips', 'resolveSelectedItems', 'SelectedEntry']) {
      expect(Object.keys(Root)).not.toContain(name);
      expect(Object.keys(UiBarrel)).not.toContain(name);
    }
    expect(Root.SearchableMultiSelect).toBe(SearchableMultiSelect);
    expect(Root.SearchableMultiSelectField).toBe(SearchableMultiSelectField);
  });

  it('the four props are optional on both prop types, with the documented shapes', () => {
    type P = SearchableMultiSelectProps<Country>;
    type F = SearchableMultiSelectFieldProps<Country>;
    expectTypeOf<P['showSelected']>().toEqualTypeOf<'count' | 'chips' | undefined>();
    expectTypeOf<F['showSelected']>().toEqualTypeOf<'count' | 'chips' | undefined>();
    expectTypeOf<P['formatRemoveLabel']>().toEqualTypeOf<
      ((label: string, item: Country) => string) | undefined
    >();
    expectTypeOf<F['formatRemoveLabel']>().toEqualTypeOf<P['formatRemoveLabel']>();
    expectTypeOf<P['formatRemovedAnnouncement']>().toEqualTypeOf<
      ((label: string, item: Country) => string) | undefined
    >();
    expectTypeOf<F['formatRemovedAnnouncement']>().toEqualTypeOf<P['formatRemovedAnnouncement']>();
    expectTypeOf<P['chipClassName']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<F['chipClassName']>().toEqualTypeOf<P['chipClassName']>();

    // Code written before these props still compiles: none of them is required.
    const minimal: P = {
      items: COUNTRIES,
      getItemId: countryId,
      getItemLabel: countryLabel,
      selectedIds: [],
      onSelectionChange: () => {},
    };
    expect(minimal.showSelected).toBeUndefined();
    expect(minimal.chipClassName).toBeUndefined();

    const bad: P = {
      ...minimal,
      // @ts-expect-error only 'count' and 'chips' are accepted
      showSelected: 'list',
    };
    expect(bad).toBeTruthy();
    const badLabel: P = {
      ...minimal,
      // @ts-expect-error the remove label must be a string
      formatRemoveLabel: () => 1,
    };
    expect(badLabel).toBeTruthy();
    const badChip: P = {
      ...minimal,
      // @ts-expect-error chipClassName must be a string
      chipClassName: 1,
    };
    expect(badChip).toBeTruthy();
  });
});

describe('chipClassName merges onto every chip after the kit chrome', () => {
  it('a border override is present on each chip and replaces the default border colour class', () => {
    render(
      <Controlled showSelected="chips" initial={['ES', 'FR']} chipClassName="border-primary" />
    );
    const items = Array.from(
      document.querySelectorAll('[data-slot="searchable-multi-select-chip"]')
    );
    expect(items).toHaveLength(2);
    for (const li of items) {
      const cls = (li as HTMLElement).className.split(/\s+/);
      expect(cls).toContain('border-primary');
      expect(cls).not.toContain('border-border');
      expect(cls).toEqual(expect.arrayContaining(['border', 'bg-background']));
    }
  });

  it('boundary: an empty string leaves the kit chrome alone', () => {
    render(<Controlled showSelected="chips" initial={['ES']} chipClassName="" />);
    const li = document.querySelector('[data-slot="searchable-multi-select-chip"]') as HTMLElement;
    expect(li.className.split(/\s+/)).toEqual(
      expect.arrayContaining(['border', 'border-border', 'bg-background'])
    );
  });

  it('failure: count mode never receives chipClassName on a chip', () => {
    render(<Controlled initial={['ES', 'FR']} chipClassName="border-primary" />);
    expect(document.querySelector('[data-slot="searchable-multi-select-chip"]')).toBeNull();
    expect(document.querySelector('[data-slot="searchable-multi-select-chips"]')).toBeNull();
  });

  it('read-only chips still take chipClassName', () => {
    render(
      <Controlled showSelected="chips" readOnly initial={['ES']} chipClassName="border-primary" />
    );
    const li = document.querySelector('[data-slot="searchable-multi-select-chip"]') as HTMLElement;
    expect(li.className.split(/\s+/)).toContain('border-primary');
  });
});
