/**
 * Table-driven sweep over every field that takes `validation`, with all eight message keys
 * set (`format` and `decimals` included).
 *
 * - No field changes a verdict when the eight messages are added.
 * - Adding `format` and `decimals` next to the other six changes no text, except on exact-mode
 *   AmountField, where `format` may replace only a grammar text and `decimals` only the
 *   too-many-decimals text.
 *
 * Fields, corpus and validation configs come from the shared field kit, so this sweep covers
 * every field the existing message sweep covers.
 */
import { describe, expect, it } from 'vitest';

import type { FieldValidation, FieldValidationMessages } from '@openzeppelin/ui-types';

import { BASELINE_ISSUE_TEXTS } from './decimalValidation.exact-messages-baseline';
import {
  FIELDS,
  NO_OPTION_VALIDATIONS,
  valueLabel,
  verdictOf,
  type FieldSpec,
} from './fieldValidation.sf36-kit';

const SIX: FieldValidationMessages = {
  required: 'M-required',
  min: 'M-min',
  max: 'M-max',
  minLength: 'M-minLength',
  maxLength: 'M-maxLength',
  pattern: 'M-pattern',
};
const EIGHT: FieldValidationMessages = { ...SIX, format: 'M-format', decimals: 'M-decimals' };

const ISSUE_TEXTS = new Set(Object.values(BASELINE_ISSUE_TEXTS));
const isExactSpec = (spec: FieldSpec): boolean => spec.key.startsWith('AmountFieldExact');

/** What `format` / `decimals` may replace, on exact-mode AmountField only. */
const EXACT_REPLACES: Record<string, (text: string) => boolean> = {
  'M-format': (t) => ISSUE_TEXTS.has(t),
  'M-decimals': (t) => /^Use at most \d+ decimal places$/.test(t),
};

const corpus = (spec: FieldSpec): unknown[] => [
  spec.valid,
  ...spec.empties,
  ...(spec.fallthroughs ?? []),
  ...spec.others,
];

describe('format and decimals: every field keeps its verdicts; only exact AmountField reads them', () => {
  it('the sweep covers both exact AmountField specs (guards the field list)', () => {
    expect(FIELDS.filter(isExactSpec).map((s) => s.key)).toEqual([
      'AmountFieldExact',
      'AmountFieldExact[min=1,max=10]',
    ]);
  });

  for (const spec of FIELDS) {
    it(`${spec.key}: same pass/fail with all eight messages; format / decimals change ${isExactSpec(spec) ? 'only grammar and decimals texts' : 'no text'}`, async () => {
      const problems: string[] = [];
      for (const vKey of Object.keys(NO_OPTION_VALIDATIONS)) {
        const base = NO_OPTION_VALIDATIONS[vKey];
        const withSix: FieldValidation = { ...(base ?? {}), messages: { ...SIX } };
        const withEight: FieldValidation = { ...(base ?? {}), messages: { ...EIGHT } };
        for (const value of corpus(spec)) {
          const without = await verdictOf(spec, value, base);
          const six = await verdictOf(spec, value, withSix);
          const eight = await verdictOf(spec, value, withEight);
          const where = `${vKey} ${valueLabel(value)}: ${String(without)} | six ${String(six)} | eight ${String(eight)}`;
          if ((without === true) !== (eight === true)) {
            problems.push(`verdict flipped, ${where}`);
            continue;
          }
          if (six === eight) continue;
          const allowed =
            isExactSpec(spec) &&
            typeof six === 'string' &&
            typeof eight === 'string' &&
            EXACT_REPLACES[eight]?.(six) === true;
          if (!allowed) problems.push(`format/decimals changed a text, ${where}`);
        }
      }
      expect(problems).toEqual([]);
    }, 90_000);
  }

  it('exact AmountField: format and decimals do replace their texts in the sweep corpus', async () => {
    const spec = FIELDS.find((s) => s.key === 'AmountFieldExact');
    if (!spec) throw new Error('AmountFieldExact spec missing');
    expect(await verdictOf(spec, '1.2.3', { messages: { ...EIGHT } })).toBe('M-format');
    expect(await verdictOf(spec, '1.1234567', { messages: { ...EIGHT } })).toBe('M-decimals');
    expect(await verdictOf(spec, '1.2.3', undefined)).toBe(BASELINE_ISSUE_TEXTS['multiple-points']);
  });
});
