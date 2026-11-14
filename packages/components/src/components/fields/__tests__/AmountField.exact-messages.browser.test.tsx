/**
 * Chromium: an exact-mode AmountField error worded by `validation.messages` (`format`,
 * `decimals`, `min`, `max`) is focused, announced and referenced exactly like the default
 * text for the same failure, on both exact inputs, and axe reports nothing in either state.
 * Opt-in via `pnpm test:browser`. Not part of default jsdom `pnpm test`.
 */
import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import React from 'react';
import { useForm } from 'react-hook-form';

import type { FieldValidation } from '@openzeppelin/ui-types';

import { AmountField } from '../AmountField';

afterEach(cleanup);

type Values = { v: string };

const MESSAGES = {
  format: 'Enter an amount like 1,234.56',
  decimals: 'Cents only: two decimal places',
  min: 'The minimum transfer is 10',
  max: 'The maximum transfer is 1,000',
} as const;

const INPUTS: ReadonlyArray<[string, { allowGrouping?: boolean; groupedDisplay?: boolean }]> = [
  ['plain exact input', {}],
  ['grouped exact input', { allowGrouping: true, groupedDisplay: true }],
];

function Form({
  value,
  validation,
  grouped,
}: {
  value: string;
  validation?: FieldValidation;
  grouped: { allowGrouping?: boolean; groupedDisplay?: boolean };
}): React.ReactElement {
  const api = useForm<Values>({ defaultValues: { v: value } });
  return (
    <form noValidate onSubmit={api.handleSubmit(() => {})}>
      <AmountField<Values>
        id="f"
        name="v"
        label="Transfer amount"
        helperText="From 10 to 1,000"
        control={api.control}
        formatOnBlur={false}
        decimals={2}
        min="10"
        max="1000"
        validation={validation}
        {...grouped}
      />
      <button type="submit">Submit</button>
    </form>
  );
}

async function axeViolations(): Promise<string[]> {
  const results = await axe.run(document.body, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  });
  return results.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`
  );
}

interface ErrorState {
  focusedId: string | null;
  text: string | null;
  describedBy: string | null;
  describedTexts: string[];
  errorMessageRef: string | null;
  invalid: string | null;
  role: string | null;
  violations: string[];
}

/** Submit a fresh form by keyboard (no blur layout shift) and read the error state. */
async function errorState(
  value: string,
  grouped: { allowGrouping?: boolean; groupedDisplay?: boolean },
  validation?: FieldValidation
): Promise<ErrorState> {
  render(<Form value={value} validation={validation} grouped={grouped} />);
  screen.getByRole('button', { name: 'Submit' }).focus();
  await userEvent.keyboard('{Enter}');
  await expect.poll(() => document.getElementById('f-error')).not.toBeNull();
  const errorEl = document.getElementById('f-error') as HTMLElement;
  const input = document.getElementById('f') as HTMLInputElement;
  const describedBy = input.getAttribute('aria-describedby');
  const state: ErrorState = {
    focusedId: (document.activeElement as HTMLElement | null)?.id || null,
    text: errorEl.textContent,
    describedBy,
    describedTexts: (describedBy ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => document.getElementById(id)?.textContent ?? `<missing #${id}>`),
    errorMessageRef: input.getAttribute('aria-errormessage'),
    invalid: input.getAttribute('aria-invalid'),
    role: errorEl.getAttribute('role'),
    violations: await axeViolations(),
  };
  cleanup();
  return state;
}

const CASES: ReadonlyArray<[keyof typeof MESSAGES, string, string]> = [
  ['format', '1.2.3', 'Only one decimal point is allowed'],
  ['decimals', '12.345', 'Use at most 2 decimal places'],
  ['min', '5', 'Value must be at least 10'],
  ['max', '5000', 'Value must be at most 1000'],
];

for (const [inputName, grouped] of INPUTS) {
  describe(`${inputName}: custom exact-mode errors behave like the default error (Chromium)`, () => {
    for (const [key, value, defaultText] of CASES) {
      it(`${key} (${value}): same focus target, wiring and role; custom text referenced; axe-clean`, async () => {
        const def = await errorState(value, grouped);
        const custom = await errorState(value, grouped, { messages: { ...MESSAGES } });

        expect(def.text).toBe(defaultText);
        expect(custom.text).toBe(MESSAGES[key]);
        expect(def.focusedId, 'default: focus lands on the input').toBe('f');
        expect(custom.focusedId, 'custom: focus-on-first-error target').toBe(def.focusedId);
        expect(custom.describedBy).toBe(def.describedBy);
        expect(custom.describedBy?.split(/\s+/)).toContain('f-error');
        expect(custom.describedTexts).toContain(MESSAGES[key]);
        expect(custom.describedTexts).not.toContain(defaultText);
        expect(custom.describedTexts.join('|')).not.toMatch(/<missing/);
        expect(custom.errorMessageRef).toBe('f-error');
        expect(custom.invalid).toBe('true');
        expect(custom.role).toBe(def.role);
        expect(custom.role).toBe('alert');
        expect(def.violations, 'default: axe').toEqual([]);
        expect(custom.violations, 'custom: axe').toEqual([]);
      });
    }
  });
}
