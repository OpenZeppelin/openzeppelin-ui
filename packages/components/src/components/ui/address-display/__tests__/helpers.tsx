/**
 * Shared fixtures and helpers for the SF-4 AddressDisplay ENS test suite
 * (artifacts/001-ens-uikit-support/sf-4-address-display/05-tests.md).
 *
 * The suite tests the in-place enhancement of the base `AddressDisplay`
 * fed by the synchronous value seam (`resolvedName` prop ?? `AddressNameContext`).
 * Everything rendered here is REAL — no module mocks: the seam is driven by
 * constructing `ResolvedName` values and passing them through the prop or a
 * real `AddressNameProvider` (INV-121: the component needs no runtime,
 * wallet, or query provider to render).
 */
import { render } from '@testing-library/react';
import { vi } from 'vitest';

import type { ResolvedName } from '@openzeppelin/ui-types';

import { AddressDisplay, type AddressDisplayProps } from '../address-display';

/**
 * EIP-55 checksummed (mixed-case) address — the caller's original prop.
 * Its truncated form (`0xd8dA...6045`) is case-distinguishable from the
 * lowercased echo's (`0xd8da...6045`), making INV-53 assertable on the
 * truncated render.
 */
export const CHECKSUM_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

/** Lowercased reverse-echo form of {@link CHECKSUM_ADDRESS} (SF-2 INV-26). */
export const LOWERCASE_ECHO = CHECKSUM_ADDRESS.toLowerCase();

/** Truncated render of the original checksummed address (startChars=6, endChars=4). */
export const TRUNCATED_CHECKSUM = '0xd8dA...6045';

/** A second, unrelated address for multi-row / reset scenarios. */
export const OTHER_ADDRESS = `0x${'b'.repeat(40)}`;

/**
 * Build a forward-verified `ResolvedName` record for {@link CHECKSUM_ADDRESS}.
 * The `address` field is deliberately the LOWERCASED echo — INV-53 pins that
 * the component never reads it for display/copy/tooltip.
 *
 * @param overrides - Field overrides merged over the verified defaults
 * @returns A `forwardVerified: true` record
 */
export function verifiedRecord(overrides: Partial<ResolvedName> = {}): ResolvedName {
  return {
    address: LOWERCASE_ECHO,
    name: 'alice.eth',
    forwardVerified: true,
    avatarUrl: 'https://avatars.test/alice.png',
    provenance: { label: 'ENS', external: false },
    ...overrides,
  };
}

/**
 * Build a forward-MISMATCHED record (the reverse record exists but forward
 * resolution does not point back — the impersonation attack INV-52 suppresses).
 *
 * @param overrides - Field overrides merged over the mismatch defaults
 * @returns A `forwardVerified: false` record
 */
export function mismatchRecord(overrides: Partial<ResolvedName> = {}): ResolvedName {
  return {
    address: LOWERCASE_ECHO,
    name: 'attacker.eth',
    forwardVerified: false,
    avatarUrl: 'https://avatars.test/attacker.png',
    provenance: { label: 'ENS', external: true },
    ...overrides,
  };
}

/**
 * Render a plain `AddressDisplay` (no `resolvedName`, no provider) and return
 * its container innerHTML — the byte-identity baseline for INV-51/54.
 *
 * @param props - Props applied to the baseline render (address defaults to {@link CHECKSUM_ADDRESS})
 * @returns The baseline container innerHTML
 */
export function plainHTML(props: Partial<AddressDisplayProps> = {}): string {
  const { container } = render(<AddressDisplay address={CHECKSUM_ADDRESS} {...props} />);
  return container.innerHTML;
}

/**
 * Install a `navigator.clipboard.writeText` spy (jsdom ships none).
 *
 * @returns The spy — assert on its call arguments
 */
export function stubClipboard(): ReturnType<typeof vi.fn> {
  const writeText = vi.fn();
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  });
  return writeText;
}
