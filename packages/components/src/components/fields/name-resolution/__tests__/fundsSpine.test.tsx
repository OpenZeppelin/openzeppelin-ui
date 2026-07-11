/**
 * @vitest-environment jsdom
 *
 * SF-3 Rev-2 · Funds-critical spine on the ENHANCED BASE `AddressField`
 * (INV-75 / INV-79 / INV-80 / INV-81 / INV-85, plus the INV-84 pending guard
 * and the INV-83 dispatch gate).
 *
 * Every test observes REAL react-hook-form state through the harness probe:
 * the RHF field value is a valid address IFF (pasted hex) OR (name resolved
 * AND still matching what the user sees) — in every other state it is `''`
 * and `formState.isValid` gates submit with no async validator (SC-004).
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { useForm } from 'react-hook-form';

import { AddressField } from '../../AddressField';
import { NameResolverProvider } from '../name-resolver-context';
import {
  addressing,
  controlledResolver,
  elapseDebounce,
  errResult,
  flush,
  HEX_ALICE,
  HEX_BOB,
  okResult,
  renderAddressField,
  settle,
  typeValue,
} from './helpers';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('INV-75: RHF value is a valid address IFF pasted hex OR resolved+matched name', () => {
  it('holds value="" and isValid=false through idle→debouncing→loading, then hex+valid only on resolved', async () => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName }, required: true });

    // idle (empty, required): submit gated
    expect(h.rhfValue()).toBe('');
    expect(h.rhfIsValid()).toBe(false);

    // typed name → immediate '' (debouncing)
    typeValue('alice.eth');
    await flush();
    expect(h.rhfValue()).toBe('');
    expect(h.rhfIsValid()).toBe(false);

    // loading (debounce elapsed, promise pending)
    await elapseDebounce();
    expect(r.calls).toEqual(['alice.eth']);
    expect(h.rhfValue()).toBe('');
    expect(h.rhfIsValid()).toBe(false);

    // resolved + matched → the hex is written and the form opens
    await settle(r.deferreds[0], okResult('alice.eth', HEX_ALICE));
    expect(h.rhfValue()).toBe(HEX_ALICE);
    expect(h.rhfIsValid()).toBe(true);
  });

  it('holds value="" and isValid=false in the error state', async () => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName }, required: true });

    typeValue('alice.eth');
    await elapseDebounce();
    await settle(r.deferreds[0], errResult({ code: 'NAME_NOT_FOUND', name: 'alice.eth' }));

    expect(h.rhfValue()).toBe('');
    expect(h.rhfIsValid()).toBe(false);
  });

  it('a pasted valid hex passes through immediately with zero resolution traffic (INV-83)', async () => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName }, required: true });

    typeValue(HEX_BOB);
    await flush();

    expect(h.rhfValue()).toBe(HEX_BOB);
    expect(h.rhfIsValid()).toBe(true);
    await elapseDebounce();
    expect(r.resolveName).not.toHaveBeenCalled();
  });

  it('a malformed non-name input carries the raw value, which fails isValidAddress (submit gated)', async () => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName }, required: true });

    typeValue('0xdeadbeef'); // hex-shaped but not 40 digits → malformed, never a name
    await elapseDebounce();

    expect(h.rhfValue()).toBe('0xdeadbeef');
    expect(h.rhfIsValid()).toBe(false);
    expect(r.resolveName).not.toHaveBeenCalled();
  });
});

describe('INV-79: resolved-write name-match guard', () => {
  it('suppresses a late resolution for a name the user has typed past (value never gets the stale hex)', async () => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName }, required: true });

    typeValue('alice.eth');
    await elapseDebounce();
    expect(r.calls).toEqual(['alice.eth']);

    // user types on before alice.eth settles
    typeValue('bob.eth');
    await flush();
    expect(h.rhfValue()).toBe('');

    // the stale alice.eth resolution settles late — must never write
    await settle(r.deferreds[0], okResult('alice.eth', HEX_ALICE));
    expect(h.rhfValue()).toBe('');
    expect(h.rhfIsValid()).toBe(false);
    expect(h.writes).not.toContain(HEX_ALICE);

    // the current name still resolves normally afterwards
    await elapseDebounce();
    expect(r.calls).toEqual(['alice.eth', 'bob.eth']);
    await settle(r.deferreds[1], okResult('bob.eth', HEX_BOB));
    expect(h.rhfValue()).toBe(HEX_BOB);
    expect(h.rhfIsValid()).toBe(true);
  });

  it('false-negative direction: case/whitespace-differing input ("  Alice.ETH ") still matches and writes', async () => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName }, required: true });

    typeValue('  Alice.ETH ');
    await elapseDebounce();
    // dispatched with the trim+lowercase normalization the SF-2 engine applies
    expect(r.calls).toEqual(['alice.eth']);

    await settle(r.deferreds[0], okResult('alice.eth', HEX_ALICE));
    // the guard compares normalize(inputValue) — a legitimate resolution is NOT blocked
    expect(h.rhfValue()).toBe(HEX_ALICE);
    expect(h.rhfIsValid()).toBe(true);
    // and the display still shows exactly what the user typed (INV-69)
    expect(h.input().value).toBe('  Alice.ETH ');
  });
});

describe('INV-80: a hex is written at exactly one status — resolved — never any other', () => {
  it('never writes a hex-shaped value while debouncing, loading, or errored', async () => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName }, required: true });
    const hexShaped = (v: string): boolean => /^0x[0-9a-fA-F]{40}$/.test(v);

    typeValue('alice.eth'); // debouncing
    await flush();
    await elapseDebounce(); // loading
    await settle(r.deferreds[0], errResult({ code: 'RESOLUTION_TIMEOUT', elapsedMs: 5000 })); // error

    expect(h.writes.filter(hexShaped)).toEqual([]);

    // sanity: the only hex write in the whole history comes from the resolved branch
    typeValue('bob.eth');
    await elapseDebounce();
    await settle(r.deferreds[1], okResult('bob.eth', HEX_BOB));
    expect(h.writes.filter(hexShaped)).toEqual([HEX_BOB]);
  });
});

describe('INV-81: editing a resolved field invalidates the stale hex synchronously', () => {
  it('fires onChange("") on the first changed character, before any re-resolution', async () => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName }, required: true });

    typeValue('alice.eth');
    await elapseDebounce();
    await settle(r.deferreds[0], okResult('alice.eth', HEX_ALICE));
    expect(h.rhfValue()).toBe(HEX_ALICE);

    // one keystroke — value cleared synchronously; asserted BEFORE any timer
    // advance / new dispatch (isValid needs one microtask for RHF's async
    // validator plumbing, still strictly before the debounce window)
    typeValue('alice.ethx');
    expect(h.rhfValue()).toBe('');
    await flush();
    expect(screen.getByTestId('rhf-valid').textContent).toBe('false');
    expect(r.calls).toEqual(['alice.eth']); // no new resolution yet
  });

  it('same-normalized re-entry (case/space variant) keeps RHF at the resolved hex — never "" while status=resolved', async () => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName }, required: true });

    typeValue('alice.eth');
    await elapseDebounce();
    await settle(r.deferreds[0], okResult('alice.eth', HEX_ALICE));
    expect(h.rhfValue()).toBe(HEX_ALICE);
    expect(h.rhfIsValid()).toBe(true);

    // Select-all paste of a case/space variant: normalize() is unchanged so the
    // machine stays `resolved`. Clearing to '' would strand the form (UI still
    // announces success; write-effect deps unchanged → hex never rewritten).
    typeValue('ALICE.ETH');
    await flush();
    expect(h.input().value).toBe('ALICE.ETH');
    expect(h.rhfValue()).toBe(HEX_ALICE);
    expect(h.rhfIsValid()).toBe(true);
    // No re-dispatch — normalized input is unchanged.
    expect(r.calls).toEqual(['alice.eth']);

    typeValue('  alice.eth ');
    await flush();
    expect(h.input().value).toBe('  alice.eth ');
    expect(h.rhfValue()).toBe(HEX_ALICE);
    expect(h.rhfIsValid()).toBe(true);
    expect(r.calls).toEqual(['alice.eth']);

    // A truly different name still clears synchronously (INV-81).
    typeValue('bob.eth');
    expect(h.rhfValue()).toBe('');
  });
});

describe('INV-85: no stale-hex cache across renders/closures', () => {
  it('rapid type→retype interleaving: the final value corresponds only to the final resolved+matched name', async () => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName }, required: true });

    typeValue('alice.eth');
    await elapseDebounce();
    await settle(r.deferreds[0], okResult('alice.eth', HEX_ALICE));
    expect(h.rhfValue()).toBe(HEX_ALICE);

    // move to a different name: alice's hex must never reappear from any cache
    typeValue('bob.eth');
    await flush();
    expect(h.rhfValue()).toBe(''); // synchronously invalidated (INV-81)

    await elapseDebounce(); // loading for bob.eth
    expect(h.rhfValue()).toBe(''); // alice's hex NOT replayed while bob resolves

    await settle(r.deferreds[1], okResult('bob.eth', HEX_BOB));
    expect(h.rhfValue()).toBe(HEX_BOB);

    // full history: alice's hex never appears after the input moved to bob.eth
    const lastAliceIdx = h.writes.lastIndexOf(HEX_ALICE);
    const bobIdx = h.writes.indexOf(HEX_BOB);
    expect(bobIdx).toBeGreaterThan(lastAliceIdx);
    expect(h.writes.slice(lastAliceIdx + 1)).not.toContain(HEX_ALICE);
  });

  it('out-of-order settle across two dispatches never surfaces the first name’s hex (INV-117 at the field boundary)', async () => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName }, required: true });

    typeValue('alice.eth');
    await elapseDebounce();
    typeValue('bob.eth');
    await elapseDebounce();
    expect(r.calls).toEqual(['alice.eth', 'bob.eth']);

    // settle OUT OF ORDER: bob first, then the stale alice
    await settle(r.deferreds[1], okResult('bob.eth', HEX_BOB));
    expect(h.rhfValue()).toBe(HEX_BOB);

    await settle(r.deferreds[0], okResult('alice.eth', HEX_ALICE));
    expect(h.rhfValue()).toBe(HEX_BOB); // late alice result dropped
    expect(h.writes).not.toContain(HEX_ALICE); // never even transiently
  });
});

describe('INV-84: optional-field resolution-pending guard', () => {
  it('gates an OPTIONAL field while a typed name is pending, opens on resolve, re-opens on clear', async () => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName }, required: false });

    // pending name gates submit even though the field is optional and value is ''
    typeValue('alice.eth');
    await flush();
    expect(h.rhfValue()).toBe('');
    expect(h.rhfIsValid()).toBe(false); // debouncing

    await elapseDebounce();
    expect(h.rhfIsValid()).toBe(false); // loading

    await settle(r.deferreds[0], okResult('alice.eth', HEX_ALICE));
    expect(h.rhfIsValid()).toBe(true); // resolved+matched → valid hex

    // clearing the field returns the optional-empty contract: valid again
    typeValue('');
    await flush();
    expect(h.rhfValue()).toBe('');
    expect(h.rhfIsValid()).toBe(true);
  });

  it('keeps the optional field gated in the error state (no silent empty submit)', async () => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName }, required: false });

    typeValue('alice.eth');
    await elapseDebounce();
    await settle(r.deferreds[0], errResult({ code: 'NAME_NOT_FOUND', name: 'alice.eth' }));

    expect(h.rhfValue()).toBe('');
    expect(h.rhfIsValid()).toBe(false);
  });
});

describe('INV-83: resolution dispatch gate (name-candidate + injected resolveName only)', () => {
  it('issues zero calls for empty, hex, and malformed inputs; exactly one debounced call per typed name', async () => {
    const r = controlledResolver();
    renderAddressField({ resolver: { resolveName: r.resolveName } });

    typeValue(HEX_ALICE); // hex
    await elapseDebounce();
    typeValue('not a name'); // malformed (no dot)
    await elapseDebounce();
    typeValue(''); // empty
    await elapseDebounce();
    expect(r.resolveName).not.toHaveBeenCalled();

    typeValue('alice.eth');
    await elapseDebounce();
    expect(r.calls).toEqual(['alice.eth']);
  });

  it('uses the injected isValidName to classify (a rejected shape never dispatches)', async () => {
    const r = controlledResolver();
    const isValidName = vi.fn((name: string): boolean => name.endsWith('.eth'));
    renderAddressField({ resolver: { resolveName: r.resolveName, isValidName } });

    typeValue('alice.sol'); // name-shaped, but the injected predicate rejects it
    await elapseDebounce();
    expect(r.resolveName).not.toHaveBeenCalled();

    typeValue('alice.eth');
    await elapseDebounce();
    expect(r.calls).toEqual(['alice.eth']);
  });
});

describe('INV-86: resolution state is field-local — no sibling re-render, no per-tick RHF churn', () => {
  it('a full type→debounce→load→resolve cycle re-renders no sibling component', async () => {
    const r = controlledResolver();
    const renders = { count: 0 };

    function Sibling(): React.ReactElement {
      renders.count += 1;
      return <span data-testid="sibling" />;
    }

    function Root(): React.ReactElement {
      const { control } = useForm<{ recipient: string }>({
        defaultValues: { recipient: '' },
        mode: 'onChange',
      });
      return (
        <NameResolverProvider resolveName={r.resolveName}>
          <AddressField<{ recipient: string }>
            id="recipient"
            name="recipient"
            label="Recipient"
            control={control}
            addressing={addressing}
          />
          <Sibling />
        </NameResolverProvider>
      );
    }

    render(<Root />);
    const baseline = renders.count;

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'alice.eth' } }); // debouncing
    await elapseDebounce(); // loading (dispatch)
    await settle(r.deferreds[0], okResult('alice.eth', HEX_ALICE)); // resolved + write

    // every status tick and the terminal write stayed inside the field
    expect(renders.count).toBe(baseline);
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('alice.eth');
  });
});

describe('onResolvedNameChange (approved INV-76 deviation — SF-5 alias channel)', () => {
  it('emits the resolved name only on resolved+match, and undefined again when the user edits', async () => {
    const onResolvedNameChange = vi.fn();
    const r = controlledResolver();
    renderAddressField({ resolver: { resolveName: r.resolveName }, onResolvedNameChange });

    typeValue('alice.eth');
    await elapseDebounce();
    expect(onResolvedNameChange).not.toHaveBeenCalledWith(expect.any(String));

    await settle(r.deferreds[0], okResult('alice.eth', HEX_ALICE));
    expect(onResolvedNameChange).toHaveBeenLastCalledWith('alice.eth');

    typeValue('alice.ethx');
    await flush();
    expect(onResolvedNameChange).toHaveBeenLastCalledWith(undefined);
  });
});
