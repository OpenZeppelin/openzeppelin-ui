/**
 * Shared harness for the RadioField card / segmented / read-only suites (jsdom and Chromium).
 * One form, field id `plan`, name `plan`, label `Plan`. No test runner imports here, so both
 * runners can use it.
 */
/* eslint-disable react-refresh/only-export-components -- test harness, never hot-reloaded */
import { act, render, type RenderResult } from '@testing-library/react';
import React from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';

import { RadioField, type RadioFieldProps, type RadioOption } from '../RadioField';

export interface Values {
  plan: string;
}

export type Variant = 'default' | 'card' | 'segmented';
export const VARIANTS: readonly Variant[] = ['default', 'card', 'segmented'];

/** Plain, described and disabled options; the disabled one is last. */
export const OPTIONS: RadioOption[] = [
  { value: 'starter', label: 'Starter', description: 'For trying things out' },
  { value: 'team', label: 'Team' },
  { value: 'scale', label: 'Scale', description: 'Higher limits' },
  { value: 'enterprise', label: 'Enterprise', description: 'Contact sales', disabled: true },
];

/**
 * jsdom has no ResizeObserver. Radix renders a hidden bubble input per card or segment item
 * whenever the group sits inside a form (required or not), and that input measures itself.
 * No-op where the browser has one.
 */
export function installResizeObserverStub(): void {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
  }
}

/**
 * React 19's client `useId` draws from one counter per page, so the ids Radix gives card items
 * depend on how many components mounted earlier. Number them by first appearance.
 */
export function normaliseIds(html: string): string {
  const seen = new Map<string, string>();
  return html.replace(/_r_[0-9a-z]+_/g, (id) => {
    if (!seen.has(id)) seen.set(id, `useid${seen.size}`);
    return seen.get(id) as string;
  });
}

/** The opt-in that makes RadioField read-only. */
export const READ_ONLY = { readOnly: true, readOnlyMode: 'readonly' } as const;

export type FieldProps = Partial<Omit<RadioFieldProps<Values>, 'control' | 'name' | 'id'>>;

export interface MountOptions extends FieldProps {
  /** Form default for `plan`. `undefined` seeds no key at all. Default `''`. */
  seed?: string | undefined;
  /** Adds `noValidate` to the form. Default `true`. */
  noValidate?: boolean;
  mode?: 'onSubmit' | 'onTouched' | 'onBlur';
  before?: React.ReactNode;
  after?: React.ReactNode;
}

export interface Mounted {
  result: RenderResult;
  /** The live form API (from the latest render). */
  api: () => UseFormReturn<Values>;
  /** Every `handleSubmit` valid-handler payload, in order. */
  submitted: Values[];
  /** Number of invalid submits. */
  invalidCount: () => number;
  /** Kit writes: values passed to `field.onChange` (RHF reports them as `type: 'change'`). */
  writes: string[];
  form: () => HTMLFormElement;
  group: () => HTMLElement;
  radios: () => HTMLElement[];
  radio: (label: string) => HTMLElement;
  /** The element that represents "checked" for each radio, by label. */
  checkedLabels: () => string[];
  submitButton: () => HTMLButtonElement;
  /** Re-render the same form with new field props (the form state survives). */
  rerender: (next: MountOptions) => void;
  unmount: () => void;
}

function Host({
  opts,
  onApi,
  onValid,
  onInvalid,
}: {
  opts: MountOptions;
  onApi: (api: UseFormReturn<Values>) => void;
  onValid: (v: Values) => void;
  onInvalid: () => void;
}): React.ReactElement {
  const { seed, noValidate = true, mode = 'onSubmit', before, after, ...field } = opts;
  const seedValue = 'seed' in opts ? seed : '';
  const form = useForm<Values>({
    defaultValues: seedValue === undefined ? {} : { plan: seedValue },
    mode,
  });
  // formState is a proxy: only what is read during render is kept up to date.
  void form.formState.isDirty;
  void form.formState.dirtyFields;
  void form.formState.touchedFields;
  onApi(form);
  return (
    <form
      data-testid="host"
      noValidate={noValidate}
      onSubmit={form.handleSubmit(onValid, onInvalid)}
    >
      {before}
      <RadioField<Values>
        id="plan"
        name="plan"
        label="Plan"
        control={form.control}
        options={OPTIONS}
        {...field}
      />
      {after}
      <button type="submit">Submit</button>
    </form>
  );
}

/** Label text of a radio: the native input's label span, or the Radix item's name source. */
export function radioLabel(el: HTMLElement): string {
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const node = document.getElementById(labelledBy.split(' ')[0]);
    if (node) return node.textContent ?? '';
  }
  return el.textContent ?? '';
}

/** Whether a radio shows as checked: native `checked`, or Radix `aria-checked`. */
export function isChecked(el: HTMLElement): boolean {
  return el instanceof HTMLInputElement ? el.checked : el.getAttribute('aria-checked') === 'true';
}

/** Render the harness form with one RadioField and return handles to it. */
export function mountRadio(opts: MountOptions = {}): Mounted {
  let api: UseFormReturn<Values> | undefined;
  const submitted: Values[] = [];
  let invalid = 0;
  const writes: string[] = [];
  let subscribed = false;

  const onApi = (a: UseFormReturn<Values>): void => {
    api = a;
    if (!subscribed) {
      subscribed = true;
      a.watch((values, { type }) => {
        if (type === 'change') writes.push(String(values.plan));
      });
    }
  };
  const onValid = (v: Values): void => {
    submitted.push({ ...v });
  };
  const onInvalid = (): void => {
    invalid += 1;
  };

  const el = (o: MountOptions): React.ReactElement => (
    <Host opts={o} onApi={onApi} onValid={onValid} onInvalid={onInvalid} />
  );
  const result = render(el(opts));

  const form = (): HTMLFormElement =>
    result.container.querySelector('[data-testid="host"]') as HTMLFormElement;
  const group = (): HTMLElement => form().querySelector('[role="radiogroup"]') as HTMLElement;
  const radios = (): HTMLElement[] =>
    // Card / segmented: Radix items. Default: the native inputs. Radix's hidden bubble inputs
    // (aria-hidden, one per item inside a form) are not options.
    Array.from(
      group().querySelectorAll<HTMLElement>(
        '[role="radio"], input[type="radio"]:not([aria-hidden="true"])'
      )
    );

  return {
    result,
    api: () => {
      if (!api) throw new Error('form not mounted');
      return api;
    },
    submitted,
    invalidCount: () => invalid,
    writes,
    form,
    group,
    radios,
    radio: (label) => {
      const r = radios().find((x) => radioLabel(x) === label);
      if (!r) throw new Error(`no radio "${label}"`);
      return r;
    },
    checkedLabels: () => radios().filter(isChecked).map(radioLabel),
    submitButton: () => form().querySelector('button[type="submit"]') as HTMLButtonElement,
    rerender: (next) => result.rerender(el(next)),
    unmount: () => result.unmount(),
  };
}

/** Let Radix's roving-focus timers run (arrow keys move focus on a zero-delay timer). */
export async function tick(): Promise<void> {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

/**
 * Press a key the way a person does: Radix moves focus on a timer and only picks the newly
 * focused item while the arrow key is still down, so hold it across the timer, then release.
 * `key` is a user-event key name without braces (`ArrowDown`, `Home`, `Enter`, ` `).
 */
export async function press(
  user: { keyboard: (text: string) => Promise<void> },
  key: string
): Promise<void> {
  const name = key === ' ' ? 'Space' : key;
  await user.keyboard(`{${name}>}`);
  await tick();
  await user.keyboard(`{/${name}}`);
  await tick();
}

/** `setFocus` focuses on a zero-delay timer (react-hook-form 7.79); wait for it. */
export async function setFocusAndWait(m: Mounted): Promise<void> {
  await act(async () => {
    m.api().setFocus('plan');
    await new Promise((r) => setTimeout(r, 0));
  });
}

/** Submit through the form's submit event and let RHF's async handler settle. */
export async function submit(m: Mounted): Promise<void> {
  await act(async () => {
    m.form().requestSubmit();
  });
}
