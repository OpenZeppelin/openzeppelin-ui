/**
 * @vitest-environment jsdom
 *
 * SF-5 · `AddAliasDialog` — the opt-in ENS field swap + dirty-gated alias suggestion
 * (INV-95 / INV-96 / INV-102..107 / INV-112 / INV-113 / INV-114 / INV-115 / INV-116).
 *
 * The dialog composes committed pieces: the render-time swap between the plain base
 * `AddressField` and the runtime-wired `ResolvingAliasAddressField` (base `AddressField`
 * under a `NameResolverProvider` fed by `useRuntimeNameResolver`), and a dialog-local
 * ENS→alias auto-suggestion (`onResolvedNameChange`) that must never clobber a
 * user-typed alias.
 *
 * NOTHING is module-mocked (the fork-era `useResolveName` seam is retired). The suite
 * drives the REAL seam end-to-end: an ambient `WalletStateContext.Provider` carries a
 * `NameResolutionCapability` whose `resolveName` is a per-test lookup-map `vi.fn` —
 * resolution flows through the real `useRuntimeNameResolver` (SF-2's owned resolution
 * QueryClient via `fetchQuery`), the real `NameResolverProvider`, and the real base
 * `AddressField` debounce machine. Two consequences shape the harness:
 *
 *  - Fake timers (`setTimeout`/`clearTimeout` only) drive the field's 300ms name
 *    debounce; `settleResolution()` advances past it and lets the fetch settle.
 *  - The resolution QueryClient is a process-global singleton keyed by
 *    `(namespace, networkId, name)`, so each wallet fixture gets a UNIQUE
 *    `activeNetworkId` — no cache entry can leak between tests.
 *
 * The legacy branch is rendered WITHOUT a provider — that is the whole point of
 * INV-113. INV-115 is realigned to SF-3 Rev-2: a missing `WalletStateProvider`
 * degrades by method-omission to a visible `UNSUPPORTED_NETWORK` gate (never a
 * throw, never a silently-inert field).
 *
 * FORMER KNOWN-DEFECT MARKERS (were `it.fails`, now plain `it` — all three fixed
 * by Dev3 04 Code):
 *  - BUG-1 (INV-102/INV-105, AddAliasDialog): the dirty gate mis-fired — an
 *    address-field keystroke's RHF form-wide dirty recompute retroactively
 *    marked the seeded alias dirty (`shouldDirty:false` skips only the
 *    write-time flag), so the SECOND successive resolution never re-seeded.
 *    Fixed: "user claimed the alias" is now tracked from the alias field's own
 *    user edits (`TextField.onUserEdit`), not the dirtyFields proxy.
 *  - BUG-2 (INV-96 parity, AddAliasDialog): the mount-time `undefined` emission
 *    ran `setValue('alias','',{shouldValidate:true})` against the pristine
 *    alias, surfacing "This field is required" before any user interaction.
 *    Fixed: the emission is a no-op when there is nothing to seed and nothing
 *    to withdraw — the pristine ENS branch mounts as clean as legacy.
 *  - BUG-3 (SF-3 INV-83, useInjectedNameResolution): flipping hex → name flipped
 *    `enabled` true while `debounced` still held the stale hex, dispatching one
 *    spurious `resolveName(<hex>)` call. Fixed in SF-3: dispatch requires
 *    `debounced === normalized`.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

import { WalletStateContext, type WalletStateContextValue } from '@openzeppelin/ui-react';
import type {
  EcosystemRuntime,
  NameResolutionCapability,
  NetworkConfig,
  ResolutionResult,
  ResolvedAddress,
} from '@openzeppelin/ui-types';

import { AddAliasDialog } from '../AddAliasDialog';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ALICE: ResolvedAddress = {
  name: 'alice.eth',
  address: `0x${'a'.repeat(40)}`,
  provenance: { label: 'ENS', external: false },
};
const BOB: ResolvedAddress = {
  name: 'bob.eth',
  address: `0x${'b'.repeat(40)}`,
  provenance: { label: 'ENS', external: false },
};

const addressing = { isValidAddress: (v: string): boolean => /^0x[0-9a-fA-F]{40}$/.test(v) };
const isValidName = (n: string): boolean => n.trim().toLowerCase().endsWith('.eth');

/**
 * Lookup-map forward resolver — the per-test replacement for the retired
 * `useResolveName` mock arms. Names in the map resolve; anything else is a
 * definitive `NAME_NOT_FOUND` (never retried, so no retry timers to drain).
 */
function mapResolver(
  entries: readonly ResolvedAddress[]
): ReturnType<typeof vi.fn> & NonNullable<NameResolutionCapability['resolveName']> {
  const byName = new Map(entries.map((e) => [e.name, e]));
  return vi.fn(async (name: string): Promise<ResolutionResult<ResolvedAddress>> => {
    const hit = byName.get(name);
    return hit ? { ok: true, value: hit } : { ok: false, error: { code: 'NAME_NOT_FOUND', name } };
  });
}

/**
 * Each fixture gets a unique `activeNetworkId`: the resolution QueryClient is a
 * process-global singleton and its cache key includes the network id, so this is
 * what keeps one test's resolved names out of the next test's cache.
 */
let walletSeq = 0;

function makeWallet(
  resolveName?: NameResolutionCapability['resolveName']
): WalletStateContextValue {
  const nameResolution: NameResolutionCapability = {
    networkConfig: {} as NetworkConfig,
    dispose: () => undefined,
    isValidName,
    ...(resolveName ? { resolveName } : {}),
  };
  return {
    activeNetworkId: `eip155:1:sf5-test-${++walletSeq}`,
    setActiveNetworkId: () => undefined,
    activeNetworkConfig: { name: 'Ethereum' } as NetworkConfig,
    activeRuntime: { nameResolution } as EcosystemRuntime,
    isRuntimeLoading: false,
    walletFacadeHooks: null,
    reconfigureActiveUiKit: () => undefined,
  };
}

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

interface RenderOpts {
  enableNameResolution?: boolean;
  withProvider?: boolean;
  resolveName?: NameResolutionCapability['resolveName'];
  networks?: NetworkConfig[];
  onSave?: ReturnType<typeof vi.fn>;
}

function renderDialog({
  enableNameResolution,
  withProvider = !!enableNameResolution,
  resolveName,
  networks,
  onSave = vi.fn().mockResolvedValue('id-1'),
}: RenderOpts = {}): { onSave: ReturnType<typeof vi.fn> } {
  const dialog = (
    <AddAliasDialog
      open
      onOpenChange={vi.fn()}
      onSave={onSave}
      addressing={addressing}
      networks={networks}
      enableNameResolution={enableNameResolution}
    />
  );
  render(
    withProvider ? (
      <WalletStateContext.Provider value={makeWallet(resolveName)}>
        {dialog}
      </WalletStateContext.Provider>
    ) : (
      dialog
    )
  );
  return { onSave };
}

const addressInput = (): HTMLInputElement =>
  document.getElementById('new-alias-address') as HTMLInputElement;
const aliasInput = (): HTMLInputElement =>
  document.getElementById('new-alias-name') as HTMLInputElement;
const resolutionRegion = (): HTMLElement | null =>
  document.getElementById('new-alias-address-resolution');
const addButton = (): HTMLButtonElement =>
  screen.getByRole('button', { name: /^Add/ }) as HTMLButtonElement;

/** Flush microtasks + effects only — no timer advance (legacy-path steps). */
async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}
/**
 * Advance past the field's 300ms name debounce and let the dispatched
 * `fetchQuery` settle (promise jobs are interleaved between timer firings).
 */
async function settleResolution(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(320);
  });
}
async function typeAddress(value: string): Promise<void> {
  fireEvent.change(addressInput(), { target: { value } });
  await flush();
}
async function typeAlias(value: string): Promise<void> {
  fireEvent.change(aliasInput(), { target: { value } });
  await flush();
}

beforeEach(() => {
  // Only the two timer fns the debounce machine uses — Date, microtasks, and
  // rAF stay real (TanStack staleness checks + Radix internals rely on them).
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

// ===========================================================================
// INV-95 / INV-96 — the field swap
// ===========================================================================

describe('INV-95: the address field is chosen by a single static branch on enableNameResolution', () => {
  it('enableNameResolution=true mounts the runtime-wired field (ENS-only resolution region present)', () => {
    renderDialog({ enableNameResolution: true, resolveName: mapResolver([ALICE]) });
    expect(resolutionRegion()).not.toBeNull();
    expect(document.querySelectorAll('#new-alias-address')).toHaveLength(1);
  });

  it('enableNameResolution=false mounts the plain base AddressField (no resolution region)', () => {
    renderDialog({ enableNameResolution: false });
    expect(resolutionRegion()).toBeNull();
    expect(document.querySelectorAll('#new-alias-address')).toHaveLength(1);
  });

  it('enableNameResolution undefined defaults to the plain base AddressField', () => {
    renderDialog({});
    expect(resolutionRegion()).toBeNull();
    expect(document.querySelectorAll('#new-alias-address')).toHaveLength(1);
  });
});

describe('INV-96: the surrounding dialog structure is preserved across the swap', () => {
  it('alias field + Cancel/Add footer are structurally identical in both modes', () => {
    for (const enableNameResolution of [false, true]) {
      const { unmount } = renderDialogRaw(enableNameResolution);
      expect(document.getElementById('new-alias-address')).not.toBeNull();
      expect(document.getElementById('new-alias-name')).not.toBeNull();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
      expect(screen.getByRole('button', { name: /^Add/ })).toBeTruthy();
      unmount();
    }
  });

  it('the optional Network selector is absent with no networks and present when networks exist', () => {
    const { unmount } = renderDialogRaw(true);
    expect(screen.queryByText('Network')).toBeNull();
    unmount();

    renderDialog({
      enableNameResolution: true,
      resolveName: mapResolver([ALICE]),
      networks: NETWORKS,
    });
    expect(screen.getByText('Network')).toBeTruthy();
  });

  // Formerly the BUG-2 known-defect marker (see header) — fixed by Dev3 04.
  it('a pristine ENS-branch dialog shows no premature alias validation error [regression: former BUG-2]', async () => {
    renderDialog({ enableNameResolution: true, resolveName: mapResolver([ALICE]) });
    await flush();
    expect(document.getElementById('new-alias-name-error')).toBeNull();
  });
});

/** Minimal helper that returns an `unmount` handle (renderDialog swallows it). */
function renderDialogRaw(enableNameResolution: boolean): { unmount: () => void } {
  const dialog = (
    <AddAliasDialog
      open
      onOpenChange={vi.fn()}
      onSave={vi.fn().mockResolvedValue('id')}
      addressing={addressing}
      enableNameResolution={enableNameResolution}
    />
  );
  return render(
    enableNameResolution ? (
      <WalletStateContext.Provider value={makeWallet(mapResolver([ALICE]))}>
        {dialog}
      </WalletStateContext.Provider>
    ) : (
      dialog
    )
  );
}

const NETWORKS: NetworkConfig[] = [
  {
    id: 'eip155:1',
    name: 'Ethereum',
    type: 'mainnet',
    ecosystem: 'evm',
  } as NetworkConfig,
];

// ===========================================================================
// INV-102 / INV-103 / INV-104 / INV-105 — dirty-gated alias suggestion
// ===========================================================================

describe('INV-102 / INV-105: auto-suggestion seeds (and keeps updating) the alias while non-dirty', () => {
  it('a resolved name auto-fills the alias while the alias is non-dirty', async () => {
    renderDialog({ enableNameResolution: true, resolveName: mapResolver([ALICE]) });

    await typeAddress('alice.eth');
    await settleResolution();
    expect(aliasInput().value).toBe('alice.eth');
  });

  // Formerly the BUG-1 known-defect marker (see header) — fixed by Dev3 04.
  it('a later resolution keeps updating a still-non-dirty suggestion [regression: former BUG-1]', async () => {
    renderDialog({ enableNameResolution: true, resolveName: mapResolver([ALICE, BOB]) });

    await typeAddress('alice.eth');
    await settleResolution();

    // Without touching the alias, retype a different resolving name — the non-dirty seed
    // (INV-105) means successive resolutions keep updating the suggestion (INV-102).
    await typeAddress('bob.eth');
    await settleResolution();
    expect(resolutionRegion()?.textContent).toContain(BOB.address); // resolution DID land
    expect(aliasInput().value).toBe('bob.eth');
  });
});

describe('INV-103: once the user edits the alias, it is theirs for the rest of the session', () => {
  it('a user-typed alias survives a new resolution AND a clear', async () => {
    renderDialog({ enableNameResolution: true, resolveName: mapResolver([ALICE]) });

    // User claims the alias field first.
    await typeAlias('Mum');
    expect(aliasInput().value).toBe('Mum');

    // A resolving address must NOT overwrite it.
    await typeAddress('alice.eth');
    await settleResolution();
    expect(resolutionRegion()?.textContent).toContain(ALICE.address); // resolution DID land
    expect(aliasInput().value).toBe('Mum');

    // Clearing the address must NOT withdraw it either (INV-103 covers both seed & withdraw).
    await typeAddress('');
    await settleResolution();
    expect(aliasInput().value).toBe('Mum');
  });
});

describe('INV-104: a still-non-dirty suggestion is withdrawn on clear and on error', () => {
  it('withdraws to empty when the address is cleared', async () => {
    renderDialog({ enableNameResolution: true, resolveName: mapResolver([ALICE]) });
    await typeAddress('alice.eth');
    await settleResolution();
    expect(aliasInput().value).toBe('alice.eth');

    await typeAddress('');
    await settleResolution();
    expect(aliasInput().value).toBe('');
  });

  it('withdraws to empty when the name errors', async () => {
    renderDialog({ enableNameResolution: true, resolveName: mapResolver([ALICE]) });
    await typeAddress('alice.eth');
    await settleResolution();
    expect(aliasInput().value).toBe('alice.eth');

    // ghost.eth is not in the map → definitive NAME_NOT_FOUND.
    await typeAddress('ghost.eth');
    await settleResolution();
    expect(resolutionRegion()?.textContent).toContain('No address is registered for this name.');
    expect(aliasInput().value).toBe('');
  });
});

// ===========================================================================
// INV-112 — the dirty ref is current before any resolution callback fires (CQ2 / TQ1)
// ===========================================================================

describe('INV-112: aliasDirtyRef mirrors the dirty flag every render — no stale-closure clobber', () => {
  it('a resolution settling right after a first keystroke preserves the just-typed user alias', async () => {
    renderDialog({ enableNameResolution: true, resolveName: mapResolver([ALICE]) });

    // The name is already in flight when the user's single keystroke lands: the
    // keystroke's render commits (updating the ref) before the resolution
    // settles — so the immediately-following suggestion cannot clobber it.
    await typeAddress('alice.eth');
    await typeAlias('M');
    await settleResolution();

    expect(resolutionRegion()?.textContent).toContain(ALICE.address); // resolution DID land
    expect(aliasInput().value).toBe('M');
  });
});

// ===========================================================================
// INV-106 — submit gating; the name path never submits an unresolved value
// ===========================================================================

describe('INV-106: Add is gated until resolved; the payload carries the resolved hex', () => {
  it('Add stays disabled while the name is still resolving', async () => {
    renderDialog({ enableNameResolution: true, resolveName: mapResolver([ALICE]) });
    await typeAddress('alice.eth');
    // Debounce window not advanced — the machine is still debouncing/loading.
    expect(resolutionRegion()?.textContent).toContain('Resolving…');
    expect(addButton().disabled).toBe(true);
  });

  it('Add enables only after resolved and submits the resolved hex + ENS-derived alias', async () => {
    const { onSave } = renderDialog({
      enableNameResolution: true,
      resolveName: mapResolver([ALICE]),
    });
    await typeAddress('alice.eth');
    await settleResolution();

    expect(addButton().disabled).toBe(false);
    fireEvent.click(addButton());
    await flush();

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({
      address: ALICE.address,
      alias: 'alice.eth',
      networkId: undefined,
    });
  });
});

// ===========================================================================
// INV-107 / INV-113 — the legacy / opt-in-false path (no provider)
// ===========================================================================

describe('INV-107: the legacy manual-alias flow is byte-identical with the flag off (no provider)', () => {
  it('add-by-hex + manual alias submits unchanged, with no resolution surface mounted', async () => {
    const { onSave } = renderDialog({ enableNameResolution: false });

    await typeAddress(`0x${'c'.repeat(40)}`);
    await typeAlias('Cold Wallet');

    expect(addButton().disabled).toBe(false);
    fireEvent.click(addButton());
    await flush();

    expect(onSave).toHaveBeenCalledWith({
      address: `0x${'c'.repeat(40)}`,
      alias: 'Cold Wallet',
      networkId: undefined,
    });
    expect(resolutionRegion()).toBeNull();
  });
});

describe('INV-113: opt-in-false makes zero resolution calls and requires no provider', () => {
  it('mounts with no WalletStateProvider; a typed name is inert text with zero resolution machinery', async () => {
    expect(() => renderDialog({ enableNameResolution: false })).not.toThrow();
    // The legacy field advertises hex only — the resolver-aware placeholder is absent.
    expect(addressInput().placeholder).toBe('0x...');
    // A ".eth" string in the LEGACY field is just text — no announcer, no "Resolving…".
    await typeAddress('alice.eth');
    await settleResolution();
    expect(resolutionRegion()).toBeNull();
    expect(screen.queryByText(/Resolving…/)).toBeNull();
  });

  it('flag on: a hex-only session never touches the capability resolver', async () => {
    const resolveName = mapResolver([ALICE]);
    renderDialog({ enableNameResolution: true, resolveName });

    await typeAddress(`0x${'a'.repeat(40)}`); // hex → classifier gates the machine off
    await settleResolution();
    expect(resolveName).not.toHaveBeenCalled();
  });

  it('flag on: a name-candidate session makes exactly one normalized resolver call', async () => {
    const resolveName = mapResolver([ALICE]);
    renderDialog({ enableNameResolution: true, resolveName });

    await typeAddress('alice.eth');
    await settleResolution();
    expect(resolveName).toHaveBeenCalledTimes(1);
    expect(resolveName).toHaveBeenCalledWith('alice.eth');
  });

  // Formerly the BUG-3 known-defect marker (see header) — fixed by SF-3's Code
  // stage (dispatch gated on `debounced === normalized`).
  it('flag on: replacing a typed hex with a name makes no extra adapter call [regression: former BUG-3]', async () => {
    const resolveName = mapResolver([ALICE]);
    renderDialog({ enableNameResolution: true, resolveName });

    await typeAddress(`0x${'a'.repeat(40)}`);
    await settleResolution();
    await typeAddress('alice.eth');
    await settleResolution();

    expect(resolveName).toHaveBeenCalledTimes(1);
    expect(resolveName).toHaveBeenCalledWith('alice.eth');
  });
});

// ===========================================================================
// INV-115 (realigned, SF-3 Rev-2) — no provider degrades loudly-in-UI, never silently inert
// ===========================================================================

describe('INV-115: flag on without a WalletStateProvider degrades to a visible UNSUPPORTED_NETWORK gate', () => {
  it('renders without throwing; a typed name surfaces the unsupported message and Add stays gated', async () => {
    // SF-3 Rev-2 superseded the fork-era "throws" contract: useRuntimeNameResolver
    // degrades by METHOD OMISSION (empty resolver), so the field surfaces
    // UNSUPPORTED_NETWORK. The preserved property is "no silently-inert ENS field".
    expect(() => renderDialog({ enableNameResolution: true, withProvider: false })).not.toThrow();

    await typeAddress('alice.eth');
    expect(resolutionRegion()?.textContent).toContain(
      'Name resolution is not supported on this network.'
    );
    expect(addButton().disabled).toBe(true); // the name is never silently accepted
  });
});

// ===========================================================================
// INV-114 — resolution failure surfaces through SF-3 only
// ===========================================================================

describe('INV-114: an errored resolution gates submit via SF-3 with no new dialog error UI', () => {
  it('surfaces the field-level message, keeps Add disabled, adds no dialog-level error', async () => {
    renderDialog({ enableNameResolution: true, resolveName: mapResolver([]) });
    await typeAddress('alice.eth');
    await settleResolution();

    // SF-3's own announcer carries the message; the dialog adds nothing — the
    // resolution error appears EXACTLY once, inside the field's announcer.
    // (The alias field's own `required` validation error is standard field
    // validation, not resolution UI — its premature mount-time display is
    // tracked separately as BUG-2.)
    const message = screen.getAllByText('No address is registered for this name.');
    expect(message).toHaveLength(1);
    expect(resolutionRegion()?.contains(message[0])).toBe(true);
    expect(addButton().disabled).toBe(true);
  });
});

// ===========================================================================
// INV-116 — the programmatic alias seed never steals focus / adds no new live region
// ===========================================================================

describe('INV-116: the alias seed writes a value only — no focus steal, no new live region', () => {
  it('focus stays on the address input while the alias updates underneath', async () => {
    renderDialog({ enableNameResolution: true, resolveName: mapResolver([ALICE]) });
    const el = addressInput();
    el.focus();
    expect(document.activeElement).toBe(el);

    await typeAddress('alice.eth');
    await settleResolution();

    expect(aliasInput().value).toBe('alice.eth');
    expect(document.activeElement).toBe(el);
  });

  it('introduces exactly one aria-live region (SF-3 resolution announcer) — none added by the dialog', () => {
    renderDialog({ enableNameResolution: true, resolveName: mapResolver([ALICE]) });
    // The ONLY live region in the dialog is SF-3's resolution announcer; SF-5 adds none.
    const liveRegions = document.querySelectorAll('[aria-live]');
    expect(liveRegions).toHaveLength(1);
    expect((liveRegions[0] as HTMLElement).id).toBe('new-alias-address-resolution');
  });
});
