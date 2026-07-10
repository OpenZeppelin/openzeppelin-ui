/**
 * @vitest-environment jsdom
 *
 * SF-3 Rev-2 · INV-82 — the LOCKED strictly-additive / no-break guarantee.
 *
 * Part 1 (resolver-null dead branch): with NO `NameResolverProvider` mounted,
 * every ENS branch is dead code — value-writing, sync validation, error
 * strings, describedby wiring, and placeholder are byte-identical to the
 * legacy field. (The pre-existing `AddressField.test.tsx` suite, which runs
 * UNMODIFIED, is the structural half of this net; these tests pin the
 * ENS-adjacent observables it never asserted.)
 *
 * Part 2: with a resolver present, the hex / malformed / empty paths still
 * behave identically — only the name-candidate path diverges.
 */
import { fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  controlledResolver,
  elapseDebounce,
  flush,
  HEX_ALICE,
  renderAddressField,
  typeValue,
} from './helpers';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

const LEGACY_INVALID_FORMAT = 'Invalid address format for the selected chain';
const LEGACY_REQUIRED = 'This field is required';

describe('INV-82 part 1: no provider → the ENS surface does not exist', () => {
  it('renders NO resolution region and the legacy placeholder', () => {
    const h = renderAddressField({});
    expect(h.region()).toBeNull();
    expect(h.input().placeholder).toBe('0x...');
  });

  it('keeps the legacy aria-describedby wiring verbatim (helperText only)', () => {
    const h = renderAddressField({ helperText: 'Recipient address' });
    // legacy template: `${descriptionId} ${errorId-or-empty}` — including its trailing space
    expect(h.input().getAttribute('aria-describedby')).toBe('recipient-description ');
  });

  it('valid hex paste: raw passthrough, valid form, no resolution attempt possible', async () => {
    const h = renderAddressField({ required: true });
    typeValue(HEX_ALICE);
    await flush();
    expect(h.rhfValue()).toBe(HEX_ALICE);
    expect(h.rhfIsValid()).toBe(true);
    expect(document.body.textContent).not.toContain('Resolving…');
  });

  it('invalid hex-ish paste: raw value + the exact legacy error string', async () => {
    const h = renderAddressField({ required: true });
    typeValue('0xdeadbeef');
    fireEvent.blur(h.input());
    await flush();
    expect(h.rhfValue()).toBe('0xdeadbeef');
    expect(h.rhfIsValid()).toBe(false);
    expect(document.getElementById('recipient-error')?.textContent).toContain(
      LEGACY_INVALID_FORMAT
    );
  });

  it('required-empty: the exact legacy required message after touch', async () => {
    const h = renderAddressField({ required: true });
    typeValue('x');
    typeValue('');
    fireEvent.blur(h.input());
    await flush();
    expect(h.rhfIsValid()).toBe(false);
    expect(document.getElementById('recipient-error')?.textContent).toContain(LEGACY_REQUIRED);
  });

  it('optional-empty stays valid (legacy contract)', async () => {
    const h = renderAddressField({ required: false });
    typeValue('x');
    typeValue('');
    await flush();
    expect(h.rhfIsValid()).toBe(true);
  });

  it('a name-shaped input is plain legacy malformed: raw value, invalid-format error, no resolution chrome, no pending gate', async () => {
    const h = renderAddressField({ required: true });
    typeValue('alice.eth');
    fireEvent.blur(h.input());
    await elapseDebounce(); // give any (wrongly) armed machine time to surface
    await flush();

    // legacy: the raw string IS the RHF value (not '' — the ENS write model is dead)
    expect(h.rhfValue()).toBe('alice.eth');
    expect(h.rhfIsValid()).toBe(false);
    expect(document.getElementById('recipient-error')?.textContent).toContain(
      LEGACY_INVALID_FORMAT
    );
    expect(document.body.textContent).not.toContain('Resolving…');
    expect(h.region()).toBeNull();
  });

  it('the input mirrors external form-value updates exactly as before (display decouple is a no-op)', async () => {
    const h = renderAddressField({});
    typeValue(HEX_ALICE);
    await flush();
    expect(h.input().value).toBe(HEX_ALICE);
    expect(h.input().value).toBe(h.rhfValue()); // value={inputValue} ≡ field.value with no resolver
  });
});

describe('INV-82 part 2: resolver present — hex/malformed/empty paths byte-identical, only names diverge', () => {
  it('valid hex paste behaves exactly as legacy (raw write, valid, zero resolver calls)', async () => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName }, required: true });
    typeValue(HEX_ALICE);
    await elapseDebounce();
    expect(h.rhfValue()).toBe(HEX_ALICE);
    expect(h.rhfIsValid()).toBe(true);
    expect(r.resolveName).not.toHaveBeenCalled();
  });

  it('malformed input keeps the exact legacy error string (never an ENS message)', async () => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName }, required: true });
    typeValue('not an address');
    fireEvent.blur(h.input());
    await elapseDebounce();
    expect(h.rhfValue()).toBe('not an address');
    expect(document.getElementById('recipient-error')?.textContent).toContain(
      LEGACY_INVALID_FORMAT
    );
    expect(h.region()?.textContent).toBe('');
    expect(r.resolveName).not.toHaveBeenCalled();
  });

  it('required-empty keeps the exact legacy required message', async () => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName }, required: true });
    typeValue('x');
    typeValue('');
    fireEvent.blur(h.input());
    await flush();
    expect(h.rhfIsValid()).toBe(false);
    expect(document.getElementById('recipient-error')?.textContent).toContain(LEGACY_REQUIRED);
  });

  it('the placeholder upgrade is the only idle-state divergence (documents the resolver-present default)', () => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName } });
    expect(h.input().placeholder).toBe('0x... or name');
  });
});
