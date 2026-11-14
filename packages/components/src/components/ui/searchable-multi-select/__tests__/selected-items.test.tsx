/**
 * The formatters' third argument: the selected items, in selection order.
 */
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SearchableMultiSelect } from '../index';
import { resolveSelectedItems } from '../list-model';
import { Controlled, COUNTRIES, countryId, q, type Country } from './helpers';

const [FR, ES, GE, USGA, DE, IT] = COUNTRIES as readonly [
  Country,
  Country,
  Country,
  Country,
  Country,
  Country,
];

describe('resolveSelectedItems', () => {
  it('returns the items in selection order, not list order', () => {
    expect(resolveSelectedItems(COUNTRIES, ['IT', 'FR', 'ES'], countryId)).toEqual([IT, FR, ES]);
  });

  it('boundary: no selection returns an empty list, the same one each time', () => {
    const a = resolveSelectedItems(COUNTRIES, [], countryId);
    expect(a).toEqual([]);
    expect(resolveSelectedItems(COUNTRIES, [], countryId)).toBe(a);
  });

  it('boundary: a repeated id yields its item once, at its first position', () => {
    expect(resolveSelectedItems(COUNTRIES, ['ES', 'FR', 'ES'], countryId)).toEqual([ES, FR]);
  });

  it('failure: ids with no item are left out', () => {
    expect(resolveSelectedItems(COUNTRIES, ['X', 'FR', 'Y'], countryId)).toEqual([FR]);
    expect(resolveSelectedItems(COUNTRIES, ['X'], countryId)).toEqual([]);
    expect(resolveSelectedItems([], ['FR'], countryId)).toEqual([]);
  });

  it('boundary: items sharing an id resolve to the first one', () => {
    const twin: Country = { code: 'GE', name: 'Other Georgia' };
    expect(resolveSelectedItems([...COUNTRIES, twin], ['GE'], countryId)).toEqual([GE]);
  });

  it('does not mutate its inputs', () => {
    const ids = Object.freeze(['DE', 'FR']);
    const items = Object.freeze([...COUNTRIES]);
    expect(resolveSelectedItems(items, ids, countryId)).toEqual([DE, FR]);
    expect(ids).toEqual(['DE', 'FR']);
  });

  it('calls the id accessor once per item', () => {
    const getItemId = vi.fn(countryId);
    resolveSelectedItems(COUNTRIES, ['FR', 'ES'], getItemId);
    expect(getItemId).toHaveBeenCalledTimes(COUNTRIES.length);
  });
});

describe('SearchableMultiSelect formatter selected items', () => {
  it('names the picks on the closed trigger, and the trigger keeps its accessible value', () => {
    render(
      <Controlled
        initial={['ES', 'FR', 'DE']}
        formatSelectedCount={(n, _t, picked) => `${picked.map((c) => c.name).join(' & ')} (${n})`}
      />
    );
    expect(q.trigger().textContent).toBe('Spain & France & Germany (3)');
    expect(q.trigger().getAttribute('aria-labelledby')).toContain('sms-label');
  });

  it('passes the same items to both formatters', async () => {
    const user = userEvent.setup();
    const count = vi.fn((n: number) => `${n}`);
    const summary = vi.fn((n: number) => `${n} chosen`);
    render(
      <Controlled
        initial={['IT', 'FR']}
        formatSelectedCount={count}
        formatSelectionSummary={summary}
      />
    );
    await user.click(q.trigger());
    expect(count).toHaveBeenLastCalledWith(2, 6, [IT, FR]);
    expect(summary).toHaveBeenLastCalledWith(2, 6, [IT, FR]);
  });

  it('stale ids are counted but have no entry', () => {
    const count = vi.fn((n: number) => `${n}`);
    render(<Controlled initial={['X', 'FR', 'Y']} formatSelectedCount={count} />);
    expect(count).toHaveBeenLastCalledWith(3, 6, [FR]);
  });

  it('duplicate ids are counted but yield one entry', () => {
    const count = vi.fn((n: number) => `${n}`);
    render(<Controlled initial={['FR', 'FR', 'ES']} formatSelectedCount={count} />);
    expect(count).toHaveBeenLastCalledWith(3, 6, [FR, ES]);
  });

  it('follows picks and unpicks in selection order', async () => {
    const user = userEvent.setup();
    const count = vi.fn(
      (n: number, _t: number, picked: readonly Country[]) =>
        picked.map((c) => c.code).join(',') || String(n)
    );
    render(<Controlled formatSelectedCount={count} />);
    await user.click(q.trigger());
    await user.click(q.option('Italy'));
    await user.click(q.option('France'));
    await user.click(q.option('Spain'));
    expect(count).toHaveBeenLastCalledWith(3, 6, [IT, FR, ES]);
    await user.click(q.option('France'));
    expect(count).toHaveBeenLastCalledWith(2, 6, [IT, ES]);
  });

  it('a two-argument formatter renders as before', () => {
    render(
      <Controlled
        initial={['FR', 'ES']}
        formatSelectedCount={(n, t) => `${n} of ${t}`}
        formatSelectionSummary={(n) => `${n} chosen`}
      />
    );
    expect(q.trigger().textContent).toBe('2 of 6');
  });

  it('a one-argument formatter and the default text are unchanged', () => {
    const { unmount } = render(
      <Controlled initial={['FR']} formatSelectedCount={(n) => `#${n}`} />
    );
    expect(q.trigger().textContent).toBe('#1');
    unmount();
    render(<Controlled initial={['FR', 'ES']} />);
    expect(q.trigger().textContent).toBe('2 selected');
  });

  it('the item list is the consumer’s own objects', () => {
    const count = vi.fn((n: number, _t: number, _picked: readonly Country[]) => `${n}`);
    render(
      <SearchableMultiSelect
        items={COUNTRIES}
        getItemId={countryId}
        getItemLabel={(c) => c.name}
        selectedIds={['DE']}
        onSelectionChange={() => {}}
        formatSelectedCount={count}
      />
    );
    const picked = count.mock.lastCall?.[2];
    expect(picked?.[0]).toBe(DE);
    expect(USGA).toBe(COUNTRIES[3]);
  });

  it('typing: the third argument is typed as the item type', () => {
    const typed = (n: number, t: number, picked: readonly Country[]): string =>
      `${n}/${t}${picked.length}`;
    render(
      <Controlled initial={['FR']} formatSelectedCount={typed} formatSelectionSummary={typed} />
    );
    const wrong = (_n: number, _t: number, picked: readonly string[]): string => picked.join();
    // @ts-expect-error — the third argument is the item type, not a string list
    render(<Controlled formatSelectedCount={wrong} />);
  });
});
