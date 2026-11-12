/**
 * @vitest-environment jsdom
 *
 * SF-15 · Public surface and type contract — INV-7 (exactly one component +
 * props type), INV-9 (controlled-only types), INV-16 (no other trigger props).
 *
 * The package `tsc` excludes *.test.tsx; the `@ts-expect-error` probes are checked
 * with `tsc -p tsconfig.searchable-multi-select-tests.json` (05-tests.md, Test Notes).
 * A probe that stops erroring fails that check as an unused directive.
 * artifacts/005-uikit-requests/sf-15-searchable-multi-select/03-invariants.md
 */
import { render } from '@testing-library/react';
import { describe, expect, expectTypeOf, it } from 'vitest';

import * as Root from '../../../../index';
import type * as RootTypes from '../../../../index';
import * as UiBarrel from '../../index';
import { SearchableMultiSelect, type SearchableMultiSelectProps } from '../../index';

const INTERNAL_NAMES = [
  'SearchableSelectCore',
  'buildListModel',
  'firstEnabledIndex',
  'stepEnabledIndex',
  'toggleId',
];

describe('INV-7: the public surface is exactly one component and its props type', () => {
  it('SearchableMultiSelect is exported from the package root and the ui barrel', () => {
    expect(Root.SearchableMultiSelect).toBe(SearchableMultiSelect);
    expect(UiBarrel.SearchableMultiSelect).toBe(SearchableMultiSelect);
    expect(typeof SearchableMultiSelect).toBe('function');
  });

  it('failure guard: no internal value is reachable from the root or the barrel', () => {
    for (const name of INTERNAL_NAMES) {
      expect(Object.keys(Root), name).not.toContain(name);
      expect(Object.keys(UiBarrel), name).not.toContain(name);
    }
    // The ui barrel is SF-15's; the package root also carries SF-16's field wrapper.
    expect(Object.keys(UiBarrel).filter((k) => /searchable/i.test(k))).toEqual([
      'SearchableMultiSelect',
    ]);
  });

  it('existing neighbours are still exported (additive change)', () => {
    for (const name of [
      'NetworkSelector',
      'Popover',
      'PopoverContent',
      'PopoverTrigger',
      'Select',
    ]) {
      expect(Object.keys(Root), name).toContain(name);
    }
  });

  it('type level: internal types are not on the root', () => {
    // @ts-expect-error — the core stays internal (D1)
    type _Core = typeof RootTypes.SearchableSelectCore;
    // @ts-expect-error — list model types stay internal
    type _Option = RootTypes.ListOption<unknown>;
    // @ts-expect-error — list model types stay internal
    type _Model = RootTypes.ListModel<unknown>;
    // @ts-expect-error — core state types stay internal
    type _State = RootTypes.OptionState;
    // @ts-expect-error — core state types stay internal
    type _Trigger = RootTypes.TriggerState;
    expectTypeOf<RootTypes.SearchableMultiSelectProps<{ id: string }>>().toEqualTypeOf<
      SearchableMultiSelectProps<{ id: string }>
    >();
  });
});

describe('INV-7 / INV-9 / INV-16: prop types', () => {
  interface Fruit {
    readonly code: string;
    readonly label: string;
  }
  const FRUIT: readonly Fruit[] = [{ code: 'a', label: 'Apple' }];

  it('T is inferred from items: accessors need no annotation', () => {
    render(
      <SearchableMultiSelect
        aria-label="Fruit"
        items={FRUIT}
        getItemId={(f) => f.code}
        getItemLabel={(f) => f.label}
        filterItem={(f, query) => f.label.startsWith(query)}
        selectedIds={[]}
        onSelectionChange={() => undefined}
      />
    );
    expectTypeOf<SearchableMultiSelectProps<Fruit>['getItemId']>()
      .parameter(0)
      .toEqualTypeOf<Fruit>();
    expectTypeOf<SearchableMultiSelectProps<Fruit>['onSelectionChange']>()
      .parameter(0)
      .toEqualTypeOf<string[]>();
    expectTypeOf<SearchableMultiSelectProps<Fruit>['selectedIds']>().toEqualTypeOf<
      readonly string[]
    >();
  });

  it('failure: an accessor typed for another item shape is rejected', () => {
    const el = (
      <SearchableMultiSelect
        aria-label="Fruit"
        items={FRUIT}
        // @ts-expect-error — `name` is not on Fruit; T comes from items
        getItemId={(f) => f.name}
        getItemLabel={(f) => f.label}
        selectedIds={[]}
        onSelectionChange={() => undefined}
      />
    );
    expect(el).toBeTruthy();
  });

  it('INV-9: selection is controlled only — selectedIds and onSelectionChange are required, no default', () => {
    const base = {
      items: FRUIT,
      getItemId: (f: Fruit) => f.code,
      getItemLabel: (f: Fruit) => f.label,
    };
    // @ts-expect-error — selectedIds is required
    const noIds: SearchableMultiSelectProps<Fruit> = {
      ...base,
      onSelectionChange: () => undefined,
    };
    // @ts-expect-error — onSelectionChange is required
    const noHandler: SearchableMultiSelectProps<Fruit> = { ...base, selectedIds: [] };
    const withDefault: SearchableMultiSelectProps<Fruit> = {
      ...base,
      selectedIds: [],
      onSelectionChange: () => undefined,
      // @ts-expect-error — there is no uncontrolled mode
      defaultSelectedIds: [],
    };
    expect([noIds, noHandler, withDefault]).toHaveLength(3);
  });

  it('INV-16: button props outside the pass-through list do not type-check', () => {
    const base: SearchableMultiSelectProps<Fruit> = {
      items: FRUIT,
      getItemId: (f) => f.code,
      getItemLabel: (f) => f.label,
      selectedIds: [],
      onSelectionChange: () => undefined,
    };
    const probes: SearchableMultiSelectProps<Fruit>[] = [
      // @ts-expect-error — onClick would race the popover toggle
      { ...base, onClick: () => undefined },
      // @ts-expect-error — role is fixed to combobox
      { ...base, role: 'button' },
      // @ts-expect-error — type is fixed to button
      { ...base, type: 'submit' },
      // @ts-expect-error — the trigger owns its key handling
      { ...base, onKeyDown: () => undefined },
      // @ts-expect-error — the value is emitted through onSelectionChange, not a form name
      { ...base, name: 'countries' },
      // @ts-expect-error — no open-state control in SF-15
      { ...base, open: true },
    ];
    const allowed: SearchableMultiSelectProps<Fruit> = {
      ...base,
      id: 'x',
      className: 'c',
      disabled: true,
      onBlur: () => undefined,
      'aria-label': 'l',
      'aria-labelledby': 'lb',
      'aria-describedby': 'd',
      'aria-invalid': true,
      'aria-required': true,
      ref: { current: null },
    };
    expect([...probes, allowed]).toHaveLength(7);
  });
});
