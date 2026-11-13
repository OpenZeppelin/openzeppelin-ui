/**
 * Internal helper for the focusable read-only mode.
 *
 * Imported by path from the fields that support `readOnlyMode`. Deliberately NOT
 * re-exported from `./index.ts`: `fields/index.ts` re-exports `utils/*`, so adding
 * it there would make it public API.
 */
import type { ReadOnlyMode } from '../BaseField';

/** What a field needs to wire `readOnly` + `readOnlyMode` into RHF, its control and its handlers. */
export interface ReadOnlyState {
  /**
   * Value for the Controller / useController `disabled` prop.
   * Default mode: `readOnly` exactly as passed (`undefined` stays `undefined`, so RHF sees what it
   * sees today). Readonly mode: always `false`, so the name never joins RHF's disabled set and its
   * value stays in `handleSubmit` data.
   */
  readonly controllerDisabled: boolean | undefined;
  /** True when `readOnly && mode === 'readonly'`. Every kit-owned write path checks it before writing. */
  readonly isFocusableReadOnly: boolean;
  /**
   * Props for the `<Input>` / `<Textarea>` control, spread after `{...field}` and the
   * accessibility props so they win.
   */
  readonly controlProps: ReadOnlyControlProps;
}

/** The control props a field spreads onto its `<Input>` / `<Textarea>`. */
export interface ReadOnlyControlProps {
  disabled: boolean | undefined;
  readOnly?: boolean;
  'data-readonly'?: '';
}

/**
 * Turns `readOnly` plus `readOnlyMode` into the three outputs a field needs.
 *
 * Pure (no hooks), so it is safe in any render branch. The mode comparison is strict: any value
 * other than `'readonly'`, including unknown strings from JS callers, behaves as `'disabled'`
 * (fails closed to today's behaviour).
 */
export function getReadOnlyState(
  readOnly: boolean | undefined,
  mode: ReadOnlyMode = 'disabled'
): ReadOnlyState {
  // Anything but the exact opt-in keeps today's values, `undefined` included.
  if (mode !== 'readonly') {
    return {
      controllerDisabled: readOnly,
      isFocusableReadOnly: false,
      controlProps: { disabled: readOnly },
    };
  }

  // Readonly mode never registers the field as disabled with RHF.
  if (readOnly === true) {
    return {
      controllerDisabled: false,
      isFocusableReadOnly: true,
      // Native readonly + the data attribute the base Input/Textarea look keys on.
      controlProps: { disabled: false, readOnly: true, 'data-readonly': '' },
    };
  }

  return {
    controllerDisabled: false,
    isFocusableReadOnly: false,
    controlProps: { disabled: false, readOnly: false },
  };
}
