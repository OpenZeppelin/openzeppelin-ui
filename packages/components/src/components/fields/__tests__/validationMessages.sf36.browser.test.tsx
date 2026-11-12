/**
 * 005 SF-36 · Chromium: custom messages and check failures are announced and focused the same
 * way the field's default error is (INV-24 wiring, INV-26 axe + focus-on-first-error).
 * Opt-in via `pnpm test:browser`. Not part of default jsdom `pnpm test`.
 */
import { cleanup, render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import React from 'react';
import { useForm } from 'react-hook-form';

import type { FieldValidation } from '@openzeppelin/ui-types';

import { fieldSpec, type FieldSpec, type Values } from './fieldValidation.sf36-kit';

afterEach(cleanup);

function Form({
  spec,
  value,
  validation,
}: {
  spec: FieldSpec;
  value: unknown;
  validation: FieldValidation;
}): React.ReactElement {
  const api = useForm<Values>({ defaultValues: { v: value } });
  return (
    <form noValidate onSubmit={api.handleSubmit(() => {})}>
      {spec.el({ id: 'f', name: 'v', label: 'Label', control: api.control, validation })}
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
  invalid: string | null;
  role: string | null;
  violations: string[];
}

/** Submit a fresh form by keyboard (no blur layout shift, see the onTouched note) and read. */
async function errorState(
  spec: FieldSpec,
  value: unknown,
  validation: FieldValidation
): Promise<ErrorState> {
  render(<Form spec={spec} value={value} validation={validation} />);
  screen.getByRole('button', { name: 'Submit' }).focus();
  await userEvent.keyboard('{Enter}');
  await expect.poll(() => document.getElementById('f-error')).not.toBeNull();
  const errorEl = document.getElementById('f-error') as HTMLElement;
  const focused = document.activeElement as HTMLElement | null;
  const control = document.querySelector('[aria-describedby~="f-error"]');
  const state: ErrorState = {
    focusedId: focused?.id || focused?.tagName || null,
    text: errorEl.textContent,
    describedBy: control?.getAttribute('aria-describedby') ?? null,
    invalid: control?.getAttribute('aria-invalid') ?? null,
    role: errorEl.getAttribute('role'),
    violations: await axeViolations(),
  };
  cleanup();
  return state;
}

const CASES: Array<[string, unknown, unknown]> = [
  ['TextField', '', 'hello'],
  ['AmountFieldExact', '', '1.5'],
  ['SearchableMultiSelectField', [], ['ca']],
];

describe('SF-36 INV-24 / INV-26 — custom and check errors behave like the default error (Chromium)', () => {
  for (const [key, empty, valid] of CASES) {
    it(`${key}: same focus target, wiring and role; axe-clean; custom text shown`, async () => {
      const spec = fieldSpec(key);
      const def = await errorState(spec, empty, { required: true });
      const custom = await errorState(spec, empty, {
        required: true,
        messages: { required: 'Enter something' },
      });
      const check = await errorState(spec, valid, { validate: () => 'Not allowed here' });

      expect(def.focusedId, 'default: focus lands on the field control').toBe('f');
      expect(def.text).toBe('This field is required');
      expect(custom.text).toBe('Enter something');
      expect(check.text).toBe('Not allowed here');
      for (const [name, s] of [
        ['custom', custom],
        ['check', check],
      ] as const) {
        expect(s.focusedId, `${name}: focus-on-first-error target`).toBe(def.focusedId);
        expect(s.describedBy, `${name}: aria-describedby`).toBe(def.describedBy);
        expect(s.invalid, `${name}: aria-invalid`).toBe('true');
        expect(s.role, `${name}: role`).toBe(def.role);
        expect(s.violations, `${name}: axe`).toEqual([]);
      }
      expect(def.violations, 'default: axe').toEqual([]);
    });
  }
});
