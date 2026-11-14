/**
 * 005 SF-36 · Table-driven sweep over every field that takes `validation`.
 *
 * One describe per invariant, one test per field, so a failure names the field and the
 * property. Fields are driven through a real `useForm`; verdicts are RHF's (`trigger` /
 * `handleSubmit`), and render checks read the DOM. Expected no-option results come from the
 * pre-SF-36 fixture recorded by `noOptions.sf36.test.tsx` (INV-15), so "unchanged" means
 * "what 33ae72814 did", not what this tree does.
 */
import { readFileSync } from 'fs';
import path from 'path';
import { isDeepStrictEqual } from 'util';
import { describe, expect, it, vi } from 'vitest';

import type { FieldValidation } from '@openzeppelin/ui-types';

import { CUSTOM_CHECK_FALLBACK_MESSAGE } from '../utils';
import {
  BASE_FIELDS,
  FIELDS,
  mountField,
  NO_OPTION_VALIDATIONS,
  READ_ONLY_ALIGNED,
  valueLabel,
  verdictOf,
  type FieldSpec,
  type Outcome,
} from './fieldValidation.sf36-kit';

type Baseline = Record<
  string,
  {
    verdicts: Record<string, Record<string, Outcome>>;
    readOnly: Record<string, { requiredEmpty: true | string; submitValid: number }>;
  }
>;
const BASELINE = JSON.parse(
  readFileSync(path.resolve(__dirname, 'fieldValidation.sf36-baseline.33ae72814.json'), 'utf-8')
) as Baseline;

const ALL6 = {
  required: 'M-required',
  min: 'M-min',
  max: 'M-max',
  minLength: 'M-minLength',
  maxLength: 'M-maxLength',
  pattern: 'M-pattern',
} as const;

/** Which default texts each message key may replace (INV-5, INV-13, INV-16). */
const REPLACES: Record<string, (defaultText: string) => boolean> = {
  'M-required': (t) => t === 'This field is required' || t === 'At least one item is required',
  'M-minLength': (t) => t.startsWith('Minimum length is '),
  'M-maxLength': (t) => t.startsWith('Maximum length is '),
  'M-pattern': (t) =>
    t === 'Value must be a valid integer (no decimals)' ||
    t === 'Value does not match the required pattern',
  'M-min': (t) => t.startsWith('Minimum value is '),
  'M-max': (t) => t.startsWith('Maximum value is '),
};

const REQUIRED_DEFAULTS = ['This field is required', 'At least one item is required'];

/** Field-array roots: RHF keeps their rule error at `errors[name].root` (F1, fixed in 6ba51e165). */
const ARRAY_ROOT_FIELDS = ['ArrayField', 'ArrayObjectField'];

const corpus = (spec: FieldSpec): unknown[] => [
  spec.valid,
  ...spec.empties,
  ...(spec.fallthroughs ?? []),
  ...spec.others,
];
const isEmptyFor = (spec: FieldSpec, v: unknown): boolean =>
  spec.empties.some((e) => isDeepStrictEqual(e, v));
const baselineVerdict = (spec: FieldSpec, vKey: string, value: unknown): true | string =>
  BASELINE[spec.key].verdicts[vKey][valueLabel(value)].verdict;

const checkSpy = (result: unknown) => vi.fn((_value: unknown) => result as boolean | string);

describe('SF-36 INV-6 — messages change the text, never the verdict', () => {
  for (const spec of FIELDS) {
    it(`${spec.key}: same pass/fail with all six messages set; a changed text is the message for the rule that failed`, async () => {
      const problems: string[] = [];
      for (const vKey of ['none', 'required', 'rules', 'optionalRules']) {
        const base = NO_OPTION_VALIDATIONS[vKey];
        const withMessages: FieldValidation = { ...(base ?? {}), messages: { ...ALL6 } };
        for (const value of corpus(spec)) {
          const without = await verdictOf(spec, value, base);
          const withMsg = await verdictOf(spec, value, withMessages);
          const where = `${vKey} ${valueLabel(value)}: ${String(without)} → ${String(withMsg)}`;
          if ((without === true) !== (withMsg === true)) problems.push(`verdict flipped, ${where}`);
          else if (vKey === 'none' && withMsg !== without) problems.push(`no rule set, ${where}`);
          else if (typeof without === 'string' && withMsg !== without) {
            const replaces = typeof withMsg === 'string' ? REPLACES[withMsg] : undefined;
            if (!replaces?.(without)) problems.push(`wrong text, ${where}`);
          }
        }
      }
      expect(problems).toEqual([]);
    }, 60_000);
  }
});

describe('SF-36 INV-8 — no non-empty value is accepted unless the check returned true', () => {
  for (const spec of BASE_FIELDS) {
    it(`${spec.key}: a value passing every built-in layer fails with the check's message, fails closed on false, passes on true`, async () => {
      for (const value of [spec.valid, ...(spec.fallthroughs ?? [])]) {
        const label = valueLabel(value);
        for (const required of [false, true]) {
          const m = mountField(spec, { value, validation: { required, validate: () => 'Nope' } });
          expect(await m.verdict(), `${label} required=${required}`).toBe('Nope');
          expect((await m.submit()).valid, `${label} submit`).toBe(0);
          m.unmount();
        }
        expect(await verdictOf(spec, value, { validate: () => false }), label).toBe(
          CUSTOM_CHECK_FALLBACK_MESSAGE
        );
        const pass = mountField(spec, { value, validation: { validate: () => true } });
        expect(await pass.verdict(), label).toBe(true);
        const submitted = await pass.submit();
        expect(submitted.valid, `${label} submit`).toBe(1);
        expect(submitted.data?.v, `${label} submitted value`).toEqual(value);
        pass.unmount();
      }
    });
  }
});

describe('SF-36 INV-9 — the check never sees an empty value; an optional field stays optional', () => {
  for (const spec of BASE_FIELDS) {
    it(`${spec.key}: empty values with a failing check keep today's optional verdict and never reach the check`, async () => {
      for (const value of spec.empties) {
        const spy = checkSpy('Nope');
        const verdict = await verdictOf(spec, value, { validate: spy });
        expect(verdict, valueLabel(value)).toBe(baselineVerdict(spec, 'empty', value));
        const emptyArgs = spy.mock.calls.filter(([arg]) => isEmptyFor(spec, arg));
        expect(emptyArgs, `${valueLabel(value)} reached the check`).toEqual([]);
      }
    });
  }

  it('the six shared-exit fields (Drift D1 + CD-1) submit an empty optional value with a failing check', async () => {
    const cases: Array<[string, unknown]> = [
      ['ObjectField', undefined],
      ['ArrayField', []],
      ['ArrayField', undefined],
      ['ArrayObjectField', []],
      ['ArrayObjectField', undefined],
      ['MapField', []],
      ['MapField', [{ key: '', value: '' }]],
      ['AmountFieldExact', ''],
      ['AmountFieldExact', null],
      ['FileUploadField', null],
      ['EnumField(no variants)', undefined],
      ['EnumField(no variants)', null],
    ];
    for (const [key, value] of cases) {
      const spec = FIELDS.find((f) => f.key === key) as FieldSpec;
      const spy = checkSpy('Nope');
      const m = mountField(spec, { value, validation: { validate: spy } });
      const { valid } = await m.submit();
      expect(valid, `${key} ${valueLabel(value)} submits`).toBe(1);
      expect(spy, `${key} ${valueLabel(value)}`).not.toHaveBeenCalled();
      m.unmount();
    }
  });
});

describe('SF-36 INV-12 / INV-10 — the check runs once per validation, on the stored value by reference', () => {
  for (const spec of BASE_FIELDS) {
    it(`${spec.key}: the check receives exactly the stored value, once`, async () => {
      for (const value of [spec.valid, ...(spec.fallthroughs ?? [])]) {
        const spy = checkSpy(true);
        const m = mountField(spec, { value, validation: { validate: spy } });
        spy.mockClear(); // MapField's effect runs the check on mount (CD-3); count one run
        expect(await m.verdict()).toBe(true);
        // MapField: the rule's call, plus one from its error effect, which re-runs when the
        // form state changes (RHF memoises the FormProvider value on formState). See CD-3.
        const expectedCalls = spec.key === 'MapField' ? [1, 2] : [1];
        expect(expectedCalls, valueLabel(value)).toContain(spy.mock.calls.length);
        spy.mock.calls.forEach((args, i) => {
          expect(args).toHaveLength(1);
          const [arg] = args;
          expect(typeof arg, valueLabel(value)).toBe(typeof value);
          expect(arg, valueLabel(value)).toEqual(value);
          // The rule's call gets the reference the form holds (primitives: same value).
          // MapField's effect call (i = 1) gets useWatch's copy: equal, not the same object.
          if (i === 0) {
            expect(
              Object.is(arg, m.api().getValues('v')),
              `${valueLabel(value)} by reference`
            ).toBe(true);
          }
        });
        m.unmount();
      }
    });
  }
});

describe('SF-36 INV-16 — a custom required message shows at every required exit', () => {
  for (const spec of BASE_FIELDS) {
    it(`${spec.key}: each empty value that fails required shows 'Custom req'; others are unchanged`, async () => {
      let hits = 0;
      for (const value of spec.empties) {
        const expectedDefault = baselineVerdict(spec, 'required', value);
        const verdict = await verdictOf(spec, value, {
          required: true,
          messages: { required: 'Custom req' },
        });
        if (typeof expectedDefault === 'string' && REQUIRED_DEFAULTS.includes(expectedDefault)) {
          hits += 1;
          expect(verdict, valueLabel(value)).toBe('Custom req');
        } else {
          expect(verdict, valueLabel(value)).toBe(expectedDefault);
        }
      }
      expect(hits, 'at least one empty value fails required').toBeGreaterThan(0);
    });
  }

  it("BooleanField: an unchecked box (false) never fails required, so the custom text can't show", async () => {
    const { BooleanField } = await import('../BooleanField');
    const spec: FieldSpec = {
      key: 'BooleanField(no validator)',
      el: (p) => <BooleanField {...p} />,
      empties: [undefined, null],
      valid: true,
      others: [],
      readOnlyVariants: [],
    };
    expect(
      await verdictOf(spec, false, { required: true, messages: { required: 'Custom req' } })
    ).toBe(true);
    expect(
      await verdictOf(spec, null, { required: true, messages: { required: 'Custom req' } })
    ).toBe('Custom req');
  });
});

describe('SF-36 INV-17 — read-only skips the check exactly where it skipped validation at 33ae72814', () => {
  for (const spec of FIELDS.filter((f) => f.readOnlyVariants.length > 0)) {
    it(`${spec.key}: read-only variants`, async () => {
      for (const props of spec.readOnlyVariants) {
        const label = JSON.stringify(props);
        // READ_ONLY_ALIGNED: the fields whose read-only contract changed after the recording.
        const record = READ_ONLY_ALIGNED[spec.key]?.[label] ?? BASELINE[spec.key].readOnly[label];
        const skippedBefore = record.submitValid === 1;
        const spy = checkSpy('Nope');
        const m = mountField(spec, { value: spec.valid, validation: { validate: spy }, props });
        const submitted = await m.submit();
        if (skippedBefore) {
          expect(spy, `${label} skips`).not.toHaveBeenCalled();
          expect(submitted.valid, `${label} submits`).toBe(1);
        } else {
          expect(spy, `${label} validates`).toHaveBeenCalled();
          expect(submitted.valid, `${label} blocked`).toBe(0);
          expect(m.current(), label).toBe('Nope');
        }
        m.unmount();
      }
    });
  }
});

describe('SF-36 INV-19 — changed options apply at the next validation without remount', () => {
  for (const spec of BASE_FIELDS) {
    it(`${spec.key}: a new check and a new required message take effect on rerender`, async () => {
      const m = mountField(spec, { value: spec.valid, validation: { validate: () => 'A' } });
      expect(await m.verdict()).toBe('A');
      m.set({ validation: { validate: () => 'B' } });
      expect(await m.verdict()).toBe('B');
      m.unmount();

      const empty = spec.empties.find((v) => {
        const d = baselineVerdict(spec, 'required', v);
        return typeof d === 'string' && REQUIRED_DEFAULTS.includes(d);
      });
      const r = mountField(spec, {
        value: empty,
        validation: { required: true, messages: { required: 'R1' } },
      });
      expect(await r.verdict()).toBe('R1');
      r.set({ validation: { required: true, messages: { required: 'R2' } } });
      expect(await r.verdict()).toBe('R2');
      r.unmount();
    });
  }
});

describe('SF-36 INV-23 — no check call during render; only when the form validates', () => {
  for (const spec of BASE_FIELDS) {
    it(`${spec.key}: a stable check isn't called on mount (MapField's effect: yes, CD-3) or on plain rerenders`, async () => {
      const spy = checkSpy(true);
      const validation: FieldValidation = { validate: spy };
      const m = mountField(spec, { value: spec.valid, validation });
      const onMount = spy.mock.calls.length;
      if (spec.key === 'MapField') expect(onMount, 'mount (effect)').toBeGreaterThan(0);
      else expect(onMount, 'mount').toBe(0);
      for (let i = 0; i < 3; i += 1) m.set({ validation });
      expect(spy, 'plain rerenders').toHaveBeenCalledTimes(onMount);
      await m.verdict();
      const perValidation = spy.mock.calls.length - onMount;
      expect(spec.key === 'MapField' ? [1, 2] : [1], 'one validation').toContain(perValidation);
      m.unmount();
    });
  }
});

describe('SF-36 INV-24 — a custom message renders exactly like a default one', () => {
  const MESSAGE = 'Nope <b>x</b>';

  /** ARIA wiring of every element that points at an error element, by attribute. */
  function ariaWiring(container: HTMLElement): string[] {
    const errorIds = new Set(
      Array.from(container.querySelectorAll('[id$="-error"]')).map((el) => el.id)
    );
    // Hidden description texts (SearchableMultiSelectField's "Required") follow `required`, not
    // the error, so they are left out of the error wiring compared here.
    const visibleTokens = (el: Element): string =>
      (el.getAttribute('aria-describedby') ?? '')
        .split(/\s+/)
        .filter((t) => !(document.getElementById(t) as HTMLElement | null)?.hidden)
        .join(' ');
    return Array.from(container.querySelectorAll('[aria-describedby]'))
      .filter((el) =>
        (el.getAttribute('aria-describedby') ?? '').split(/\s+/).some((t) => errorIds.has(t))
      )
      .map(
        (el) =>
          `${el.tagName.toLowerCase()}[role=${el.getAttribute('role')}] aria-invalid=${el.getAttribute(
            'aria-invalid'
          )} aria-describedby=${visibleTokens(el)}`
      );
  }

  async function renderError(spec: FieldSpec, value: unknown, validation: FieldValidation) {
    const m = mountField(spec, { value, validation });
    await m.submit();
    const errorEls = Array.from(m.container.querySelectorAll('[id$="-error"]'));
    return { m, errorEls, wiring: ariaWiring(m.container) };
  }

  const requiredEmpty = (spec: FieldSpec): unknown =>
    spec.empties.find((v) => {
      const d = baselineVerdict(spec, 'required', v);
      return typeof d === 'string' && REQUIRED_DEFAULTS.includes(d);
    });

  for (const spec of BASE_FIELDS) {
    it(`${spec.key}: a check message and a custom required message get the default error's element and ARIA wiring, as text`, async () => {
      const def = await renderError(spec, requiredEmpty(spec), { required: true });
      const check = await renderError(spec, spec.valid, { validate: () => MESSAGE });
      const custom = await renderError(spec, requiredEmpty(spec), {
        required: true,
        messages: { required: MESSAGE },
      });
      for (const [name, got] of [
        ['check', check],
        ['custom required', custom],
      ] as const) {
        expect(
          got.errorEls.map((e) => e.id),
          `${name}: same error element`
        ).toEqual(def.errorEls.map((e) => e.id));
        expect(got.wiring, `${name}: same ARIA wiring as the default error`).toEqual(def.wiring);
        expect(got.wiring.length, `${name}: a control points at the error`).toBeGreaterThan(0);
        expect(got.errorEls[0]?.querySelector('b'), `${name}: markup literal`).toBeNull();
        for (const el of got.m.container.querySelectorAll('[aria-describedby]')) {
          for (const token of (el.getAttribute('aria-describedby') ?? '').split(/\s+/)) {
            if (token) expect(document.getElementById(token), `${name}: ${token}`).not.toBeNull();
          }
        }
        expect(got.errorEls[0]?.textContent, `${name}: text`).toBe(MESSAGE);
      }
      def.m.unmount();
      check.m.unmount();
      custom.m.unmount();
    });
  }

  // F1: before 6ba51e165, ArrayField and ArrayObjectField rendered `fieldState.error.message`,
  // but RHF stores a field-array root's rule error at `errors[name].root`, so every message,
  // default or custom, showed as 'This field is invalid' (as at 33ae72814, see the fixture).
  // These were `it.fails` pins; the fix reads `error.root?.message ?? error.message`.
  for (const key of ARRAY_ROOT_FIELDS) {
    it(`${key}: shows the check's message, not 'This field is invalid' (F1)`, async () => {
      const spec = FIELDS.find((f) => f.key === key) as FieldSpec;
      const { m, errorEls } = await renderError(spec, spec.valid, { validate: () => MESSAGE });
      expect(errorEls[0]?.textContent).toBe(MESSAGE);
      m.unmount();
    });
    it(`${key}: shows a custom required message (F1)`, async () => {
      const spec = FIELDS.find((f) => f.key === key) as FieldSpec;
      const m = mountField(spec, {
        value: [],
        validation: { required: true, messages: { required: 'Custom req' } },
      });
      await m.submit();
      expect(m.current()).toBe('Custom req'); // RHF holds it…
      expect(m.shown()).toBe('Custom req'); // …and the screen shows it
      m.unmount();
    });
  }
});
