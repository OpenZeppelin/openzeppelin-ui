/**
 * Shared test harness for the SF-2 name-resolution hooks.
 *
 * Provides: a fully-typed mock `NameResolutionCapability` factory (no casts on
 * the capability itself — only the SF-1 `{} as NetworkConfig` stub precedent),
 * full `WalletStateContextValue` builders for the runtime-present / no-runtime /
 * runtime-loading cases, a `renderHook`/`render` wrapper that mounts a REAL
 * `WalletStateContext.Provider` plus a FRESH isolated `QueryClient` per test
 * (so the process-global singleton — INV-48 — is never touched except by its
 * own dedicated test), and a fake-timer `tick` helper that advances timers AND
 * flushes the react-query fetch microtasks in a single `act`.
 *
 * Suites must NOT stub `useWalletState` — the engine soft-reads context directly.
 */
import { type QueryClient } from '@tanstack/react-query';
import { act } from '@testing-library/react';
import { vi } from 'vitest';
import { useState, type ReactNode } from 'react';

import type {
  EcosystemRuntime,
  NameResolutionCapability,
  NetworkConfig,
  ResolutionResult,
  ResolvedAddress,
  ResolvedName,
} from '@openzeppelin/ui-types';

import { WalletStateContext, type WalletStateContextValue } from '../../WalletStateContext';
import { NameResolutionProvider } from '../NameResolutionProvider';
import { createResolutionQueryClient, type ResolutionConfig } from '../resolutionConfig';

/** SF-1 precedent: a network-config stub the capability contract requires but no test reads. */
const networkConfig = {} as NetworkConfig;

/** A resolved forward record with a known, distinctive provenance for passthrough assertions (INV-25). */
export const ALICE: ResolvedAddress = {
  name: 'alice.eth',
  address: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAaaaa',
  provenance: { label: 'ENS', external: false },
};

export const BOB: ResolvedAddress = {
  name: 'bob.eth',
  address: '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBbbbb',
  provenance: { label: 'ENS', external: false },
};

/** A resolved reverse record with `forwardVerified: false` — the field INV-25 must not strip. */
export const REVERSE_UNVERIFIED: ResolvedName = {
  address: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAaaaa',
  name: 'alice.eth',
  forwardVerified: false,
  provenance: { label: 'ENS via external gateway', external: true },
};

export interface CapabilityStub {
  /** Defaults to a `.eth`-suffix check so a bare label / partial fails the forward gate (INV-32). */
  readonly isValidName?: (name: string) => boolean;
  readonly resolveName?: (name: string) => Promise<ResolutionResult<ResolvedAddress>>;
  readonly resolveAddress?: (address: string) => Promise<ResolutionResult<ResolvedName>>;
}

/**
 * Build a typed {@link NameResolutionCapability}. Directional methods are only
 * attached when supplied, so "method absent" (INV-45) is modeled by omission —
 * never by casting a method to `undefined`.
 */
export function makeCapability(stub: CapabilityStub = {}): NameResolutionCapability {
  return {
    networkConfig,
    dispose: () => undefined,
    isValidName: stub.isValidName ?? ((name: string) => name.endsWith('.eth')),
    ...(stub.resolveName ? { resolveName: stub.resolveName } : {}),
    ...(stub.resolveAddress ? { resolveAddress: stub.resolveAddress } : {}),
  };
}

/** Runtime present, exposing `capability`, on `activeNetworkId` (default a mainnet-like id). */
export function walletWithCapability(
  capability: NameResolutionCapability,
  opts: { activeNetworkId?: string | null; isRuntimeLoading?: boolean } = {}
): WalletStateContextValue {
  return {
    activeNetworkId: opts.activeNetworkId ?? 'eip155:1',
    setActiveNetworkId: () => undefined,
    activeNetworkConfig: { name: 'Ethereum' } as NetworkConfig,
    activeRuntime: { nameResolution: capability } as EcosystemRuntime,
    isRuntimeLoading: opts.isRuntimeLoading ?? false,
    walletFacadeHooks: null,
    reconfigureActiveUiKit: () => undefined,
  };
}

/** No active runtime (settled or still loading). */
export function walletNoRuntime(
  opts: { activeNetworkId?: string | null; isRuntimeLoading?: boolean } = {}
): WalletStateContextValue {
  return {
    activeNetworkId: opts.activeNetworkId ?? null,
    setActiveNetworkId: () => undefined,
    activeNetworkConfig: null,
    activeRuntime: null,
    isRuntimeLoading: opts.isRuntimeLoading ?? false,
    walletFacadeHooks: null,
    reconfigureActiveUiKit: () => undefined,
  };
}

/**
 * A `renderHook`/`render` wrapper that mounts a real {@link NameResolutionProvider}
 * over a FRESH isolated client (the resolution defaults — no ambient refetch —
 * are applied), so no test leaks cache into another and the global singleton is
 * left untouched. Does NOT mount wallet state — prefer {@link makeWalletWrapper}
 * for hook suites that exercise the engine.
 */
export function makeWrapper(
  opts: { client?: QueryClient; config?: Partial<ResolutionConfig> } = {}
): {
  client: QueryClient;
  Wrapper: (props: { children: ReactNode }) => ReactNode;
} {
  const client = opts.client ?? createResolutionQueryClient();
  function Wrapper({ children }: { children: ReactNode }): ReactNode {
    return (
      <NameResolutionProvider queryClient={client} config={opts.config}>
        {children}
      </NameResolutionProvider>
    );
  }
  return { client, Wrapper };
}

/**
 * Mount a real {@link WalletStateContext.Provider} plus an isolated
 * {@link NameResolutionProvider}. `setWallet` swaps the ambient wallet value
 * (for INV-40 / INV-46 mid-test transitions) and forces a re-render.
 */
export function makeWalletWrapper(
  initialWallet: WalletStateContextValue,
  opts: { client?: QueryClient; config?: Partial<ResolutionConfig> } = {}
): {
  client: QueryClient;
  Wrapper: (props: { children: ReactNode }) => ReactNode;
  setWallet: (next: WalletStateContextValue) => void;
} {
  const client = opts.client ?? createResolutionQueryClient();
  const walletRef = { current: initialWallet };
  let bump: (() => void) | undefined;

  function Wrapper({ children }: { children: ReactNode }): ReactNode {
    const [, setTick] = useState(0);
    bump = (): void => {
      setTick((n) => n + 1);
    };
    return (
      <WalletStateContext.Provider value={walletRef.current}>
        <NameResolutionProvider queryClient={client} config={opts.config}>
          {children}
        </NameResolutionProvider>
      </WalletStateContext.Provider>
    );
  }

  function setWallet(next: WalletStateContextValue): void {
    walletRef.current = next;
    act(() => {
      bump?.();
    });
  }

  return { client, Wrapper, setWallet };
}

/**
 * Wallet context only — for INV-48 zero-wiring suites that must NOT mount a
 * `NameResolutionProvider` / ambient QueryClientProvider.
 */
export function makeWalletOnlyWrapper(wallet: WalletStateContextValue): {
  Wrapper: (props: { children: ReactNode }) => ReactNode;
} {
  function Wrapper({ children }: { children: ReactNode }): ReactNode {
    return <WalletStateContext.Provider value={wallet}>{children}</WalletStateContext.Provider>;
  }
  return { Wrapper };
}

/**
 * Advance fake timers by `ms` AND settle the resulting async chain, all inside
 * `act` — the deterministic replacement for `waitFor` under fake timers.
 *
 * A debounce timer firing sets state → re-render → enables the query → schedules
 * the fetch microtask → resolves → commits. A single `advanceTimersByTimeAsync`
 * fires the timer but may not flush that whole follow-up chain, so we run a few
 * extra zero-delay settle rounds. Zero-delay advances never fire react-query's
 * retry backoff (≥1000ms), so retry-count tests stay precise.
 */
export async function tick(ms = 0): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
  for (let i = 0; i < 3; i += 1) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
  }
}
