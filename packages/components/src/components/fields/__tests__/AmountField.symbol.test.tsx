/**
 * 007 SF-2 · AmountField symbol in Input's adornment slot (jsdom). Each `describe` starts
 * with the INV id it verifies.
 *
 * Covers: no symbol renders exactly as before (INV-1), the symbol's markup (INV-2), the same
 * markup in default, exact and grouped mode (INV-3), field state on the input (INV-6), the
 * presence rule (INV-7), the symbol never entering the value (INV-8), the release note and
 * scope (INV-10), focus through the ref (INV-11), changing and toggling the symbol (INV-12,
 * INV-13), disabled dimming (INV-14), no observer without a symbol (INV-15), and the
 * description order and text (INV-16, INV-17).
 *
 * jsdom has no layout: geometry, computed colour and real pointer hits live in
 * `AmountField.symbol.browser.test.tsx` and the example app's `amount-symbol.spec.ts`.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { computeAccessibleDescription, computeAccessibleName } from 'dom-accessibility-api';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { useForm, type FieldValues, type UseFormReturn } from 'react-hook-form';

import { AmountField } from '../AmountField';
import {
  typeBypass,
  type AmountFieldAnyProps,
  type AmountFieldOptions,
} from './amount-exact.sf10-kit';

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

interface Api {
  form: UseFormReturn<FieldValues> | null;
  submitted: FieldValues[];
}

function Harness({
  options,
  api,
  defaultValues = { amount: '' },
}: {
  options: AmountFieldOptions;
  api: Api;
  defaultValues?: FieldValues;
}): React.ReactElement {
  const form = useForm<FieldValues>({ defaultValues, mode: 'onSubmit' });
  api.form = form;
  const fieldProps: AmountFieldAnyProps = {
    ...options,
    id: 'amount',
    name: 'amount',
    control: form.control,
  };
  return (
    <form
      onSubmit={form.handleSubmit((v) => {
        api.submitted.push({ ...v });
      })}
      noValidate
    >
      <button type="button">Before</button>
      <AmountField {...fieldProps} />
      <button type="button">After</button>
      <button type="submit">Submit</button>
    </form>
  );
}

function mount(options: AmountFieldOptions, defaultValues?: FieldValues) {
  const api: Api = { form: null, submitted: [] };
  const view = render(<Harness options={options} api={api} defaultValues={defaultValues} />);
  const input = (): HTMLInputElement => document.getElementById('amount') as HTMLInputElement;
  return {
    api,
    input,
    container: view.container,
    rerender: (next: AmountFieldOptions) =>
      view.rerender(<Harness options={next} api={api} defaultValues={defaultValues} />),
    submit: async () => {
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
      });
    },
  };
}

const MODES = {
  default: {},
  exact: { formatOnBlur: false },
  grouped: { formatOnBlur: false, allowGrouping: true, groupedDisplay: true },
} as const;
type ModeName = keyof typeof MODES;
const MODE_NAMES = Object.keys(MODES) as ModeName[];

const STATES = {
  clean: { options: {}, error: false },
  helper: { options: { helperText: 'Help text' }, error: false },
  error: { options: { validation: { required: true } }, error: true },
  'error + helper': {
    options: { helperText: 'Help text', validation: { required: true } },
    error: true,
  },
} as const;
type StateName = keyof typeof STATES;
const STATE_NAMES = Object.keys(STATES) as StateName[];

function opts(mode: ModeName, extra: Record<string, unknown> = {}): AmountFieldOptions {
  return typeBypass<AmountFieldOptions>({ label: 'Amount', ...MODES[mode], ...extra });
}

/** Mounts in `state`, submitting once when the state is an error state. */
async function mountInState(mode: ModeName, state: StateName, extra: Record<string, unknown>) {
  const m = mount(opts(mode, { ...STATES[state].options, ...extra }));
  if (STATES[state].error) await m.submit();
  return m;
}

const attributesOf = (el: Element): Record<string, string> =>
  Object.fromEntries(Array.from(el.attributes, (a) => [a.name, a.value]));

const describedBy = (input: HTMLInputElement): string[] =>
  (input.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);

const WRAPPER = '[data-slot="input-wrapper"]';
/** AmountField's outer `div.relative`: the slot wrapper's parent, or the bare input's. */
const outerBox = (input: HTMLInputElement): HTMLElement =>
  (input.closest(WRAPPER) ?? input).parentElement as HTMLElement;
const START = '[data-slot="input-start-adornment"]';
const END = '[data-slot="input-end-adornment"]';
const SYMBOL_ID = 'amount-symbol';

let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  cleanup();
  consoleError.mockRestore();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Render contract
// ---------------------------------------------------------------------------

describe('INV-1: no symbol, no change', () => {
  const NO_SYMBOL: Array<[string, Record<string, unknown>]> = [
    ['omitted', {}],
    ['undefined', { symbol: undefined }],
    ["''", { symbol: '' }],
    ["'' as prefix", { symbol: '', symbolPosition: 'prefix' }],
  ];

  for (const mode of MODE_NAMES) {
    it.each(STATE_NAMES)(
      `${mode} mode, %s: every "no symbol" spelling renders the same bare input`,
      async (state) => {
        const htmls: string[] = [];
        for (const [, extra] of NO_SYMBOL) {
          const m = await mountInState(mode, state, extra);
          const input = m.input();
          const box = input.parentElement as HTMLElement;
          // The bare input directly in the outer div.relative, as on the 006 tip.
          expect(box.matches('div.relative')).toBe(true);
          expect(box.children).toHaveLength(1);
          expect(m.container.querySelector(WRAPPER)).toBeNull();
          expect(m.container.querySelector('[data-slot$="-adornment"]')).toBeNull();
          expect(m.container.querySelector('[id$="-symbol"]')).toBeNull();
          expect(input.hasAttribute('style')).toBe(false);
          const cls = input.getAttribute('class') ?? '';
          expect(cls).not.toMatch(/\bp[lr]-8\b/);
          expect(cls).toBe(cls.trim().replace(/\s+/g, ' '));
          expect(describedBy(input)).not.toContain(SYMBOL_ID);
          htmls.push(m.container.innerHTML);
          cleanup();
        }
        expect(new Set(htmls).size).toBe(1);
      }
    );
  }

  it.each(STATE_NAMES)('default mode, %s: ARIA attributes are the 006 values', async (state) => {
    const m = await mountInState('default', state, {});
    const { error } = STATES[state];
    const helper = 'helperText' in STATES[state].options;
    const ids = [...(error ? ['amount-error'] : []), ...(helper ? ['amount-description'] : [])];
    expect(describedBy(m.input())).toEqual(ids);
    expect(m.input().getAttribute('aria-invalid')).toBe(String(error));
    expect(m.input().getAttribute('aria-errormessage')).toBe(error ? 'amount-error' : null);
  });
});

describe('INV-2: the symbol is one bare span in the slot, placed by symbolPosition', () => {
  const SYMBOLS = ['$', 'ETH', 'USDC', ' '];
  const POSITIONS: Array<['prefix' | 'suffix' | undefined, string]> = [
    ['prefix', START],
    ['suffix', END],
    [undefined, END],
  ];
  const rows = MODE_NAMES.flatMap((mode) =>
    SYMBOLS.flatMap((symbol) =>
      POSITIONS.map(([position, slot]) => ({ mode, symbol, position, slot }))
    )
  );

  it.each(rows)('$mode, symbol=$symbol position=$position', ({ mode, symbol, position, slot }) => {
    const m = mount(opts(mode, { symbol, ...(position ? { symbolPosition: position } : {}) }));
    const input = m.input();
    const box = outerBox(input);
    expect(box.matches('div.relative')).toBe(true);
    expect(box.children).toHaveLength(1);
    const wrapper = box.children[0] as HTMLElement;
    expect(wrapper.matches(WRAPPER)).toBe(true);
    expect(wrapper.querySelectorAll('[data-slot$="-adornment"]')).toHaveLength(1);
    const slotEl = wrapper.querySelector(slot) as HTMLElement;
    expect(slotEl).not.toBeNull();
    expect(slotEl.children).toHaveLength(1);
    const node = slotEl.children[0] as HTMLElement;
    expect(node.tagName).toBe('SPAN');
    expect(node.getAttributeNames()).toEqual(['id']);
    expect(node.id).toBe(SYMBOL_ID);
    expect(node.textContent).toBe(symbol); // not trimmed, not upper-cased
    expect(slotEl.hasAttribute('id')).toBe(false);
    expect(document.querySelectorAll(`#${SYMBOL_ID}`)).toHaveLength(1);
    // Nothing left of the old markup.
    expect(m.container.querySelector('span.text-gray-500')).toBeNull();
    expect(input.getAttribute('class')).not.toMatch(/\bp[lr]-8\b/);
    // DOM order: prefix before the input, suffix after it.
    const follows = input.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING;
    expect(Boolean(follows)).toBe(slot === END);
  });

  it('failure case: a symbol in an unknown position renders no slot and no stray span', () => {
    const m = mount(opts('default', { symbol: 'USD', symbolPosition: 'left' }));
    expect(m.container.querySelector(WRAPPER)).toBeNull();
    expect(m.container.textContent).not.toContain('USD');
  });
});

describe('INV-3: default, exact and grouped mode render the same symbol markup', () => {
  const chromeOf = (input: HTMLInputElement): string => {
    const clone = outerBox(input).cloneNode(true) as HTMLElement;
    clone.querySelector('input')?.removeAttribute('value');
    return clone.outerHTML;
  };
  const inputAttrs = (input: HTMLInputElement): Record<string, string> => {
    const { value: _value, ...rest } = attributesOf(input);
    return rest;
  };

  it.each([
    ['USD', 'suffix'],
    ['$', 'prefix'],
    ['ETH', undefined],
  ] as const)(
    'symbol=%s position=%s: wrapper, slot and input attributes match in all three modes',
    (symbol, position) => {
      for (const state of STATE_NAMES) {
        const seen = MODE_NAMES.map((mode) => {
          const m = mount(
            opts(mode, {
              symbol,
              ...STATES[state].options,
              ...(position ? { symbolPosition: position } : {}),
            }),
            { amount: '1234.5' }
          );
          const out = { chrome: chromeOf(m.input()), attrs: inputAttrs(m.input()) };
          cleanup();
          return out;
        });
        expect(seen[1], `${state}: exact`).toEqual(seen[0]);
        expect(seen[2], `${state}: grouped`).toEqual(seen[0]);
      }
    }
  );

  it('no adornment prop reaches the DOM as an attribute and React logs nothing', () => {
    for (const mode of MODE_NAMES) {
      for (const position of ['prefix', 'suffix'] as const) {
        const m = mount(opts(mode, { symbol: 'USD', symbolPosition: position }));
        for (const el of Array.from(m.container.querySelectorAll('*'))) {
          for (const name of el.getAttributeNames()) expect(name).not.toMatch(/adornment/i);
        }
        cleanup();
      }
    }
    expect(consoleError).not.toHaveBeenCalled();
  });
});

describe('INV-6: field state still shows on the input with a symbol', () => {
  for (const mode of MODE_NAMES) {
    it.each(STATE_NAMES)(
      `${mode} mode, %s: the input's class string is the same with and without USD`,
      async (state) => {
        const without = await mountInState(mode, state, {});
        const plainClass = without.input().className;
        cleanup();
        const withSymbol = await mountInState(mode, state, { symbol: 'USD' });
        expect(withSymbol.input().className).toBe(plainClass);
        if (STATES[state].error) expect(plainClass).toContain('border-destructive');
        // The wrapper and slot draw no border, ring or background of their own.
        const wrapper = withSymbol.container.querySelector(WRAPPER) as HTMLElement;
        expect(wrapper.className).not.toMatch(/\b(border|ring|bg)-/);
      }
    );
  }

  it('focusable read-only: the read-only look stays on the input', () => {
    for (const mode of MODE_NAMES) {
      const m = mount(opts(mode, { symbol: 'USD', readOnly: true, readOnlyMode: 'readonly' }));
      expect(m.input().hasAttribute('data-readonly')).toBe(true);
      expect(m.input().readOnly).toBe(true);
      expect(m.input().className).toContain('data-readonly:read-only:not-disabled:bg-muted');
      cleanup();
    }
  });
});

// ---------------------------------------------------------------------------
// Prop / state contract
// ---------------------------------------------------------------------------

describe('INV-7: a symbol renders iff it is truthy and its position is known; listed iff rendered', () => {
  const SYMBOLS: unknown[] = ['', ' ', 'USD', ' ETH ', undefined];
  const POSITIONS: unknown[] = ['prefix', 'suffix', undefined, 'left', 'after', ''];

  it('sweep: node present ⇔ id listed ⇔ (truthy symbol and known position)', () => {
    for (const mode of MODE_NAMES) {
      for (const symbol of SYMBOLS) {
        for (const symbolPosition of POSITIONS) {
          const extra: Record<string, unknown> = { symbol };
          if (symbolPosition !== undefined) extra.symbolPosition = symbolPosition;
          const m = mount(opts(mode, { ...extra, helperText: 'Help text' }));
          const node = document.getElementById(SYMBOL_ID);
          const listed = describedBy(m.input()).includes(SYMBOL_ID);
          const known =
            symbolPosition === undefined ||
            symbolPosition === 'prefix' ||
            symbolPosition === 'suffix';
          const expected = Boolean(symbol) && known;
          const label = `${mode} ${JSON.stringify(symbol)} ${String(symbolPosition)}`;
          expect(node !== null, label).toBe(expected);
          expect(listed, label).toBe(expected);
          if (node) expect(node.textContent, label).toBe(symbol);
          cleanup();
        }
      }
    }
  });

  it('a truthy symbol with a position outside the union renders exactly the no-symbol DOM', () => {
    for (const mode of MODE_NAMES) {
      for (const state of ['clean', 'helper'] as const) {
        const plain = mount(opts(mode, STATES[state].options)).container.innerHTML;
        cleanup();
        const odd = mount(
          opts(mode, { ...STATES[state].options, symbol: 'USD', symbolPosition: 'left' })
        );
        expect(odd.container.innerHTML, `${mode} ${state}`).toBe(plain);
        cleanup();
      }
    }
  });

  it('the symbol text is rendered as given: spaces kept, case kept', () => {
    mount(opts('exact', { symbol: ' eth ' }));
    expect(document.getElementById(SYMBOL_ID)?.textContent).toBe(' eth ');
  });
});

describe('INV-8: the symbol never enters the value or the validation', () => {
  interface Snapshot {
    text: string;
    value: unknown;
    error: string | undefined;
    alerts: string[];
    submitted: FieldValues[];
  }

  async function runScript(mode: ModeName, symbol: string | undefined): Promise<Snapshot[]> {
    const user = userEvent.setup();
    const m = mount(
      opts(mode, {
        symbol,
        decimals: 2,
        validation: { required: true },
        ...(mode === 'default' ? { min: 0, max: 1000000, step: 1 } : {}),
      })
    );
    const out: Snapshot[] = [];
    const snap = (): void => {
      out.push({
        text: m.input().value,
        value: m.api.form?.getValues('amount'),
        error: m.api.form?.getFieldState('amount').error?.message,
        alerts: screen.queryAllByRole('alert').map((a) => a.textContent ?? ''),
        submitted: [...m.api.submitted],
      });
    };
    await m.submit(); // required error
    snap();
    await user.click(m.input());
    await user.keyboard('1234.5');
    snap();
    await user.click(screen.getByRole('button', { name: 'After' })); // blur
    snap();
    await user.click(m.input());
    snap(); // focused again (grouped mode shows plain text)
    await user.keyboard('{ArrowUp}');
    snap();
    await user.keyboard('{Control>}a{/Control}');
    await user.paste('99.999');
    snap(); // pasted over the selection; too many decimals for 2
    await user.keyboard('{Escape}');
    snap();
    await user.click(m.input());
    await user.keyboard('42');
    await m.submit();
    snap();
    await act(async () => {
      m.api.form?.reset({ amount: '7' });
    });
    snap();
    await m.submit();
    snap();
    cleanup();
    return out;
  }

  it.each(MODE_NAMES)(
    '%s mode: text, value, error and payload are the same with and without USD at every step',
    async (mode) => {
      const without = await runScript(mode, undefined);
      const withSymbol = await runScript(mode, 'USD');
      expect(withSymbol).toEqual(without);
      for (const step of withSymbol) {
        expect(step.text).not.toContain('USD');
        expect(String(step.value ?? '')).not.toContain('USD');
      }
      // The script drove real writes: a submit got through at least once.
      expect(withSymbol.at(-1)?.submitted.length).toBeGreaterThan(0);
    }
  );

  it('failure case: an invalid value with a symbol shows the same error text as without', async () => {
    for (const mode of MODE_NAMES) {
      const texts: string[][] = [];
      for (const symbol of [undefined, 'USD']) {
        const m = mount(opts(mode, { symbol, min: 10 }), { amount: '5' });
        await m.submit();
        texts.push(screen.queryAllByRole('alert').map((a) => a.textContent ?? ''));
        cleanup();
      }
      expect(texts[1], mode).toEqual(texts[0]);
      expect(texts[0]?.length, mode).toBeGreaterThan(0);
    }
  });
});

describe('INV-10: release note and shipped source', () => {
  const repoRoot = path.resolve(__dirname, '../../../../../..');
  const note = readFileSync(path.join(repoRoot, '.changeset/amount-field-symbol.md'), 'utf8');

  it('the changeset is a patch with a "Behaviour change:" line naming what changed', () => {
    expect(note).toMatch(/^---\n'@openzeppelin\/ui-components': patch\n---/);
    const line = note.split('\n').find((l) => l.startsWith('Behaviour change:')) ?? '';
    expect(line).not.toBe('');
    for (const word of [
      'text-muted-foreground',
      'text size',
      'disabled',
      '{id}-symbol',
      'aria-describedby',
      'remounts the input',
    ]) {
      expect(line, word).toContain(word);
    }
    expect(note).toMatch(/padded/); // the padding change
  });

  it('no plan ids in the changeset or the shipped files', () => {
    const files = [
      '.changeset/amount-field-symbol.md',
      'packages/components/src/components/fields/AmountField.tsx',
      'packages/components/src/components/fields/AmountFieldExactInput.tsx',
      'packages/components/src/components/fields/AmountFieldGroupedExactInput.tsx',
      'examples/basic-react-app/src/components/AmountExactEntryDemo.tsx',
      'docs/amount-field/api-reference.md',
    ];
    for (const file of files) {
      expect(readFileSync(path.join(repoRoot, file), 'utf8'), file).not.toMatch(
        /\bSF-\d|\bINV-\d|artifacts\//
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Interaction & transition
// ---------------------------------------------------------------------------

describe('INV-11: focus reaches the input with a symbol', () => {
  it.each(MODE_NAMES)(
    '%s mode: an invalid submit focuses the input; setFocus behaves as without a symbol',
    async (mode) => {
      const outcome: string[] = [];
      for (const symbol of [undefined, 'USD']) {
        const m = mount(opts(mode, { symbol, validation: { required: true } }));
        await m.submit();
        expect(document.activeElement).toBe(m.input());
        act(() => screen.getByRole('button', { name: 'Before' }).focus());
        act(() => m.api.form?.setFocus('amount'));
        outcome.push(
          document.activeElement === m.input()
            ? 'input'
            : String(document.activeElement?.textContent)
        );
        cleanup();
      }
      expect(outcome[1]).toBe(outcome[0]);
    }
  );

  it.each(MODE_NAMES)(
    '%s mode: Tab goes Before → input → After, no stop on the symbol',
    async (mode) => {
      const user = userEvent.setup();
      mount(opts(mode, { symbol: 'USD', symbolPosition: 'prefix' }));
      act(() => screen.getByRole('button', { name: 'Before' }).focus());
      await user.tab();
      expect(document.activeElement?.id).toBe('amount');
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'After' }));
    }
  );
});

describe('INV-12: changing the symbol text keeps the input, focus, caret and text', () => {
  it.each(MODE_NAMES)('%s mode: USD → ETH while typing', async (mode) => {
    const user = userEvent.setup();
    const m = mount(opts(mode, { symbol: 'USD' }));
    const node = m.input();
    await user.click(node);
    await user.keyboard('1234.5');
    node.setSelectionRange(2, 2);
    const blur = vi.fn();
    const focus = vi.fn();
    node.addEventListener('blur', blur);
    node.addEventListener('focus', focus);
    m.rerender(opts(mode, { symbol: 'ETH' }));
    expect(m.input()).toBe(node);
    expect(document.activeElement).toBe(node);
    expect(node.value).toBe('1234.5'); // grouped mode stays plain while focused
    expect(node.selectionStart).toBe(2);
    expect(blur).not.toHaveBeenCalled();
    expect(focus).not.toHaveBeenCalled();
    expect(document.getElementById(SYMBOL_ID)?.textContent).toBe('ETH');
    expect(computeAccessibleDescription(node)).toBe('ETH');
    expect(m.api.form?.getValues('amount')).toBe('1234.5');
  });

  it.each(MODE_NAMES)(
    '%s mode: switching position moves the symbol to the other slot and keeps the input and focus',
    async (mode) => {
      const user = userEvent.setup();
      const m = mount(opts(mode, { symbol: 'USD', symbolPosition: 'prefix' }));
      expect(m.container.querySelector(`${START} #${SYMBOL_ID}`)).not.toBeNull();
      const node = m.input();
      await user.click(node);
      await user.keyboard('12.5');
      m.rerender(opts(mode, { symbol: 'USD', symbolPosition: 'suffix' }));
      expect(m.container.querySelector(START)).toBeNull();
      expect(m.container.querySelector(`${END} #${SYMBOL_ID}`)).not.toBeNull();
      expect(describedBy(m.input())[0]).toBe(SYMBOL_ID);
      expect(m.input()).toBe(node);
      expect(document.activeElement).toBe(node);
      expect(node.value).toBe('12.5');
      m.rerender(opts(mode, { symbol: 'USD', symbolPosition: 'prefix' }));
      expect(m.input()).toBe(node);
      expect(document.activeElement).toBe(node);
    }
  );
});

describe('INV-13: adding or removing the symbol is safe', () => {
  it.each(MODE_NAMES)(
    '%s mode: "" → USD → "" → $ prefix keeps the form state and the ref',
    async (mode) => {
      const user = userEvent.setup();
      const m = mount(opts(mode, { symbol: '', validation: { required: true } }));
      await user.click(m.input());
      await user.keyboard('12.5');
      await user.click(screen.getByRole('button', { name: 'After' }));
      const value = m.api.form?.getValues('amount');
      const fieldState = (): unknown => {
        const s = m.api.form?.getFieldState('amount');
        return { isTouched: s?.isTouched, isDirty: s?.isDirty, error: s?.error?.message };
      };
      const before = fieldState();
      for (const extra of [
        { symbol: 'USD' },
        { symbol: '' },
        { symbol: '$', symbolPosition: 'prefix' },
        { symbol: '$', symbolPosition: 'suffix' },
        { symbol: undefined },
      ]) {
        m.rerender(opts(mode, { validation: { required: true }, ...extra }));
        const rendered = document.getElementById(SYMBOL_ID) !== null;
        expect(rendered).toBe(Boolean(extra.symbol));
        expect(describedBy(m.input()).includes(SYMBOL_ID)).toBe(rendered);
        expect(m.api.form?.getValues('amount')).toBe(value);
        expect(fieldState()).toEqual(before);
        expect(m.input().isConnected).toBe(true);
      }
      // field.ref ends on the live input: an invalid submit focuses it.
      act(() => screen.getByRole('button', { name: 'Before' }).focus());
      await act(async () => {
        m.api.form?.setValue('amount', '');
      });
      await m.submit();
      expect(document.activeElement).toBe(m.input());
      expect(consoleError).not.toHaveBeenCalled();
    }
  );
});

describe('INV-14: a disabled field dims the symbol; a focusable read-only one does not', () => {
  const READ_ONLY: Array<[string, Record<string, unknown>]> = [
    ['editable', {}],
    ['readOnly, readonly mode', { readOnly: true, readOnlyMode: 'readonly' }],
    ['readOnly, disabled mode', { readOnly: true, readOnlyMode: 'disabled' }],
    ['readOnly, default mode', { readOnly: true }],
  ];

  for (const mode of MODE_NAMES) {
    it.each(READ_ONLY)(
      `${mode} mode, %s: slot has opacity-50 iff the input is disabled`,
      (_label, extra) => {
        const m = mount(opts(mode, { symbol: 'USD', ...extra }));
        const slot = m.container.querySelector(END) as HTMLElement;
        expect(slot.classList.contains('opacity-50')).toBe(m.input().disabled);
        expect(slot.hasAttribute('aria-hidden')).toBe(false);
      }
    );
  }

  it.each(MODE_NAMES)(
    '%s mode: a read-only flip during a save keeps the input and dims in the same commit',
    (mode) => {
      for (const readOnlyMode of ['readonly', 'disabled'] as const) {
        const m = mount(opts(mode, { symbol: 'USD', readOnlyMode }), { amount: '5' });
        const node = m.input();
        for (const readOnly of [true, false, true]) {
          m.rerender(opts(mode, { symbol: 'USD', readOnlyMode, readOnly }));
          expect(m.input()).toBe(node);
          const dimmed = (m.container.querySelector(END) as HTMLElement).classList.contains(
            'opacity-50'
          );
          expect(dimmed).toBe(node.disabled);
          expect(node.disabled).toBe(readOnly && readOnlyMode === 'disabled');
        }
        cleanup();
      }
    }
  );
});

// ---------------------------------------------------------------------------
// Performance & stability
// ---------------------------------------------------------------------------

describe('INV-15: no observer without a symbol, one per symbol slot', () => {
  it.each(MODE_NAMES)('%s mode', (mode) => {
    let constructed = 0;
    let disconnected = 0;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor() {
          constructed += 1;
        }
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {
          disconnected += 1;
        }
      }
    );
    const plain = mount(opts(mode));
    plain.rerender(opts(mode, { helperText: 'Help' }));
    expect(constructed).toBe(0);
    cleanup();
    const view = mount(opts(mode, { symbol: 'USD' }));
    expect(constructed).toBe(1);
    view.rerender(opts(mode, { symbol: 'ETH' })); // content change: same observer
    expect(constructed).toBe(1);
    cleanup();
    expect(disconnected).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

describe('INV-16: aria-describedby is the symbol id, then the 006 ids in the 006 order', () => {
  for (const mode of MODE_NAMES) {
    it.each(STATE_NAMES)(`${mode} mode, %s`, async (state) => {
      const plain = await mountInState(mode, state, {});
      const plainIds = describedBy(plain.input());
      const { 'aria-describedby': _d, value: _v, ...plainAria } = attributesOf(plain.input());
      const plainName = computeAccessibleName(plain.input());
      cleanup();
      for (const position of ['prefix', 'suffix'] as const) {
        const m = await mountInState(mode, state, { symbol: 'USD', symbolPosition: position });
        const ids = describedBy(m.input());
        expect(ids[0]).toBe(SYMBOL_ID);
        expect(ids.slice(1)).toEqual(plainIds);
        expect(new Set(ids).size).toBe(ids.length);
        for (const id of ids) expect(document.querySelectorAll(`#${id}`), id).toHaveLength(1);
        const { 'aria-describedby': _d2, value: _v2, ...aria } = attributesOf(m.input());
        expect(aria).toEqual(plainAria); // aria-errormessage, aria-invalid, aria-required, ...
        expect(screen.getByRole('textbox', { name: plainName })).toBe(m.input());
        expect(computeAccessibleName(m.input())).not.toContain('USD');
        cleanup();
      }
    });
  }
});

describe('INV-17: the computed description starts with the symbol, then the 006 texts', () => {
  for (const mode of MODE_NAMES) {
    it.each(STATE_NAMES)(`${mode} mode, %s`, async (state) => {
      const plain = await mountInState(mode, state, {});
      const plainDescription = computeAccessibleDescription(plain.input());
      cleanup();
      const m = await mountInState(mode, state, { symbol: 'USD' });
      const expected = plainDescription ? `USD ${plainDescription}` : 'USD';
      expect(computeAccessibleDescription(m.input())).toBe(expected);
      const node = document.getElementById(SYMBOL_ID) as HTMLElement;
      for (
        let el: HTMLElement | null = node;
        el && el !== m.input().parentElement;
        el = el.parentElement
      ) {
        expect(el.hasAttribute('aria-hidden')).toBe(false);
        expect(el.hidden).toBe(false);
      }
    });
  }

  it('the error and helper texts keep their order after the symbol', async () => {
    const m = await mountInState('exact', 'error + helper', { symbol: 'USD' });
    expect(computeAccessibleDescription(m.input())).toBe('USD This field is required Help text');
  });
});
