/**
 * Shared harness for the SF-3 enhanced-base `AddressField` ENS suites.
 *
 * Mounts the REAL base field on REAL react-hook-form state (no RHF mocking):
 * the SC-004 spine is observed exactly where the invariants pin it — the RHF
 * field value (`useWatch` probe) and `formState.isValid`. The only injected
 * seam is the `NameResolver` context (a mock `resolveName` backed by
 * manually-settled deferreds), mirroring how the renderer wires the runtime.
 */
/* eslint-disable react-refresh/only-export-components -- test-only harness; Fast Refresh does not apply */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import React from 'react';
import { useForm, useFormState, useWatch, type Control } from 'react-hook-form';

import type {
  AddressingCapability,
  NameResolutionError,
  ResolutionResult,
  ResolvedAddress,
} from '@openzeppelin/ui-types';

import { AddressField } from '../../AddressField';
import type { NameResolverContextValue } from '../context';
import { NameResolverProvider } from '../name-resolver-context';

/** Two distinct, well-formed 40-hex-digit addresses for race assertions. */
export const HEX_ALICE = `0x${'a1'.repeat(20)}`;
export const HEX_BOB = `0x${'b2'.repeat(20)}`;

/** Chain-neutral addressing stub — the same shape every dynamic form passes. */
export const addressing: AddressingCapability = {
  isValidAddress: (address: string): boolean => /^0x[0-9a-fA-F]{40}$/.test(address),
};

/** Build an `ok` forward-resolution result (INV-71 provenance defaults inline). */
export function okResult(
  name: string,
  address: string,
  provenance?: Partial<ResolvedAddress['provenance']>
): ResolutionResult<ResolvedAddress> {
  return {
    ok: true,
    value: { name, address, provenance: { label: 'ENS', external: false, ...provenance } },
  };
}

/** Build an `error` forward-resolution result from a typed error. */
export function errResult(error: NameResolutionError): ResolutionResult<ResolvedAddress> {
  return { ok: false, error };
}

/** A manually-settled promise, so each async status arm is driven deterministically. */
export interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (cause: unknown) => void;
}

/** Create a {@link Deferred} whose settlement the test controls explicitly. */
export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/**
 * A spy `resolveName` whose every dispatch returns its own deferred, exposed in
 * call order — races are then settled explicitly and out of order by the test.
 */
export interface ControlledResolver {
  readonly resolveName: (name: string) => Promise<ResolutionResult<ResolvedAddress>>;
  readonly calls: string[];
  readonly deferreds: Deferred<ResolutionResult<ResolvedAddress>>[];
}

/** Create a {@link ControlledResolver} (per-call deferreds, recorded in call order). */
export function controlledResolver(): ControlledResolver {
  const calls: string[] = [];
  const deferreds: Deferred<ResolutionResult<ResolvedAddress>>[] = [];
  const resolveName = vi.fn((name: string): Promise<ResolutionResult<ResolvedAddress>> => {
    calls.push(name);
    const d = deferred<ResolutionResult<ResolvedAddress>>();
    deferreds.push(d);
    return d.promise;
  });
  return { resolveName, calls, deferreds };
}

interface FormShape {
  recipient: string;
}

function Probe({
  control,
  writes,
}: {
  control: Control<FormShape>;
  writes: string[];
}): React.ReactElement {
  const value = (useWatch({ control, name: 'recipient' }) as string | undefined) ?? '';
  const { isValid } = useFormState({ control });
  if (writes[writes.length - 1] !== value) {
    writes.push(value);
  }
  return (
    <>
      <span data-testid="rhf-value">{value}</span>
      <span data-testid="rhf-valid">{String(isValid)}</span>
    </>
  );
}

export interface HarnessOptions {
  /** `undefined` → NO provider mounted (the INV-82 resolver-null branch). */
  readonly resolver?: NameResolverContextValue;
  readonly required?: boolean;
  readonly helperText?: string;
  readonly onResolvedNameChange?: (name: string | undefined) => void;
}

export interface Harness {
  readonly writes: string[];
  readonly input: () => HTMLInputElement;
  readonly rhfValue: () => string;
  readonly rhfIsValid: () => boolean;
  readonly region: () => HTMLElement | null;
  readonly unmount: () => void;
}

/**
 * Mount `AddressField` (id="recipient") on a real `useForm` (`mode: 'onChange'`)
 * with the RHF probe, optionally under a `NameResolverProvider`.
 */
export function renderAddressField(opts: HarnessOptions = {}): Harness {
  const writes: string[] = [];

  function Root(): React.ReactElement {
    const { control } = useForm<FormShape>({
      defaultValues: { recipient: '' },
      mode: 'onChange',
    });
    const tree = (
      <>
        <AddressField<FormShape>
          id="recipient"
          name="recipient"
          label="Recipient"
          control={control}
          addressing={addressing}
          validation={opts.required ? { required: true } : undefined}
          helperText={opts.helperText}
          onResolvedNameChange={opts.onResolvedNameChange}
        />
        <Probe control={control} writes={writes} />
      </>
    );
    return opts.resolver ? (
      <NameResolverProvider {...opts.resolver}>{tree}</NameResolverProvider>
    ) : (
      tree
    );
  }

  const { unmount } = render(<Root />);
  return {
    writes,
    input: () => screen.getByRole('textbox') as HTMLInputElement,
    rhfValue: () => screen.getByTestId('rhf-value').textContent ?? '',
    rhfIsValid: () => screen.getByTestId('rhf-valid').textContent === 'true',
    region: () => document.getElementById('recipient-resolution'),
    unmount,
  };
}

/** Fire a single change event with the full new value (one debounce cycle). */
export function typeValue(value: string): HTMLInputElement {
  const input = screen.getByRole('textbox') as HTMLInputElement;
  fireEvent.change(input, { target: { value } });
  return input;
}

/** Advance fake timers past the 300 ms name-resolution debounce, inside act. */
export async function elapseDebounce(ms = 300): Promise<void> {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

/** Flush pending microtasks (promise settlements, RHF async validation). */
export async function flush(): Promise<void> {
  await act(async () => {});
}

/** Settle a deferred inside act so React state updates are applied. */
export async function settle(
  d: Deferred<ResolutionResult<ResolvedAddress>>,
  result: ResolutionResult<ResolvedAddress>
): Promise<void> {
  await act(async () => {
    d.resolve(result);
  });
}
