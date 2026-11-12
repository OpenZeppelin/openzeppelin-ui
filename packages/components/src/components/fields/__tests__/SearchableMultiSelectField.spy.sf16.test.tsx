/**
 * @vitest-environment jsdom
 *
 * 005 SF-16 · What the field hands SF-15 (module spies; file-wide vi.mock, so kept apart).
 * INV-7 the form value is the very array SF-15 emitted, INV-9 / INV-22 `selectedIds` is one
 * frozen sentinel across renders and never enters form state, INV-20 a label click is one
 * onOpenChange(true), INV-22 navigation / typing cause no form re-render and arrows never
 * rebuild the list model (1,000 items).
 * artifacts/005-uikit-requests/sf-16-searchable-multi-select-field/03-invariants.md
 */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import type { FieldValues } from 'react-hook-form';

import type { SearchableMultiSelectProps } from '../../ui/searchable-multi-select';
import * as listModel from '../../ui/searchable-multi-select/list-model';
import { FieldHarness, type FieldOptions } from './smsf.sf16-harness';
import { api, FIELD_NAME, newHandle, q, type Country, type FieldHandle } from './smsf.sf16-kit';

type Seen = SearchableMultiSelectProps<Country>;
const seen: { props: Seen[]; emitted: string[][]; opens: boolean[] } = {
  props: [],
  emitted: [],
  opens: [],
};

vi.mock('../../ui/searchable-multi-select', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../ui/searchable-multi-select')>();
  function Spy(props: Seen): React.ReactElement {
    seen.props.push(props);
    return (
      <real.SearchableMultiSelect<Country>
        {...props}
        onSelectionChange={(ids) => {
          seen.emitted.push(ids);
          props.onSelectionChange(ids);
        }}
        onOpenChange={(open) => {
          seen.opens.push(open);
          props.onOpenChange?.(open);
        }}
      />
    );
  }
  return { ...real, SearchableMultiSelect: Spy };
});

vi.mock('../../ui/searchable-multi-select/list-model', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../ui/searchable-multi-select/list-model')>();
  return { ...real, buildListModel: vi.fn(real.buildListModel) };
});

beforeEach(() => {
  seen.props.length = 0;
  seen.emitted.length = 0;
  seen.opens.length = 0;
  vi.mocked(listModel.buildListModel).mockClear();
});
afterEach(cleanup);

const setup = () => userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });

function mount(
  options: FieldOptions = {},
  defaultValues?: FieldValues,
  onSiblingRender?: () => void
) {
  const handle = newHandle();
  const utils = render(
    <FieldHarness
      handle={handle}
      options={options}
      defaultValues={defaultValues}
      onSiblingRender={onSiblingRender}
    />
  );
  const rerender = () =>
    utils.rerender(
      <FieldHarness
        handle={handle}
        options={options}
        defaultValues={defaultValues}
        onSiblingRender={onSiblingRender}
      />
    );
  return { handle, rerender };
}

const value = (h: FieldHandle): unknown => api(h).getValues(FIELD_NAME);
const lastSelectedIds = (): readonly string[] => {
  const last = seen.props.at(-1);
  if (!last) throw new Error('field never rendered SF-15');
  return last.selectedIds;
};

describe('INV-7: the form value is the very array SF-15 emitted', () => {
  it('pick → getValues is the emitted reference; next render passes it back as selectedIds', async () => {
    const user = setup();
    const { handle } = mount();
    await user.click(q.trigger());
    await user.click(q.option('Italy'));
    await user.click(q.option('France'));
    expect(seen.emitted).toEqual([['IT'], ['IT', 'FR']]);
    expect(value(handle)).toBe(seen.emitted.at(-1));
    // field.value comes from RHF's useWatch, which snapshots (clones) once per value change.
    expect(lastSelectedIds()).toEqual(seen.emitted.at(-1));
  });

  it('array form value: SF-15 gets one stable reference across unrelated re-renders', () => {
    const { rerender } = mount({}, { countries: ['FR', 'ZZ'] });
    const first = lastSelectedIds();
    rerender();
    rerender();
    expect(lastSelectedIds()).toBe(first);
    expect(first).toEqual(['FR', 'ZZ']);
  });

  it('failure guard: the field emits nothing on mount, open and close', async () => {
    const user = setup();
    mount({}, { countries: ['FR'] });
    await user.click(q.trigger());
    await user.keyboard('{Escape}');
    expect(seen.emitted).toEqual([]);
  });
});

describe('INV-9 / INV-22: non-array → one frozen sentinel, never in form state', () => {
  it.each([undefined, null, 'FR'])('value %j: same frozen [] across renders', (v) => {
    const { rerender, handle } = mount({}, { countries: v });
    const first = lastSelectedIds();
    rerender();
    rerender();
    expect(lastSelectedIds()).toBe(first);
    expect(first).toEqual([]);
    expect(Object.isFrozen(first)).toBe(true);
    expect(value(handle)).not.toBe(first);
  });

  it('the sentinel is shared by every field instance (module scope)', () => {
    mount({}, { countries: undefined });
    const a = lastSelectedIds();
    cleanup();
    mount({}, { countries: null });
    expect(lastSelectedIds()).toBe(a);
  });

  it('first pick from the sentinel writes a fresh array, not the sentinel', async () => {
    const user = setup();
    const { handle } = mount({}, { countries: undefined });
    const sentinel = lastSelectedIds();
    await user.click(q.trigger());
    await user.click(q.option('France'));
    expect(value(handle)).not.toBe(sentinel);
    expect(Object.isFrozen(value(handle))).toBe(false);
  });
});

describe('INV-20: a label click is exactly one onOpenChange(true), no emit', () => {
  it('label click → opens [true]; Escape → [true, false]', async () => {
    const user = setup();
    mount();
    await user.click(screen.getByText('Allowed countries'));
    expect(seen.opens).toEqual([true]);
    expect(seen.emitted).toEqual([]);
    await user.keyboard('{Escape}');
    expect(seen.opens).toEqual([true, false]);
  });
});

describe('INV-22: no per-render churn over SF-15 (1,000 items)', () => {
  const MANY: readonly Country[] = Array.from({ length: 1000 }, (_, i) => ({
    code: `C${i}`,
    name: `Country ${String(i).padStart(4, '0')}`,
  }));

  it('arrows: no list-model rebuild, no form re-render; typing: no form re-render', async () => {
    const user = setup();
    let hostRenders = 0;
    mount({ items: MANY }, undefined, () => {
      hostRenders += 1;
    });
    await user.click(q.trigger());
    const renders0 = hostRenders;
    const builds0 = vi.mocked(listModel.buildListModel).mock.calls.length;
    for (let i = 0; i < 50; i += 1) await user.keyboard('{ArrowDown}');
    expect(vi.mocked(listModel.buildListModel).mock.calls.length).toBe(builds0);
    await user.type(q.search() as HTMLInputElement, '012');
    expect(hostRenders).toBe(renders0);
    expect(q.options().length).toBeGreaterThan(0);
  });

  it('sensitivity control: a pick does re-render the form host', async () => {
    const user = setup();
    let hostRenders = 0;
    mount({}, undefined, () => {
      hostRenders += 1;
    });
    await user.click(q.trigger());
    const before = hostRenders;
    await user.click(q.option('France'));
    expect(hostRenders).toBeGreaterThan(before);
  });
});
