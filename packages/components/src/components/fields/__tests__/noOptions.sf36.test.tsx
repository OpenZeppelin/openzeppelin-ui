/**
 * 005 SF-36 · INV-15 (scenario 4): with neither `messages` nor `validate` set, every field
 * returns exactly what it returned before SF-36 (the rule's verdict and the error text on
 * screen after a submit), and read-only fields skip validation exactly
 * where they skipped it before (the INV-17 reference).
 *
 * Record / replay. The committed fixture was written by this same file on a worktree at the
 * pre-SF-36 commit 33ae72814:
 *
 *   SF36_RECORD=$PWD/src/components/fields/__tests__/fieldValidation.sf36-baseline.33ae72814.json \
 *     pnpm vitest run src/components/fields/__tests__/noOptions.sf36.test.tsx
 *
 * Without SF36_RECORD it replays the corpus on this tree and asserts equality per field, so a
 * failure names the field, the validation config and the value whose result changed. The one
 * allowed difference is F1 (see `expectedNow`): array fields now show their rule's text.
 */
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { afterAll, describe, expect, it } from 'vitest';

import {
  FIELDS,
  mountField,
  NO_OPTION_VALIDATIONS,
  outcomeOf,
  READ_ONLY_ALIGNED,
  valueLabel,
  type FieldSpec,
  type Outcome,
} from './fieldValidation.sf36-kit';

type FieldRecord = {
  verdicts: Record<string, Record<string, Outcome>>;
  readOnly: Record<string, { requiredEmpty: true | string; submitValid: number }>;
};
type Baseline = Record<string, FieldRecord>;

const FIXTURE = path.resolve(__dirname, 'fieldValidation.sf36-baseline.33ae72814.json');
const RECORD_TO = process.env.SF36_RECORD;

async function recordField(spec: FieldSpec): Promise<FieldRecord> {
  const values = [spec.valid, ...spec.empties, ...(spec.fallthroughs ?? []), ...spec.others];
  const verdicts: FieldRecord['verdicts'] = {};
  for (const [vKey, validation] of Object.entries(NO_OPTION_VALIDATIONS)) {
    const row: Record<string, Outcome> = {};
    for (const value of values) {
      row[valueLabel(value)] = await outcomeOf(spec, value, validation);
    }
    verdicts[vKey] = row;
  }
  const readOnly: FieldRecord['readOnly'] = {};
  for (const props of spec.readOnlyVariants) {
    const m = mountField(spec, {
      value: spec.empties[0],
      validation: { required: true },
      props,
    });
    const requiredEmpty = await m.verdict();
    const { valid } = await m.submit();
    m.unmount();
    readOnly[JSON.stringify(props)] = { requiredEmpty, submitValid: valid };
  }
  return { verdicts, readOnly };
}

/**
 * F1 allowance (fix 6ba51e165): ArrayField and ArrayObjectField used to render every rule
 * error as 'This field is invalid', because RHF keeps a field-array root's error at
 * `errors[name].root`. They now show the rule's own text. Only `shown` moves, and only to the
 * verdict's text: every verdict and the read-only record stay pinned to the fixture.
 */
const F1_FIELDS = /^(ArrayField|ArrayObjectField)(\[|$)/;
const F1_OLD_TEXT = 'This field is invalid';

function expectedNow(key: string, before: FieldRecord): FieldRecord {
  const aligned = READ_ONLY_ALIGNED[key];
  if (aligned) return { ...before, readOnly: { ...aligned } };
  if (!F1_FIELDS.test(key)) return before;
  const verdicts: FieldRecord['verdicts'] = {};
  for (const [vKey, row] of Object.entries(before.verdicts)) {
    verdicts[vKey] = Object.fromEntries(
      Object.entries(row).map(([label, o]) => [
        label,
        typeof o.verdict === 'string' && o.shown === F1_OLD_TEXT ? { ...o, shown: o.verdict } : o,
      ])
    );
  }
  return { ...before, verdicts };
}

const recorded: Baseline = {};
const baseline: Baseline = RECORD_TO
  ? {}
  : (JSON.parse(readFileSync(FIXTURE, 'utf-8')) as Baseline);

afterAll(() => {
  if (RECORD_TO) writeFileSync(RECORD_TO, `${JSON.stringify(recorded, null, 2)}\n`);
});

describe('SF-36 INV-15 — no options: every field returns what it returned at 33ae72814', () => {
  if (!RECORD_TO) {
    it('the fixture covers every field in the table', () => {
      expect(Object.keys(baseline).sort()).toEqual(FIELDS.map((f) => f.key).sort());
    });
  }

  for (const spec of FIELDS) {
    it(`${spec.key}: same verdict and text for every value × validation, same read-only skip`, async () => {
      const now = await recordField(spec);
      if (RECORD_TO) {
        recorded[spec.key] = now;
        return;
      }
      expect(now).toEqual(expectedNow(spec.key, baseline[spec.key]));
    }, 60_000);
  }
});
