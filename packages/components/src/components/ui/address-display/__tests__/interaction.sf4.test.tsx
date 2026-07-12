/**
 * @vitest-environment jsdom
 *
 * SF-4 · Interaction & Transition (Category 3) — INV-60, INV-61.
 * artifacts/001-ens-uikit-support/sf-4-address-display/03-invariants.md (Rev 2)
 *
 * The component's "transitions" are the injected value changing across
 * renders: stable hook order under precedence flips, and progressive
 * enhancement (hex first commit → name+avatar swap-in, no skeleton).
 */
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AddressDisplay } from '../address-display';
import { AddressNameProvider } from '../address-name-context';
import { CHECKSUM_ADDRESS, plainHTML, TRUNCATED_CHECKSUM, verifiedRecord } from './helpers';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('INV-60: single synchronous record read; unconditional context reads (stable hook order)', () => {
  it('survives precedence flips and provider mount/unmount across rerenders with no hook-order violation', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Start: explicit label, no provider.
    const { rerender, container } = render(
      <AddressDisplay address={CHECKSUM_ADDRESS} label="Treasury" />
    );
    expect(container.textContent).toContain('Treasury');

    // Flip 1: label removed, provider mounted → verified name takes over.
    rerender(
      <AddressNameProvider resolveAddressName={() => verifiedRecord()}>
        <AddressDisplay address={CHECKSUM_ADDRESS} />
      </AddressNameProvider>
    );
    expect(container.textContent).toContain('alice.eth');

    // Flip 2: provider unmounted again → back to hex.
    rerender(<AddressDisplay address={CHECKSUM_ADDRESS} />);
    expect(container.textContent).toContain(TRUNCATED_CHECKSUM);

    // Flip 3: resolvedName prop appears → name again.
    rerender(<AddressDisplay address={CHECKSUM_ADDRESS} resolvedName={verifiedRecord()} />);
    expect(container.textContent).toContain('alice.eth');

    const hookViolations = consoleError.mock.calls.filter((args) =>
      args.some((a) => typeof a === 'string' && /hook|Rendered (fewer|more)/i.test(a))
    );
    expect(hookViolations).toEqual([]);
  });
});

describe('INV-61: progressive enhancement — hex on first commit; name+avatar swap in only when the value verifies', () => {
  it('first commit with an undefined record IS the plain hex render (never worse than plain AddressDisplay)', () => {
    const baseline = plainHTML({ showCopyButton: true });
    const { container, rerender } = render(
      <AddressDisplay address={CHECKSUM_ADDRESS} showCopyButton resolvedName={undefined} />
    );
    // The very first committed frame: correct hex, copyable, no skeleton.
    expect(container.innerHTML).toBe(baseline);
    expect(container.textContent).toContain(TRUNCATED_CHECKSUM);

    // The upstream layer feeds a verified record → single-commit swap to name+avatar.
    rerender(
      <AddressDisplay address={CHECKSUM_ADDRESS} showCopyButton resolvedName={verifiedRecord()} />
    );
    expect(container.textContent).toContain('alice.eth');
    expect(container.querySelector('img')).not.toBeNull();
    // The original hex stays available in the labeled branch (INV-68).
    expect(container.textContent).toContain(TRUNCATED_CHECKSUM);
  });

  it('context channel: undefined → verified record across provider re-renders swaps hex → name+avatar', () => {
    const store = new Map<string, ReturnType<typeof verifiedRecord>>();
    const resolveAddressName = (address: string): ReturnType<typeof verifiedRecord> | undefined =>
      store.get(address);

    const { container, rerender } = render(
      <AddressNameProvider resolveAddressName={resolveAddressName}>
        <AddressDisplay address={CHECKSUM_ADDRESS} />
      </AddressNameProvider>
    );
    expect(container.textContent).toContain(TRUNCATED_CHECKSUM);
    expect(container.querySelector('img')).toBeNull();

    // The react layer's cache warms; a NEW resolver identity re-renders the subtree.
    store.set(CHECKSUM_ADDRESS, verifiedRecord());
    rerender(
      <AddressNameProvider resolveAddressName={(address) => store.get(address)}>
        <AddressDisplay address={CHECKSUM_ADDRESS} />
      </AddressNameProvider>
    );
    expect(container.textContent).toContain('alice.eth');
    expect(container.querySelector('img')).not.toBeNull();
  });

  it('a withdrawn record degrades back to hex — the render is value-driven, holding no stale copy', () => {
    const { container, rerender } = render(
      <AddressDisplay address={CHECKSUM_ADDRESS} resolvedName={verifiedRecord()} />
    );
    expect(container.textContent).toContain('alice.eth');

    rerender(<AddressDisplay address={CHECKSUM_ADDRESS} resolvedName={undefined} />);
    expect(container.textContent).not.toContain('alice.eth');
    expect(container.textContent).toContain(TRUNCATED_CHECKSUM);
  });
});
