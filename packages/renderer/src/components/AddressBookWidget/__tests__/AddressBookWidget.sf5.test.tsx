/**
 * @vitest-environment jsdom
 *
 * SF-5 · `AddressBookWidget` — the widget-level composition (INV-97 / INV-98 / INV-108 /
 * INV-113).
 *
 * SF-5 added ONE prop to the widget (`enableNameResolution`) and threads it to both
 * `AddAliasDialog` and every `AliasRow`. These tests assert the composition: the prop
 * is threaded, flag-on rows render through the SF-4 reverse-ENS bridge (name+avatar or
 * hex, never losing the stored alias), search matches the ENS-derived alias, and the
 * default (flag-off) path mounts with no provider and issues zero reverse resolution.
 *
 * NOTHING is module-mocked for the reverse path (the former `useResolveAddress` mock
 * masked a wallet-less throw). Flag-on row assertions drive a REAL
 * `WalletStateContext.Provider` whose capability `resolveAddress` is a per-test
 * lookup-map `vi.fn`. Flag-off and wallet-less flag-on paths intentionally mount
 * WITHOUT a provider — that is the point of INV-113 / B1.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

import * as uiReact from '@openzeppelin/ui-react';
import { WalletStateContext, type WalletStateContextValue } from '@openzeppelin/ui-react';
import type {
  AddressBookAlias,
  AddressBookWidgetProps,
  EcosystemRuntime,
  NameResolutionCapability,
  NetworkConfig,
  ResolutionResult,
  ResolvedName,
} from '@openzeppelin/ui-types';

import { AddressBookWidget } from '../AddressBookWidget';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const isValidName = (n: string): boolean => n.trim().toLowerCase().endsWith('.eth');

let networkSeq = 0;

function makeWallet(
  resolveAddress?: NameResolutionCapability['resolveAddress'],
  activeNetworkId?: string
): WalletStateContextValue {
  const nameResolution: NameResolutionCapability = {
    networkConfig: {} as NetworkConfig,
    dispose: () => undefined,
    isValidName,
    ...(resolveAddress ? { resolveAddress } : {}),
  };
  return {
    // Unique network id per fixture — resolution QueryClient is a process-global
    // singleton keyed by (namespace, networkId, address).
    activeNetworkId: activeNetworkId ?? `eip155:1:abw-sf5-${++networkSeq}`,
    setActiveNetworkId: () => undefined,
    activeNetworkConfig: { name: 'Ethereum' } as NetworkConfig,
    activeRuntime: { nameResolution } as EcosystemRuntime,
    isRuntimeLoading: false,
    walletFacadeHooks: null,
    reconfigureActiveUiKit: () => undefined,
  };
}

/** Lookup-map reverse resolver — addresses in the map resolve; others → NOT_FOUND. */
function mapReverseResolver(
  entries: readonly ResolvedName[]
): ReturnType<typeof vi.fn> & NonNullable<NameResolutionCapability['resolveAddress']> {
  const byAddr = new Map(entries.map((e) => [e.address.toLowerCase(), e]));
  return vi.fn(async (address: string): Promise<ResolutionResult<ResolvedName>> => {
    const hit = byAddr.get(address.toLowerCase());
    return hit
      ? { ok: true, value: hit }
      : { ok: false, error: { code: 'ADDRESS_NOT_FOUND', address } };
  });
}

function verifiedRecord(name: string, address: string, avatarUrl?: string): ResolvedName {
  return {
    address: address.toLowerCase(),
    name,
    forwardVerified: true,
    provenance: { label: 'ENS', external: false },
    ...(avatarUrl ? { avatarUrl } : {}),
  };
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
  {
    wallet,
  }: {
    wallet?: WalletStateContextValue;
  } = {}
): void {
  const el = <AddressBookWidget {...props} />;
  render(
    wallet ? <WalletStateContext.Provider value={wallet}>{el}</WalletStateContext.Provider> : el
  );
}

const resolutionRegion = (): HTMLElement | null =>
  document.getElementById('new-alias-address-resolution');
const openAddDialog = (): void =>
  fireEvent.click(screen.getByRole('button', { name: /Add Alias/ }));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

async function settleReverse(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  for (let i = 0; i < 3; i += 1) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
  }
}

// ===========================================================================
// INV-98 — the flag is threaded verbatim to the dialog
// ===========================================================================

describe('INV-98: enableNameResolution is additive, default-false, and threaded verbatim', () => {
  it('flag on → the opened dialog uses the ENS-aware field (resolution region present)', () => {
    renderWidget({ ...baseProps([]), enableNameResolution: true }, { wallet: makeWallet() });
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
// INV-97 — every row renders via the SF-4 display component when flag is on
// ===========================================================================

describe('INV-97: every alias row renders via the SF-4 component when enableNameResolution is on', () => {
  const A1 = `0x${'a1'.repeat(20)}`; // ENS-added
  const A2 = `0x${'b2'.repeat(20)}`; // hex with reverse record
  const A3 = `0x${'c3'.repeat(20)}`; // hex without reverse record
  const NETWORK = 'eip155:1';

  it('name+avatar for verified rows, truncated hex for the no-record row, alias heading always kept', async () => {
    const resolveAddress = mapReverseResolver([
      verifiedRecord('alice.eth', A1, 'https://avatars.test/a.png'),
      verifiedRecord('vitalik.eth', A2, 'https://avatars.test/v.png'),
    ]);

    renderWidget(
      {
        ...baseProps([
          alias({ id: '1', address: A1, alias: 'Alice ENS', networkId: NETWORK }),
          alias({ id: '2', address: A2, alias: 'Saved Contact', networkId: NETWORK }),
          alias({ id: '3', address: A3, alias: 'Cold Storage', networkId: NETWORK }),
        ]),
        enableNameResolution: true,
      },
      { wallet: makeWallet(resolveAddress, NETWORK) }
    );

    await settleReverse();

    // No row silently loses its stored alias heading.
    expect(screen.getByText('Alice ENS')).toBeTruthy();
    expect(screen.getByText('Saved Contact')).toBeTruthy();
    expect(screen.getByText('Cold Storage')).toBeTruthy();

    // Rows 1 & 2 surface the verified reverse-ENS name; row 3 does not.
    expect(screen.getByText('alice.eth')).toBeTruthy();
    expect(screen.getByText('vitalik.eth')).toBeTruthy();

    // Exactly two avatars — one per verified row; the hex-fallback row has none.
    expect(document.querySelectorAll('img')).toHaveLength(2);
    expect(resolveAddress).toHaveBeenCalled();
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
// INV-113 / B1 — flag-off: zero reverse resolution, no provider needed
// ===========================================================================

describe('INV-113 / B1: flag-off widget mounts wallet-less with aliases and issues no reverse resolution', () => {
  it('wallet-less + ≥1 saved alias + flag OFF renders without crashing and never calls useResolveAddress', () => {
    const spy = vi.spyOn(uiReact, 'useResolveAddress');

    expect(() =>
      renderWidget(
        baseProps([alias({ id: '1', address: `0x${'a'.repeat(40)}`, alias: 'Treasury' })])
      )
    ).not.toThrow();

    expect(screen.getByText('Treasury')).toBeTruthy();
    expect(spy).not.toHaveBeenCalled();

    // Opening the dialog on the legacy path mounts the plain base field — no resolver
    // seam is injected, so no announcer region exists.
    openAddDialog();
    expect(resolutionRegion()).toBeNull();
  });

  it('flag ON but no WalletStateProvider degrades gracefully (no throw)', () => {
    expect(() =>
      renderWidget({
        ...baseProps([
          alias({
            id: '1',
            address: `0x${'a'.repeat(40)}`,
            alias: 'Treasury',
            networkId: 'eip155:1',
          }),
        ]),
        enableNameResolution: true,
      })
    ).not.toThrow();

    expect(screen.getByText('Treasury')).toBeTruthy();
    // No verified reverse name — soft-degrade leaves hex / alias only.
    expect(screen.queryByText(/\.eth$/)).toBeNull();
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
