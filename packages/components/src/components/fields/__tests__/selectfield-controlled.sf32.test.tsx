/**
 * @vitest-environment jsdom
 *
 * SF-32 · SelectField and SelectGroupedField keep their Radix Select Root controlled (F-2, INV-18).
 *
 * @radix-ui/react-select 2.3.3 warns "Select is changing from uncontrolled to controlled" when
 * `value` goes from `undefined` to a string, and its build keeps that check in production. A
 * default-mode SelectField starts with `field.value === undefined`, so the first pick in an
 * empty field used to log it. Each test drives a real pick through the open listbox and asserts
 * that no controlled-state message (or any other console message) appears.
 */
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import * as React from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';

import { SelectGroupedField } from '../SelectGroupedField';
import {
  fillJsdomGaps,
  mountSelect,
  type Mounted,
  type MountOptions,
} from './selectfield-readonly.sf20-kit';

beforeAll(fillJsdomGaps);
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const CONTROLLED_STATE = /changing from (un)?controlled to (un)?controlled/i;

/** Console output from the field, without React's test-only act() notices. */
function consoleMessages(): () => string[] {
  const warn = vi.spyOn(console, 'warn');
  const error = vi.spyOn(console, 'error');
  return () =>
    [...warn.mock.calls, ...error.mock.calls]
      .map((args: unknown[]) => args.map(String).join(' '))
      .filter((msg) => !msg.includes('not wrapped in act('));
}

async function pick(m: Pick<Mounted, 'trigger'>, label: string): Promise<void> {
  const user = userEvent.setup();
  act(() => m.trigger().focus());
  await user.keyboard('{Enter}');
  const option = Array.from(document.querySelectorAll('[role="option"]')).find(
    (o) => o.textContent === label
  );
  if (!option) throw new Error(`no ${label} option`);
  await user.click(option);
}

const DEFAULT_MODES: ReadonlyArray<[string, MountOptions]> = [
  ['no readOnly props (default mode)', {}],
  ['readOnly={false}', { readOnly: false }],
  ['readOnly={false} readOnlyMode="disabled"', { readOnly: false, readOnlyMode: 'disabled' }],
  [
    'readOnly={false} readOnlyMode="readonly" (opt-in)',
    { readOnly: false, readOnlyMode: 'readonly' },
  ],
];

describe('F-2: the first pick in an empty SelectField logs nothing', () => {
  it.each(DEFAULT_MODES)(
    '%s: empty → pick Gamma: value set, zero console messages',
    async (_, opts) => {
      const messages = consoleMessages();
      const m = mountSelect(opts);
      expect(m.api().getValues('role')).toBeUndefined();

      await pick(m, 'Gamma');

      expect(m.api().getValues('role')).toBe('gamma');
      expect(m.trigger().textContent).toContain('Gamma');
      expect(messages().filter((msg) => CONTROLLED_STATE.test(msg))).toStrictEqual([]);
      expect(messages()).toStrictEqual([]);
    }
  );

  it('boundary: starting with a value and picking another logs nothing', async () => {
    const messages = consoleMessages();
    const m = mountSelect({ value: 'alpha' });
    await pick(m, 'Beta');
    expect(m.api().getValues('role')).toBe('beta');
    expect(messages()).toStrictEqual([]);
  });

  it('boundary: reset to empty after a pick shows the placeholder again and logs nothing', async () => {
    const messages = consoleMessages();
    const m = mountSelect({});
    await pick(m, 'Gamma');
    act(() => m.api().reset({ role: undefined }));

    expect(m.api().getValues('role')).toBeUndefined();
    expect(m.trigger().hasAttribute('data-placeholder')).toBe(true);
    expect(screen.getByText('Select an option')).toBeTruthy();
    await pick(m, 'Alpha');
    expect(m.api().getValues('role')).toBe('alpha');
    expect(messages()).toStrictEqual([]);
  });

  it('boundary: readOnlyMode flipped at runtime with an empty value logs nothing', () => {
    const messages = consoleMessages();
    const m = mountSelect({});
    for (let i = 0; i < 10; i++) {
      m.rerender({ readOnly: true, readOnlyMode: 'readonly' });
      m.rerender({ readOnly: true, readOnlyMode: 'disabled' });
      m.rerender({});
    }
    expect(messages()).toStrictEqual([]);
  });
});

interface GroupedValues {
  net?: string;
}

/** SelectGroupedField in an RHF form; `defaultValue` undefined leaves the field empty. */
function mountGrouped(defaultValue?: string): {
  trigger: () => HTMLButtonElement;
  api: () => UseFormReturn<GroupedValues>;
} {
  let form: UseFormReturn<GroupedValues> | undefined;
  function Host(): React.ReactElement {
    const f = useForm<GroupedValues>({
      defaultValues: defaultValue === undefined ? {} : { net: defaultValue },
    });
    form = f;
    return (
      <SelectGroupedField<GroupedValues>
        id="net"
        name="net"
        label="Network"
        control={f.control}
        groups={[
          { label: 'Mainnets', options: [{ value: 'one', label: 'One' }] },
          {
            label: 'Testnets',
            options: [
              { value: 'two', label: 'Two' },
              { value: 'three', label: 'Three' },
            ],
          },
        ]}
      />
    );
  }
  const utils = render(<Host />);
  return {
    trigger: () => utils.container.querySelector('#net') as HTMLButtonElement,
    api: () => {
      if (!form) throw new Error('form not mounted');
      return form;
    },
  };
}

describe('F-2: SelectGroupedField logs nothing and never shows a stale label', () => {
  it('empty → pick: value set, zero console messages', async () => {
    const messages = consoleMessages();
    const m = mountGrouped();
    expect(m.api().getValues('net')).toBeUndefined();

    await pick(m, 'Three');

    expect(m.api().getValues('net')).toBe('three');
    expect(m.trigger().textContent).toContain('Three');
    expect(messages()).toStrictEqual([]);
  });

  it('reset to empty after a pick shows the placeholder, not the old label', async () => {
    const messages = consoleMessages();
    const m = mountGrouped();
    await pick(m, 'Two');
    act(() => m.api().reset({ net: undefined }));

    expect(m.api().getValues('net')).toBeUndefined();
    expect(m.trigger().hasAttribute('data-placeholder')).toBe(true);
    expect(m.trigger().textContent).toContain('Select an option'); // pre-fix: stale "Two"
    expect(messages()).toStrictEqual([]);
  });

  it('boundary: a default value, a pick and a reset back to the default are unchanged', async () => {
    const messages = consoleMessages();
    const m = mountGrouped('one');
    expect(m.trigger().textContent).toContain('One');
    await pick(m, 'Two');
    act(() => m.api().reset());
    expect(m.api().getValues('net')).toBe('one');
    expect(m.trigger().textContent).toContain('One');
    expect(messages()).toStrictEqual([]);
  });
});
