/**
 * @vitest-environment jsdom
 *
 * 007 SF-2 INV-15 / INV-16: what AmountField hands its exact inputs as `accessibilityProps`
 * (module spies; file-wide vi.mock, so kept apart from the behaviour tests).
 *
 * Without a symbol the exact inputs get the very object `getAccessibilityProps` built, so a
 * field without a symbol can't drift from the 006 attributes. With a symbol they get a new
 * object with the symbol id first, and the original is never mutated (it is frozen here, so
 * a mutation throws). Default mode spreads the props onto `Input`, so object identity isn't
 * observable there; its attributes are compared in `AmountField.symbol.test.tsx` (INV-1).
 */
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { useForm, type FieldValues } from 'react-hook-form';

import { AmountField } from '../AmountField';
import type { AccessibilityProps } from '../utils';

const built: AccessibilityProps[] = [];
const received: Array<{ accessibilityProps: AccessibilityProps; grouped: boolean }> = [];

vi.mock('../utils', async (importOriginal) => {
  const real = await importOriginal<typeof import('../utils')>();
  return {
    ...real,
    getAccessibilityProps: (...args: Parameters<typeof real.getAccessibilityProps>) => {
      const props = Object.freeze(real.getAccessibilityProps(...args));
      built.push(props);
      return props;
    },
  };
});

vi.mock('../AmountFieldExactInput', async (importOriginal) => {
  const real = await importOriginal<typeof import('../AmountFieldExactInput')>();
  return {
    ...real,
    AmountFieldExactInput: (props: Parameters<typeof real.AmountFieldExactInput>[0]) => {
      received.push({ accessibilityProps: props.accessibilityProps, grouped: false });
      return real.AmountFieldExactInput(props);
    },
  };
});

vi.mock('../AmountFieldGroupedExactInput', async (importOriginal) => {
  const real = await importOriginal<typeof import('../AmountFieldGroupedExactInput')>();
  return {
    ...real,
    AmountFieldGroupedExactInput: (
      props: Parameters<typeof real.AmountFieldGroupedExactInput>[0]
    ) => {
      received.push({ accessibilityProps: props.accessibilityProps, grouped: true });
      return real.AmountFieldGroupedExactInput(props);
    },
  };
});

function Harness({ extra }: { extra: Record<string, unknown> }): React.ReactElement {
  const form = useForm<FieldValues>({ defaultValues: { amount: '' } });
  return (
    <AmountField
      id="amount"
      name="amount"
      label="Amount"
      control={form.control}
      formatOnBlur={false}
      helperText="Help text"
      {...extra}
    />
  );
}

let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  built.length = 0;
  received.length = 0;
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  cleanup();
  consoleError.mockRestore();
});

const MODES: Array<[string, Record<string, unknown>]> = [
  ['exact', {}],
  ['grouped', { allowGrouping: true, groupedDisplay: true }],
];

describe('INV-15: no symbol hands the exact inputs the object getAccessibilityProps built', () => {
  it.each(MODES)('%s mode', (mode, flags) => {
    for (const symbol of [undefined, '']) {
      render(<Harness extra={{ ...flags, symbol }} />);
      const last = received.at(-1);
      expect(last?.grouped).toBe(mode === 'grouped');
      expect(last?.accessibilityProps).toBe(built.at(-1));
      cleanup();
    }
  });

  it.each(MODES)('%s mode: a symbol in an unknown position also passes it through', (_m, flags) => {
    render(<Harness extra={{ ...flags, symbol: 'USD', symbolPosition: 'left' }} />);
    expect(received.at(-1)?.accessibilityProps).toBe(built.at(-1));
  });
});

describe('INV-16: with a symbol, a new object with the symbol id first; the original untouched', () => {
  it.each(MODES)('%s mode', (_mode, flags) => {
    for (const symbolPosition of ['prefix', 'suffix'] as const) {
      render(<Harness extra={{ ...flags, symbol: 'USD', symbolPosition }} />);
      const original = built.at(-1) as AccessibilityProps;
      const passed = received.at(-1)?.accessibilityProps as AccessibilityProps;
      expect(passed).not.toBe(original);
      expect(original['aria-describedby']).toBe('amount-description'); // not mutated
      expect(passed).toEqual({
        ...original,
        'aria-describedby': 'amount-symbol amount-description',
      });
      cleanup();
    }
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('with no other description id, the symbol id stands alone', () => {
    render(<Harness extra={{ helperText: undefined, symbol: 'USD' }} />);
    expect(built.at(-1)?.['aria-describedby']).toBeUndefined();
    expect(received.at(-1)?.accessibilityProps['aria-describedby']).toBe('amount-symbol');
  });
});
