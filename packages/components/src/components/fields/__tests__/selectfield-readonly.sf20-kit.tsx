/**
 * 005 SF-20 · Shared harness for the SelectField read-only tests (jsdom and Chromium).
 *
 * One form per mounted select. `readOnly` / `readOnlyMode` (and the other props) are switched with
 * `rerender`, so the field and the form stay mounted across the switch, the way an app's save does.
 * Not a test file: no `.test.` in the name, so neither vitest config collects it.
 */
/* eslint-disable react-refresh/only-export-components -- test harness, never hot-reloaded */
import { act, render } from '@testing-library/react';
import React, { Profiler } from 'react';
import { useForm, type FieldErrors, type Mode, type UseFormReturn } from 'react-hook-form';

import type { ReadOnlyMode } from '../BaseField';
import { SelectField, type SelectFieldProps, type SelectOption } from '../SelectField';

export interface Values {
  role?: string | null;
  [key: string]: unknown;
}

export const OPTIONS: readonly SelectOption[] = [
  { value: 'alpha', label: 'Alpha' },
  { value: 'beta', label: 'Beta' },
  { value: 'gamma', label: 'Gamma' },
];

export const PLACEHOLDER = 'Select an option';
export const LABEL = 'Role';
export const ID = 'role';

/** Props a test switches between renders. `readOnlyMode` is a string so JS callers can be modelled. */
export interface SwitchProps {
  readOnly?: boolean;
  readOnlyMode?: string;
  helperText?: string;
  required?: boolean;
  options?: readonly SelectOption[];
  validateSelect?: (value: string) => boolean | string;
}

export type SelectComponent = (props: SelectFieldProps<Values>) => React.ReactElement;

export interface MountOptions extends SwitchProps {
  /** Initial RHF value of `role` (`undefined` leaves it out of `defaultValues`). */
  value?: string | null;
  mode?: Mode;
  before?: React.ReactNode;
  after?: React.ReactNode;
  onValid?: (data: Values) => void;
  onInvalid?: (errors: FieldErrors<Values>) => void;
  /** Swap the component under test (the variant runner points `../SelectField` elsewhere). */
  Component?: SelectComponent;
}

export interface Mounted {
  /** The form returned by `useForm`, current after the latest render. */
  api: () => UseFormReturn<Values>;
  trigger: () => HTMLButtonElement;
  label: () => HTMLLabelElement;
  /** The listbox if mounted (Radix portals it to `document.body`). */
  listbox: () => HTMLElement | null;
  /** Radix's hidden native `<select>` (rendered inside a form). */
  nativeSelect: () => HTMLSelectElement | null;
  /** The field's container (`div.flex.flex-col`). */
  container: () => HTMLElement;
  rerender: (next: SwitchProps) => void;
  submit: () => Promise<void>;
  /** Profiler commits of the subtree around the field since mount. */
  commits: () => number;
  unmount: () => void;
}

export const READONLY = { readOnly: true, readOnlyMode: 'readonly' } as const;
export const EDITABLE_OPTED_IN = { readOnly: false, readOnlyMode: 'readonly' } as const;

/** Narrow a JS-side mode string to the prop type, so 'bogus' can be passed the way JS can. */
function asMode(mode: string | undefined): ReadOnlyMode | undefined {
  return mode as ReadOnlyMode | undefined;
}

interface HostProps {
  opts: MountOptions;
  props: SwitchProps;
  onForm: (form: UseFormReturn<Values>) => void;
  onCommit: () => void;
}

function Host({ opts, props, onForm, onCommit }: HostProps): React.ReactElement {
  const form = useForm<Values>({
    mode: opts.mode ?? 'onSubmit',
    defaultValues: opts.value === undefined ? {} : { role: opts.value },
  });
  onForm(form);
  const Component: SelectComponent = opts.Component ?? SelectField;
  const { required, options, readOnlyMode, ...rest } = props;
  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(
        (data) => opts.onValid?.(data),
        (errors) => opts.onInvalid?.(errors)
      )}
    >
      {opts.before}
      <Profiler id="sf20" onRender={onCommit}>
        <Component
          id={ID}
          name="role"
          label={LABEL}
          control={form.control}
          options={[...(options ?? OPTIONS)]}
          validation={required ? { required: true } : undefined}
          readOnlyMode={asMode(readOnlyMode)}
          {...rest}
        />
      </Profiler>
      {opts.after}
      <button type="submit">Submit</button>
    </form>
  );
}

/** Keep only the keys the caller set, so `rerender` can drop a prop (back to "absent"). */
function switchProps(o: SwitchProps): SwitchProps {
  const out: SwitchProps = {};
  if ('readOnly' in o) out.readOnly = o.readOnly;
  if ('readOnlyMode' in o) out.readOnlyMode = o.readOnlyMode;
  if ('helperText' in o) out.helperText = o.helperText;
  if ('required' in o) out.required = o.required;
  if ('options' in o) out.options = o.options;
  if ('validateSelect' in o) out.validateSelect = o.validateSelect;
  return out;
}

/** Mount one SelectField in its own form; `rerender` switches props without remounting. */
export function mountSelect(opts: MountOptions = {}): Mounted {
  let form: UseFormReturn<Values> | undefined;
  let commits = 0;
  const onForm = (f: UseFormReturn<Values>): void => {
    form = f;
  };
  const onCommit = (): void => {
    commits += 1;
  };
  const el = (props: SwitchProps): React.ReactElement => (
    <Host opts={opts} props={props} onForm={onForm} onCommit={onCommit} />
  );
  const utils = render(el(switchProps(opts)));
  const trigger = (): HTMLButtonElement =>
    utils.container.querySelector(`#${ID}`) as HTMLButtonElement;
  return {
    api: () => {
      if (!form) throw new Error('form not mounted');
      return form;
    },
    trigger,
    label: () => utils.container.querySelector(`label[for="${ID}"]`) as HTMLLabelElement,
    listbox: () => document.querySelector('[role="listbox"]'),
    nativeSelect: () => utils.container.querySelector('select'),
    container: () => trigger().closest('div.flex.flex-col') as HTMLElement,
    rerender: (next) => utils.rerender(el(switchProps(next))),
    submit: async () => {
      const button = utils.container.querySelector('button[type="submit"]') as HTMLButtonElement;
      await act(async () => {
        button.click();
      });
    },
    commits: () => commits,
    unmount: () => utils.unmount(),
  };
}

/** The read-only description element, if rendered. */
export function readOnlyNote(): HTMLElement | null {
  return document.getElementById(`${ID}-readonly`);
}

/** Text the trigger shows (the `SelectValue` span). */
export function shownText(trigger: HTMLElement): string {
  return (trigger.querySelector('span') ?? trigger).textContent ?? '';
}

/** Every id in `aria-describedby`, in order. */
export function describedByIds(el: Element): string[] {
  const v = el.getAttribute('aria-describedby');
  return v === null ? [] : v.split(' ');
}

/** The trigger's attributes as a sorted record, with Radix's generated ids normalised. */
export function attrs(el: Element): Record<string, string> {
  const out: Record<string, string> = {};
  for (const a of Array.from(el.attributes).sort((x, y) => x.name.localeCompare(y.name))) {
    out[a.name] = normalise(a.value);
  }
  return out;
}

/** Radix ids come from `useId` (`radix-«r1»`, `radix-:r1:`), which differs between renders. */
export function normalise(s: string): string {
  return s.replace(/radix-[^\s"]+/g, 'radix-ID').replace(/«r[0-9a-z]+»|:r[0-9a-z]+:/g, 'ID');
}

/** SF-20's look tokens on SelectTrigger, removed when comparing with the pre-SF-20 class. */
export const LOOK_TOKENS = /\s?data-readonly:not-disabled:[\w-]+/g;

/* ------------------------------------------------------------------------------------------------
 * INV-1 default-mode matrix, shared by the baseline capture (run once against the pre-SF-20
 * SelectField from a66d72dd0) and the committed parity test.
 * ---------------------------------------------------------------------------------------------- */

export interface Inv1Case {
  key: string;
  props: SwitchProps;
  value?: string;
  /** Submit once before the snapshot, so a required empty field shows its error. */
  submitFirst: boolean;
}

const RO_VALUES: ReadonlyArray<[string, Pick<SwitchProps, 'readOnly'>]> = [
  ['ro=absent', {}],
  ['ro=false', { readOnly: false }],
  ['ro=true', { readOnly: true }],
];
const MODE_VALUES: ReadonlyArray<[string, Pick<SwitchProps, 'readOnlyMode'>]> = [
  ['mode=absent', {}],
  ['mode=disabled', { readOnlyMode: 'disabled' }],
  ['mode=bogus', { readOnlyMode: 'bogus' }],
];
const SCENARIOS: ReadonlyArray<[string, Omit<Inv1Case, 'key' | 'props'> & { extra: SwitchProps }]> =
  [
    ['empty', { submitFirst: false, extra: {} }],
    ['value', { value: 'beta', submitFirst: false, extra: {} }],
    ['value+helper', { value: 'beta', submitFirst: false, extra: { helperText: 'Pick one' } }],
    ['error+helper', { submitFirst: true, extra: { helperText: 'Pick one', required: true } }],
  ];

/** 3 readOnly × 3 default modes × 4 scenarios = 36 cases. */
export const INV1_CASES: readonly Inv1Case[] = RO_VALUES.flatMap(([rk, ro]) =>
  MODE_VALUES.flatMap(([mk, mode]) =>
    SCENARIOS.map(([sk, s]) => ({
      key: `${rk}|${mk}|${sk}`,
      props: { ...ro, ...mode, ...s.extra },
      value: s.value,
      submitFirst: s.submitFirst,
    }))
  )
);

export interface CaseSnapshot {
  /** The field container's HTML, Radix ids normalised and SF-20 look tokens removed. */
  html: string;
  /** The same, with Radix's hidden native `<select>` removed (INV-2 compares visible nodes). */
  visibleHtml: string;
  /** What `handleSubmit` delivered for `role` (`'<absent>'` when the key is missing, `'<invalid>'`). */
  payload: string;
  /** Whether Enter on the focused trigger mounted the listbox. */
  opensOnEnter: boolean;
  /** RHF value after clicking "Gamma" in the open list. */
  valueAfterPick: string;
}

/** Remove SF-20's look tokens from every `class` attribute in an HTML string. */
export function stripLook(html: string): string {
  return html.replace(
    /class="([^"]*)"/g,
    (_m, c: string) => `class="${c.replace(LOOK_TOKENS, '')}"`
  );
}

/** Measure one INV-1 case on a fresh mount. Needs a jsdom with Radix's pointer gaps filled. */
export async function captureCase(
  c: Inv1Case,
  user: { click: (el: Element) => Promise<void>; keyboard: (k: string) => Promise<void> },
  Component?: SelectComponent
): Promise<CaseSnapshot> {
  let payload = '<not-submitted>';
  const m = mountSelect({
    ...c.props,
    value: c.value,
    Component,
    onValid: (d) => {
      payload = 'role' in d ? JSON.stringify(d.role ?? null) : '<absent>';
    },
    onInvalid: () => {
      payload = '<invalid>';
    },
  });
  if (c.submitFirst) await m.submit();
  const container = m.container();
  const html = stripLook(normalise(container.outerHTML));
  const clone = container.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('select').forEach((s) => s.remove());
  const visibleHtml = stripLook(normalise(clone.outerHTML));
  await m.submit();

  act(() => m.trigger().focus());
  await user.keyboard('{Enter}');
  const opensOnEnter = m.listbox() !== null;
  if (opensOnEnter) {
    const gamma = Array.from(document.querySelectorAll('[role="option"]')).find(
      (o) => o.textContent === 'Gamma'
    );
    if (gamma) await user.click(gamma);
  }
  const valueAfterPick = JSON.stringify(m.api().getValues('role') ?? null);
  m.unmount();
  return { html, visibleHtml, payload, opensOnEnter, valueAfterPick };
}

/** Radix Select needs these jsdom gaps filled to open via pointer/keyboard (as in SF-6's test). */
export function fillJsdomGaps(): void {
  const proto = window.HTMLElement.prototype;
  proto.hasPointerCapture ??= () => false;
  proto.releasePointerCapture ??= () => undefined;
  proto.setPointerCapture ??= () => undefined;
  proto.scrollIntoView ??= () => undefined;
}
