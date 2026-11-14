/**
 * 005 SF-19 · `getReadOnlyState` (INV-6: total, pure, fails closed) and the package boundary
 * of the helper (INV-9 runtime half; the type half is `readonly-mode.types.sf19-check.tsx`).
 */
import { describe, expect, it } from 'vitest';

import * as pkg from '../../../index';
import type { ReadOnlyMode } from '../BaseField';
import * as fieldsBarrel from '../index';
import { getReadOnlyState } from '../utils/readOnlyState';

/** Mode values a JS caller (or a renderer config) could pass at runtime. */
const asMode = (s: string): ReadOnlyMode => s as ReadOnlyMode;

describe('INV-6: getReadOnlyState truth table', () => {
  const defaultModes: ReadonlyArray<[string, ReadOnlyMode | undefined]> = [
    ['undefined', undefined],
    ["'disabled'", 'disabled'],
    ["'READONLY' (wrong case)", asMode('READONLY')],
    ["'focusable' (unknown)", asMode('focusable')],
    ["'' (empty)", asMode('')],
    ["' readonly' (padded)", asMode(' readonly')],
  ];

  describe.each(defaultModes)('mode %s → default branch (fails closed)', (_label, mode) => {
    it.each([true, false, undefined])('readOnly=%s keeps readOnly verbatim', (readOnly) => {
      expect(getReadOnlyState(readOnly, mode)).toStrictEqual({
        controllerDisabled: readOnly,
        isFocusableReadOnly: false,
        controlProps: { disabled: readOnly },
      });
    });
  });

  it("readOnly=true + 'readonly' → focusable read-only", () => {
    expect(getReadOnlyState(true, 'readonly')).toStrictEqual({
      controllerDisabled: false,
      isFocusableReadOnly: true,
      controlProps: { disabled: false, readOnly: true, 'data-readonly': '' },
    });
  });

  it.each([false, undefined])("readOnly=%s + 'readonly' → editable, never disabled", (readOnly) => {
    expect(getReadOnlyState(readOnly, 'readonly')).toStrictEqual({
      controllerDisabled: false,
      isFocusableReadOnly: false,
      controlProps: { disabled: false, readOnly: false },
    });
  });

  it('default mode keeps undefined as undefined (not false), so RHF sees what it sees today', () => {
    const s = getReadOnlyState(undefined);
    expect(s.controllerDisabled).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(s.controlProps, 'disabled')).toBe(true);
    expect(s.controlProps.disabled).toBeUndefined();
    expect('readOnly' in s.controlProps).toBe(false);
    expect('data-readonly' in s.controlProps).toBe(false);
  });

  it('is pure: equal inputs give equal outputs, fresh objects, no shared mutation', () => {
    const a = getReadOnlyState(true, 'readonly');
    const b = getReadOnlyState(true, 'readonly');
    expect(a).toStrictEqual(b);
    expect(a).not.toBe(b);
    expect(a.controlProps).not.toBe(b.controlProps);
    (a.controlProps as { disabled: boolean | undefined }).disabled = true;
    expect(getReadOnlyState(true, 'readonly').controlProps.disabled).toBe(false);
  });

  it('calls no hooks (INV-23): it runs outside a React render without throwing', () => {
    expect(() => getReadOnlyState(true, 'readonly')).not.toThrow();
    expect(() => getReadOnlyState(false)).not.toThrow();
  });
});

describe('INV-9: the helper stays internal', () => {
  it('package entry exports ReadOnly types only, not getReadOnlyState', () => {
    expect('getReadOnlyState' in pkg).toBe(false);
    expect('ReadOnlyState' in pkg).toBe(false);
  });

  it('fields barrel (utils re-export) does not expose getReadOnlyState', () => {
    expect('getReadOnlyState' in fieldsBarrel).toBe(false);
  });

  it('the supported fields are exported from the package entry', () => {
    for (const name of [
      'TextField',
      'TextAreaField',
      'NumberField',
      'BigIntField',
      'AmountField',
      'UrlField',
      'PasswordField',
      'BytesField',
      'AddressField',
      'DateTimeField',
    ]) {
      expect(name in pkg, name).toBe(true);
    }
  });
});
