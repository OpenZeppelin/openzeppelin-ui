/**
 * @vitest-environment jsdom
 *
 * RadioField / RadioGroup baseline: what must render exactly as at 271efee34 (the release
 * candidate before card alignment, horizontal cards, segmented RadioField and its read-only mode).
 *
 * `radio-field.sf6-baseline.271efee34.json` was recorded by this same file with `SF6_RECORD` set
 * and RadioField.tsx / radio-group.tsx resolved to their 271efee34 copies (every other module is
 * byte-identical between the two commits). See the Tests artifact for the recording command.
 *
 * - INV-1: default-variant RadioField without the read-only opt-in = fixture HTML, payload and
 *   checked option, byte for byte, over 4 read-only combinations x 2 layouts x 3 validation
 *   states x helper on/off x 2 seeds (96 cases).
 * - INV-3: RadioGroup root (three variants), default item and segmented item = fixture. Card item
 *   and RadioField card (vertical) = fixture after the two class edits in the ledger below, plus
 *   the removal of Radix `required` on RadioField card (D5) when the field is required.
 * - INV-9 (runtime half): the named exports of RadioField.tsx, radio-group.tsx and the package
 *   root are the fixture's.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import React from 'react';

import * as root from '../../../index';
import * as radioGroupModule from '../../ui/radio-group';
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group';
import * as radioFieldModule from '../RadioField';
import baseline from './radio-field.sf6-baseline.271efee34.json';
import {
  installResizeObserverStub,
  mountRadio,
  normaliseIds,
  type MountOptions,
} from './radio-field.sf6-kit';

installResizeObserverStub();
afterEach(cleanup);

// Only the recording run writes; the comparison imports the JSON.
const FIXTURE_PATH = join(__dirname, 'radio-field.sf6-baseline.271efee34.json');
const RECORD = process.env.SF6_RECORD === '1';

interface FieldCase {
  html: string;
  payload: unknown;
  checked: string[];
}
interface Fixture {
  defaultField: Record<string, FieldCase>;
  cardField: Record<string, FieldCase>;
  radioGroup: Record<string, string>;
  exports: { radioField: string[]; radioGroup: string[]; root: string[] };
}

// ---------------------------------------------------------------------------------------------
// INV-1 matrix: default variant, never opted in.
const RO_COMBOS: ReadonlyArray<[string, MountOptions]> = [
  ['readOnly absent', {}],
  ['readOnly true', { readOnly: true }],
  ['readOnly true + mode disabled', { readOnly: true, readOnlyMode: 'disabled' }],
  ['readOnly false + mode readonly', { readOnly: false, readOnlyMode: 'readonly' }],
];
const LAYOUTS = ['vertical', 'horizontal'] as const;
const VALIDITY: ReadonlyArray<[string, MountOptions]> = [
  ['no rules', {}],
  ['error', { validation: { required: true }, validateRadio: () => 'Bad pick' }],
  ['required', { validation: { required: true } }],
];
const HELPERS: ReadonlyArray<[string, MountOptions]> = [
  ['helper', { helperText: 'Pick one plan' }],
  ['no helper', {}],
];
const SEEDS = ['', 'team'] as const;

const DEFAULT_CASES = RO_COMBOS.flatMap(([roName, ro]) =>
  LAYOUTS.flatMap((layout) =>
    VALIDITY.flatMap(([vName, v]) =>
      HELPERS.flatMap(([hName, h]) =>
        SEEDS.map((seed) => ({
          key: `${roName} | ${layout} | ${vName} | ${hName} | seed '${seed}'`,
          opts: { ...ro, ...v, ...h, layout, seed } satisfies MountOptions,
        }))
      )
    )
  )
);

// RadioField card, vertical, never opted in (INV-3: still one column, only the ledger changes).
const CARD_CASES = VALIDITY.flatMap(([vName, v]) =>
  SEEDS.map((seed) => ({
    key: `card | ${vName} | seed '${seed}'`,
    opts: { ...v, variant: 'card', seed, helperText: 'Pick one plan' } satisfies MountOptions,
  }))
);

/** Render, run validation once, read the field, then submit and read the payload. */
async function captureField(opts: MountOptions): Promise<FieldCase> {
  const m = mountRadio(opts);
  await act(async () => {
    await m.api().trigger('plan');
  });
  const html = normaliseIds((m.form().firstElementChild as HTMLElement).outerHTML);
  const checked = m.checkedLabels();
  await act(async () => {
    m.form().requestSubmit();
  });
  const payload = m.submitted.length ? m.submitted[0] : { invalid: m.invalidCount() };
  m.unmount();
  return { html, payload, checked };
}

// ---------------------------------------------------------------------------------------------
// INV-3: RadioGroup primitive, outside a form (no Radix bubble inputs).
const GROUP_CASES: ReadonlyArray<[string, () => React.ReactElement]> = [
  [
    'default root + items',
    () => (
      <RadioGroup aria-label="G" defaultValue="a">
        <RadioGroupItem value="a" aria-label="A" />
        <RadioGroupItem value="b" aria-label="B" title="Bee" />
        <RadioGroupItem value="c" aria-label="C" disabled />
      </RadioGroup>
    ),
  ],
  [
    'default root horizontal',
    () => (
      <RadioGroup aria-label="G" orientation="horizontal" className="extra">
        <RadioGroupItem value="a" aria-label="A" />
      </RadioGroup>
    ),
  ],
  [
    'segmented root + items',
    () => (
      <RadioGroup aria-label="G" variant="segmented" defaultValue="a">
        <RadioGroupItem value="a">Alpha</RadioGroupItem>
        <RadioGroupItem value="b" title="Beta" />
        <RadioGroupItem value="c" disabled>
          Gamma
        </RadioGroupItem>
      </RadioGroup>
    ),
  ],
  [
    'card root + items',
    () => (
      <RadioGroup aria-label="G" variant="card" defaultValue="a">
        <RadioGroupItem value="a" title="Alpha" description="First" />
        <RadioGroupItem value="b" title="Beta" />
        <RadioGroupItem value="c" title="Gamma" description="Third" disabled />
        <RadioGroupItem value="d" description="No title">
          <span>child</span>
        </RadioGroupItem>
      </RadioGroup>
    ),
  ],
];

function captureGroup(make: () => React.ReactElement): string {
  const { container, unmount } = render(make());
  const html = normaliseIds(container.innerHTML);
  unmount();
  return html;
}

/**
 * The only intended edits to card markup since 271efee34 (D1): the title row and the text
 * column gap. Applied to the fixture to give the expected current HTML.
 */
const CARD_LEDGER: ReadonlyArray<[string, string]> = [
  [
    'class="text-sm font-medium leading-none"',
    'class="flex min-h-5 flex-wrap items-center gap-x-2 text-sm font-medium"',
  ],
  ['class="grid gap-1"', 'class="grid gap-0.5"'],
];
const applyCardLedger = (html: string): string =>
  CARD_LEDGER.reduce((acc, [from, to]) => acc.split(from).join(to), html);

/**
 * D5: RadioField card stops passing Radix `required`. Radix put `aria-required="true"` on the
 * root itself (the field passes the same attribute, so the root keeps it) and `required=""` on
 * each hidden bubble input. Removing it leaves exactly the bubble inputs' `required`.
 */
const dropRadixRequired = (html: string): string => html.split(' required=""').join('');

function exportsNow(): Fixture['exports'] {
  return {
    radioField: Object.keys(radioFieldModule).sort(),
    radioGroup: Object.keys(radioGroupModule).sort(),
    root: Object.keys(root).sort(),
  };
}

// ---------------------------------------------------------------------------------------------
if (RECORD) {
  it('records the 271efee34 baseline fixture', async () => {
    const fixture: Fixture = {
      defaultField: {},
      cardField: {},
      radioGroup: {},
      exports: exportsNow(),
    };
    for (const c of DEFAULT_CASES) fixture.defaultField[c.key] = await captureField(c.opts);
    for (const c of CARD_CASES) fixture.cardField[c.key] = await captureField(c.opts);
    for (const [name, make] of GROUP_CASES) fixture.radioGroup[name] = captureGroup(make);
    writeFileSync(FIXTURE_PATH, `${JSON.stringify(fixture, null, 2)}\n`);
  });
} else {
  const fixture = baseline as Fixture;

  describe('INV-1: default RadioField without the opt-in renders as at 271efee34', () => {
    it('the fixture holds every case of the matrix', () => {
      expect(Object.keys(fixture.defaultField).sort()).toEqual(
        DEFAULT_CASES.map((c) => c.key).sort()
      );
      expect(DEFAULT_CASES).toHaveLength(96);
    });

    it.each(DEFAULT_CASES.map((c) => [c.key, c.opts] as const))(
      '%s: same HTML, checked option and payload',
      async (key, opts) => {
        const now = await captureField(opts);
        expect(now.html).toBe(fixture.defaultField[key].html);
        expect(now.checked).toEqual(fixture.defaultField[key].checked);
        expect(now.payload).toEqual(fixture.defaultField[key].payload);
        expect(now.html).not.toMatch(/aria-readonly|data-readonly|plan-readonly/);
      }
    );
  });

  describe('INV-3: RadioGroup outside the card title row is as at 271efee34', () => {
    it.each(GROUP_CASES.filter(([n]) => !n.startsWith('card')))(
      '%s: identical HTML',
      (name, make) => {
        expect(captureGroup(make)).toBe(fixture.radioGroup[name]);
      }
    );

    it('card root + items: identical HTML after the title-row ledger', () => {
      const [, make] = GROUP_CASES.find(([n]) => n.startsWith('card')) as (typeof GROUP_CASES)[0];
      const html = captureGroup(make);
      expect(html).toBe(applyCardLedger(fixture.radioGroup['card root + items']));
      // The ledger actually applied (the fixture has the old title row, the render the new one).
      expect(fixture.radioGroup['card root + items']).toContain('leading-none');
      expect(html).not.toContain('leading-none');
    });

    it.each(CARD_CASES.map((c) => [c.key, c.opts] as const))(
      'RadioField %s (vertical): fixture after the ledger and D5, still one column',
      async (key, opts) => {
        const now = await captureField(opts);
        const before = fixture.cardField[key];
        expect(now.html).toBe(dropRadixRequired(applyCardLedger(before.html)));
        expect(now.checked).toEqual(before.checked);
        expect(now.payload).toEqual(before.payload);
        expect(now.html).toContain('flex-col');
        expect(now.html).not.toContain('grid-cols-');
      }
    );
  });

  describe('INV-9: no export added or removed', () => {
    it('RadioField.tsx, radio-group.tsx and the package root export the same names', () => {
      expect(exportsNow()).toEqual(fixture.exports);
    });
  });
}
