/**
 * Count mode (the default) renders exactly what it rendered before chips mode existed.
 *
 * The fixture `count-mode.baseline.ea772c0cf.json` was recorded by running this file against
 * the wrapper as it was at `ea772c0cf` (the commit before chips mode), with
 * `CHIPS_BASELINE_RECORD=<path>` set and the wrapper module redirected to that commit's copy.
 * Without the variable the file compares today's render with the fixture. React ids are
 * normalised (each distinct id becomes `ID<n>` in order of first appearance), so the fixture
 * pins structure, attributes and text, not the counter React happened to be at.
 *
 * The field cases render `SearchableMultiSelectField` without the new props; the field itself
 * only gained the pass-through, so they pin the field's DOM over the same wrapper.
 */
import { writeFileSync } from 'node:fs';
import { act, cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import * as React from 'react';
import { useForm, type FieldValues } from 'react-hook-form';

import { SearchableMultiSelectField } from '../../../fields/SearchableMultiSelectField';
import { SearchableMultiSelect } from '../index';
import baseline from './count-mode.baseline.ea772c0cf.json';
import { Controlled, COUNTRIES, countryId, countryLabel, q, type Country } from './helpers';

const RECORD = process.env.CHIPS_BASELINE_RECORD;

afterEach(() => {
  cleanup();
});

/** Replace every id the DOM defines (and its references) with `ID<n>`, in order of appearance. */
function normalise(html: string): string {
  const ids: string[] = [];
  for (const match of html.matchAll(/\sid="([^"]+)"/g)) {
    const id = match[1] as string;
    if (!ids.includes(id)) ids.push(id);
  }
  let out = html;
  // Longest first, so an id that is a prefix of another is not replaced inside it.
  const order = [...ids].sort((a, b) => b.length - a.length);
  const tokens = new Map(ids.map((id, i) => [id, `ID${i}`]));
  for (const id of order) out = out.split(id).join(`\u0000${tokens.get(id)}\u0000`);
  return out.split('\u0000').join('');
}

function snapshotBody(): string {
  const attrs = document.body
    .getAttributeNames()
    .sort()
    .map((n) => `${n}="${document.body.getAttribute(n) ?? ''}"`)
    .join(' ');
  return normalise(`<body ${attrs}>${document.body.innerHTML}</body>`);
}

function FieldCase({
  readOnly,
  readOnlyMode,
  initial = [],
}: {
  readonly readOnly?: boolean;
  readonly readOnlyMode?: 'disabled' | 'readonly';
  readonly initial?: readonly string[];
}): React.ReactElement {
  const form = useForm<FieldValues>({ defaultValues: { picks: [...initial] } });
  return (
    <form>
      <SearchableMultiSelectField<Country, FieldValues>
        id="picks"
        name="picks"
        label="Picks"
        control={form.control}
        items={COUNTRIES}
        getItemId={countryId}
        getItemLabel={countryLabel}
        readOnly={readOnly}
        readOnlyMode={readOnlyMode}
        validation={{ required: true }}
      />
    </form>
  );
}

type Case = { readonly name: string; readonly run: () => Promise<void> | void };

const CASES: readonly Case[] = [
  { name: 'no selection', run: () => void render(<Controlled />) },
  { name: 'three picks', run: () => void render(<Controlled initial={['ES', 'FR', 'DE']} />) },
  { name: 'stale ids only', run: () => void render(<Controlled initial={['XX', 'YY']} />) },
  {
    name: 'stale and duplicate ids among picks',
    run: () => void render(<Controlled initial={['ES', 'XX', 'FR', 'ES']} />),
  },
  { name: 'read-only', run: () => void render(<Controlled initial={['ES', 'FR']} readOnly />) },
  { name: 'disabled', run: () => void render(<Controlled initial={['ES', 'FR']} disabled />) },
  {
    name: 'aria-label instead of aria-labelledby, required',
    run: () =>
      void render(
        <SearchableMultiSelect
          aria-label="Countries"
          aria-required
          items={COUNTRIES}
          getItemId={countryId}
          getItemLabel={countryLabel}
          selectedIds={['IT']}
          onSelectionChange={() => {}}
        />
      ),
  },
  {
    name: 'popover open with three picks',
    run: async () => {
      const user = userEvent.setup();
      render(<Controlled initial={['ES', 'FR', 'DE']} />);
      await user.click(q.trigger());
      await act(async () => {});
    },
  },
  { name: 'field, empty', run: () => void render(<FieldCase />) },
  { name: 'field, two picks', run: () => void render(<FieldCase initial={['ES', 'FR']} />) },
  {
    name: 'field, read-only (default mode)',
    run: () => void render(<FieldCase readOnly initial={['ES', 'FR']} />),
  },
  {
    name: 'field, read-only (readonly mode)',
    run: () => void render(<FieldCase readOnly readOnlyMode="readonly" initial={['ES', 'FR']} />),
  },
];

const BASELINE = baseline as Record<string, string>;

describe('count mode renders the same DOM as before chips mode', () => {
  if (RECORD) {
    it('records the baseline', async () => {
      const out: Record<string, string> = {};
      for (const c of CASES) {
        await c.run();
        out[c.name] = snapshotBody();
        cleanup();
      }
      writeFileSync(RECORD, `${JSON.stringify(out, null, 2)}\n`);
    });
    return;
  }

  it('the fixture covers every case', () => {
    expect(Object.keys(BASELINE).sort()).toEqual(CASES.map((c) => c.name).sort());
  });

  it.each(CASES.map((c) => [c.name, c] as const))('%s', async (_name, c) => {
    await c.run();
    expect(snapshotBody()).toBe(BASELINE[c.name]);
  });
});
