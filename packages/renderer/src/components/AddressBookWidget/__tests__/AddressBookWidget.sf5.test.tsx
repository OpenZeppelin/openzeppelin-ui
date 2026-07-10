/**
 * @vitest-environment jsdom
 *
 * SF-5 · `AddressBookWidget` — the widget-level composition (INV-97 / INV-98 / INV-108 /
 * INV-113).
 *
 * SF-5 added ONE prop to the widget (`enableNameResolution`) and threads it verbatim to
 * `AddAliasDialog`; rows, search, and storage required zero new code. These tests assert
 * the composition: the prop is threaded, every row renders through the SF-4 display
 * component (name+avatar or hex, but never losing its stored alias), search matches the
 * ENS-derived alias, and the default (flag-off) path mounts with no provider and issues
 * zero add-flow resolution.
 *
 * ONE module-boundary seam is mocked:
 *   • `useResolveAddress` — the ROW reverse-ENS hook inside SF-4's async→sync bridge
 *     (`AddressNameResolutionProvider` feeding the base `AddressDisplay` value seam;
 *     mocked at the boundary — its engine reaches `useWalletState`, whose throw is
 *     SF-4's concern, out of scope here).
 * The ADD flow is NOT hook-mocked: post-refactor it runs through
 * `useRuntimeNameResolver` (imperative `fetchQuery`, no `useResolveName` on the path),
 * and its real-seam end-to-end coverage lives in `AddAliasDialog.sf5.test.tsx`. This
 * suite asserts the widget-level composition only (region present/absent, threading).
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

import {
  useResolveAddress,
  WalletStateContext,
  type UseResolveAddressResult,
  type WalletStateContextValue,
} from '@openzeppelin/ui-react';
import type {
  AddressBookAlias,
  AddressBookWidgetProps,
  EcosystemRuntime,
  NameResolutionCapability,
  NetworkConfig,
  ResolvedName,
} from '@openzeppelin/ui-types';

import { AddressBookWidget } from '../AddressBookWidget';

vi.mock('@openzeppelin/ui-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@openzeppelin/ui-react')>();
  return { ...actual, useResolveAddress: vi.fn() };
});
const mockUseResolveAddress = vi.mocked(useResolveAddress);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const isValidName = (n: string): boolean => n.trim().toLowerCase().endsWith('.eth');

function makeWallet(): WalletStateContextValue {
  const nameResolution: NameResolutionCapability = {
    networkConfig: {} as NetworkConfig,
    dispose: () => undefined,
    isValidName,
  };
  return {
    activeNetworkId: 'eip155:1',
    setActiveNetworkId: () => undefined,
    activeNetworkConfig: { name: 'Ethereum' } as NetworkConfig,
    activeRuntime: { nameResolution } as EcosystemRuntime,
    isRuntimeLoading: false,
    walletFacadeHooks: null,
    reconfigureActiveUiKit: () => undefined,
  };
}

const idleAddr = (): UseResolveAddressResult => ({ status: 'idle' });

/** A forward-verified reverse-ENS arm — the ONLY arm SF-4 surfaces as name+avatar. */
function verifiedArm(name: string, address: string, avatarUrl?: string): UseResolveAddressResult {
  const data: ResolvedName = {
    address: address.toLowerCase(),
    name,
    forwardVerified: true,
    provenance: { label: 'ENS', external: false },
    ...(avatarUrl ? { avatarUrl } : {}),
  };
  return { status: 'resolved', address: address.toLowerCase(), data };
}

function alias(overrides: Partial<AddressBookAlias>): AddressBookAlias {
  return {
    id: overrides.id ?? overrides.address ?? 'id',
    address: overrides.address ?? `0x${'0'.repeat(40)}`,
    alias: overrides.alias ?? 'Alias',
    networkId: overrides.networkId,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
}

function baseProps(aliases: AddressBookAlias[]): AddressBookWidgetProps {
  return {
    aliases,
    isLoading: false,
    onSave: vi.fn().mockResolvedValue('id'),
    onRemove: vi.fn().mockResolvedValue(undefined),
    onClear: vi.fn().mockResolvedValue(undefined),
    onExport: vi.fn().mockResolvedValue(undefined),
    onImport: vi.fn().mockResolvedValue([]),
  };
}

function renderWidget(
  props: AddressBookWidgetProps,
  { withProvider = false }: { withProvider?: boolean } = {}
): void {
  const el = <AddressBookWidget {...props} />;
  render(
    withProvider ? (
      <WalletStateContext.Provider value={makeWallet()}>{el}</WalletStateContext.Provider>
    ) : (
      el
    )
  );
}

const resolutionRegion = (): HTMLElement | null =>
  document.getElementById('new-alias-address-resolution');
const openAddDialog = (): void =>
  fireEvent.click(screen.getByRole('button', { name: /Add Alias/ }));

beforeEach(() => {
  mockUseResolveAddress.mockReturnValue(idleAddr());
});
afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

// ===========================================================================
// INV-98 — the flag is threaded verbatim to the dialog
// ===========================================================================

describe('INV-98: enableNameResolution is additive, default-false, and threaded verbatim', () => {
  it('flag on → the opened dialog uses the ENS-aware field (resolution region present)', () => {
    renderWidget({ ...baseProps([]), enableNameResolution: true }, { withProvider: true });
    openAddDialog();
    expect(resolutionRegion()).not.toBeNull();
  });

  it('flag omitted → the opened dialog uses the legacy field (no resolution region, no provider)', () => {
    renderWidget(baseProps([]));
    openAddDialog();
    expect(resolutionRegion()).toBeNull();
  });
});

// ===========================================================================
// INV-97 — every row renders via the SF-4 display component, gating-independent
// ===========================================================================

describe('INV-97: every alias row renders via the SF-4 component regardless of how it was added', () => {
  const A1 = `0x${'a1'.repeat(20)}`; // ENS-added
  const A2 = `0x${'b2'.repeat(20)}`; // hex with reverse record
  const A3 = `0x${'c3'.repeat(20)}`; // hex without reverse record

  it('name+avatar for verified rows, truncated hex for the no-record row, alias heading always kept', () => {
    mockUseResolveAddress.mockImplementation((address) => {
      if (address === A1) return verifiedArm('alice.eth', A1, 'https://avatars.test/a.png');
      if (address === A2) return verifiedArm('vitalik.eth', A2, 'https://avatars.test/v.png');
      return idleAddr(); // A3 → no reverse record → hex fallback
    });

    renderWidget(
      baseProps([
        alias({ id: '1', address: A1, alias: 'Alice ENS' }),
        alias({ id: '2', address: A2, alias: 'Saved Contact' }),
        alias({ id: '3', address: A3, alias: 'Cold Storage' }),
      ])
    );

    // No row silently loses its stored alias heading.
    expect(screen.getByText('Alice ENS')).toBeTruthy();
    expect(screen.getByText('Saved Contact')).toBeTruthy();
    expect(screen.getByText('Cold Storage')).toBeTruthy();

    // Rows 1 & 2 surface the verified reverse-ENS name; row 3 does not.
    expect(screen.getByText('alice.eth')).toBeTruthy();
    expect(screen.getByText('vitalik.eth')).toBeTruthy();

    // Exactly two avatars — one per verified row; the hex-fallback row has none.
    expect(document.querySelectorAll('img')).toHaveLength(2);
  });
});

// ===========================================================================
// INV-108 — search matches the ENS-derived alias (no new code)
// ===========================================================================

describe('INV-108: search matches an ENS-derived alias stored as the alias string', () => {
  it('a partial and a full ENS-name query both match the row; a miss shows the empty state', () => {
    renderWidget(
      baseProps([
        alias({ id: '1', address: `0x${'a'.repeat(40)}`, alias: 'alice.eth' }),
        alias({ id: '2', address: `0x${'b'.repeat(40)}`, alias: 'Treasury' }),
      ])
    );
    const search = screen.getByPlaceholderText('Search by alias or address…');

    fireEvent.change(search, { target: { value: 'ali' } });
    expect(screen.getByText('alice.eth')).toBeTruthy();
    expect(screen.queryByText('Treasury')).toBeNull();

    fireEvent.change(search, { target: { value: 'alice.eth' } });
    expect(screen.getByText('alice.eth')).toBeTruthy();

    fireEvent.change(search, { target: { value: 'zzz-no-match' } });
    expect(screen.queryByText('alice.eth')).toBeNull();
    expect(screen.getByText(/No aliases match/)).toBeTruthy();
  });
});

// ===========================================================================
// INV-113 — opt-in-false: zero add-flow resolution, no provider needed
// ===========================================================================

describe('INV-113: the default (flag-off) widget mounts with no provider and does no add-flow resolution', () => {
  it('mounts without a WalletStateProvider; the opened dialog carries no resolution surface', () => {
    expect(() =>
      renderWidget(
        baseProps([alias({ id: '1', address: `0x${'a'.repeat(40)}`, alias: 'Treasury' })])
      )
    ).not.toThrow();

    // Opening the dialog on the legacy path mounts the plain base field — no resolver
    // seam is injected, so no announcer region exists and no resolution machinery runs
    // (capability-boundary zero-call proof lives in AddAliasDialog.sf5.test.tsx INV-113).
    openAddDialog();
    expect(resolutionRegion()).toBeNull();
  });
});

// A minimal type-level assertion (compile-time): omitting the prop is a valid props object.
describe('INV-98 (type-level): omitting enableNameResolution satisfies AddressBookWidgetProps', () => {
  it('a props fixture without the flag type-checks', () => {
    const props: AddressBookWidgetProps = baseProps([]);
    // No `enableNameResolution` key — this compiling is the assertion (optional, default-false).
    expect('enableNameResolution' in props).toBe(false);
  });
});
