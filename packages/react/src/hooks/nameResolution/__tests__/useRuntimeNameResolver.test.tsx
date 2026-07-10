/**
 * @vitest-environment jsdom
 *
 * SF-3 · `useRuntimeNameResolver` — the react-layer wiring that projects the
 * active runtime's `NameResolutionCapability` into the `NameResolver` seam
 * consumed by the base `AddressField` (INV-119).
 *
 * Pins the three commitments of INV-119 / D3:
 *  1. SHARED cache, not a parallel one — each imperative `resolveName` call
 *     goes through the owned QueryClient's `fetchQuery` with SF-2's exact
 *     `buildResolutionKey` convention, so a field-initiated and a bare
 *     `useResolveName`-initiated resolution hit ONE cache entry (no duplicate
 *     adapter fetch, either order).
 *  2. Absent runtime / capability / method → the method is OMITTED (never a
 *     throw), which is what makes the field surface `UNSUPPORTED_NETWORK`
 *     (that field half is pinned in `ui-components`' asyncStates suite).
 *  3. The imperative `fetchQuery` path is used — not a `useQuery` observer.
 *
 * No module mocks: a REAL `WalletStateContext.Provider` carries a typed
 * capability stub, and a fresh isolated QueryClient is injected per test via
 * the SF-2 harness (`makeWrapper`), mirroring `AddAliasDialog.sf5.test.tsx`.
 */
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as React from 'react';

import type {
  EcosystemRuntime,
  NameResolutionCapability,
  NameResolver,
  NetworkConfig,
  ResolutionResult,
  ResolvedAddress,
} from '@openzeppelin/ui-types';

import { WalletStateContext, type WalletStateContextValue } from '../../WalletStateContext';
import { buildResolutionKey } from '../resolutionConfig';
import { useResolveName } from '../useResolveName';
import { useRuntimeNameResolver } from '../useRuntimeNameResolver';
import { ALICE, makeCapability, makeWrapper, tick } from './helpers';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

const NETWORK_ID = 'eip155:1';

/**
 * Full `WalletStateContextValue` around a capability (SF-5 test precedent:
 * `{} as NetworkConfig` / `as EcosystemRuntime` stubs for fields no test reads).
 */
function makeWallet(
  capability: NameResolutionCapability | undefined,
  activeNetworkId: string | null = NETWORK_ID
): WalletStateContextValue {
  return {
    activeNetworkId,
    setActiveNetworkId: () => undefined,
    activeNetworkConfig: { name: 'Ethereum' } as NetworkConfig,
    activeRuntime: capability ? ({ nameResolution: capability } as EcosystemRuntime) : null,
    isRuntimeLoading: false,
    walletFacadeHooks: null,
    reconfigureActiveUiKit: () => undefined,
  };
}

/** Compose the real WalletStateContext with the SF-2 isolated-client wrapper. */
function makeRuntimeWrapper(
  wallet: WalletStateContextValue,
  opts: Parameters<typeof makeWrapper>[0] = {}
): {
  client: ReturnType<typeof makeWrapper>['client'];
  Wrapper: (props: { children: React.ReactNode }) => React.ReactNode;
} {
  const { client, Wrapper: ResolutionWrapper } = makeWrapper(opts);
  function Wrapper({ children }: { children: React.ReactNode }): React.ReactNode {
    return (
      <WalletStateContext.Provider value={wallet}>
        <ResolutionWrapper>{children}</ResolutionWrapper>
      </WalletStateContext.Provider>
    );
  }
  return { client, Wrapper };
}

/** Narrow `resolveName` with an assertion-backed guard (no non-null `!`). */
function requireResolveName(
  resolver: NameResolver
): (name: string) => Promise<ResolutionResult<ResolvedAddress>> {
  const { resolveName } = resolver;
  expect(resolveName).toBeDefined();
  if (!resolveName) throw new Error('resolveName expected on the projected resolver');
  return resolveName;
}

describe('INV-119 (1): shared cache — one entry, no duplicate fetch across field + hook paths', () => {
  it('wiring call FIRST, bare hook SECOND: the hook is served from the shared entry (adapter called once)', async () => {
    const adapter = vi.fn(
      async (): Promise<ResolutionResult<ResolvedAddress>> => ({ ok: true, value: ALICE })
    );
    const wallet = makeWallet(makeCapability({ resolveName: adapter }));
    const { client, Wrapper } = makeRuntimeWrapper(wallet);

    // field path: the imperative seam call
    const wiring = renderHook(() => useRuntimeNameResolver(), { wrapper: Wrapper });
    const viaSeam = await requireResolveName(wiring.result.current)('alice.eth');
    expect(viaSeam).toEqual({ ok: true, value: ALICE });
    expect(adapter).toHaveBeenCalledTimes(1);

    // hook path: same name, same client — must not re-fetch
    const hook = renderHook(() => useResolveName('alice.eth'), { wrapper: Wrapper });
    await tick(0);
    expect(hook.result.current).toMatchObject({ status: 'resolved', data: ALICE });
    expect(adapter).toHaveBeenCalledTimes(1); // shared entry, no duplicate fetch

    // and the entry lives under SF-2's exact key convention
    expect(client.getQueryData(buildResolutionKey('name', NETWORK_ID, 'alice.eth'))).toEqual(ALICE);
    expect(client.getQueryCache().getAll()).toHaveLength(1); // shared, never parallel
  });

  it('bare hook FIRST, wiring call SECOND: the seam call is served from the shared entry (adapter called once)', async () => {
    const adapter = vi.fn(
      async (): Promise<ResolutionResult<ResolvedAddress>> => ({ ok: true, value: ALICE })
    );
    const wallet = makeWallet(makeCapability({ resolveName: adapter }));
    const { client, Wrapper } = makeRuntimeWrapper(wallet);

    const hook = renderHook(() => useResolveName('alice.eth'), { wrapper: Wrapper });
    await tick(0);
    expect(hook.result.current).toMatchObject({ status: 'resolved', data: ALICE });
    expect(adapter).toHaveBeenCalledTimes(1);

    const wiring = renderHook(() => useRuntimeNameResolver(), { wrapper: Wrapper });
    const viaSeam = await requireResolveName(wiring.result.current)('alice.eth');
    expect(viaSeam).toEqual({ ok: true, value: ALICE });
    expect(adapter).toHaveBeenCalledTimes(1); // fresh cached entry re-used
    expect(client.getQueryCache().getAll()).toHaveLength(1);
  });

  it('normalizes trim+lowercase before keying, so a raw typed variant maps onto the same entry', async () => {
    const adapter = vi.fn(
      async (name: string): Promise<ResolutionResult<ResolvedAddress>> => ({
        ok: true,
        value: { ...ALICE, name },
      })
    );
    const wallet = makeWallet(makeCapability({ resolveName: adapter }));
    const { client, Wrapper } = makeRuntimeWrapper(wallet);

    const wiring = renderHook(() => useRuntimeNameResolver(), { wrapper: Wrapper });
    const resolveName = requireResolveName(wiring.result.current);
    await resolveName('  Alice.ETH ');
    expect(adapter).toHaveBeenCalledWith('alice.eth'); // adapter sees the normalized name

    await resolveName('alice.eth');
    expect(adapter).toHaveBeenCalledTimes(1); // same key ⇒ no second fetch
    expect(client.getQueryData(buildResolutionKey('name', NETWORK_ID, 'alice.eth'))).toBeDefined();
  });
});

describe('INV-119 (2): degradation by method omission — never a throw', () => {
  it('no WalletStateContext provider at all: returns the empty resolver without throwing', () => {
    const { Wrapper } = makeWrapper();
    // deliberately NOT wrapped in WalletStateContext.Provider — the direct
    // context read must degrade, not throw like useWalletState() would
    const { result } = renderHook(() => useRuntimeNameResolver(), {
      wrapper: ({ children }) => <Wrapper>{children}</Wrapper>,
    });
    expect(result.current.resolveName).toBeUndefined();
    expect(result.current.isValidName).toBeUndefined();
  });

  it('runtime present but no nameResolution capability: empty resolver', () => {
    const { Wrapper } = makeRuntimeWrapper(makeWallet(undefined));
    const { result } = renderHook(() => useRuntimeNameResolver(), { wrapper: Wrapper });
    expect(result.current.resolveName).toBeUndefined();
    expect(result.current.isValidName).toBeUndefined();
  });

  it('capability without resolveName: forward method omitted, isValidName still delegates', () => {
    const isValidName = vi.fn((name: string): boolean => name.endsWith('.eth'));
    const { Wrapper } = makeRuntimeWrapper(makeWallet(makeCapability({ isValidName })));
    const { result } = renderHook(() => useRuntimeNameResolver(), { wrapper: Wrapper });

    expect(result.current.resolveName).toBeUndefined(); // field will surface UNSUPPORTED_NETWORK
    expect(result.current.isValidName?.('alice.eth')).toBe(true);
    expect(result.current.isValidName?.('alice.sol')).toBe(false);
    expect(isValidName).toHaveBeenCalledTimes(2);
  });

  it('capability present but network unsupported: the ok:false UNSUPPORTED_NETWORK result passes through unchanged', async () => {
    const adapter = vi.fn(
      async (): Promise<ResolutionResult<ResolvedAddress>> => ({
        ok: false,
        error: { code: 'UNSUPPORTED_NETWORK', networkId: NETWORK_ID },
      })
    );
    const { Wrapper } = makeRuntimeWrapper(makeWallet(makeCapability({ resolveName: adapter })));
    const wiring = renderHook(() => useRuntimeNameResolver(), { wrapper: Wrapper });

    const result = await requireResolveName(wiring.result.current)('alice.eth');
    expect(result).toEqual({
      ok: false,
      error: { code: 'UNSUPPORTED_NETWORK', networkId: NETWORK_ID },
    });
    expect(adapter).toHaveBeenCalledTimes(1); // definitive negative — never retried
  });

  it('a throwing adapter (SF-1 contract violation) is backstopped into ok:false ADAPTER_ERROR — the seam never rejects', async () => {
    const adapter = vi.fn(async (): Promise<ResolutionResult<ResolvedAddress>> => {
      throw new Error('rpc exploded');
    });
    // retry disabled here so the backstop (the subject) settles without backoff
    // timers; the retry-policy mirror itself is pinned in the next test.
    const { Wrapper } = makeRuntimeWrapper(makeWallet(makeCapability({ resolveName: adapter })), {
      config: { transientRetryCount: 0 },
    });
    const wiring = renderHook(() => useRuntimeNameResolver(), { wrapper: Wrapper });

    const result = await requireResolveName(wiring.result.current)('alice.eth');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatchObject({ code: 'ADAPTER_ERROR', message: 'rpc exploded' });
    }
  });

  it("mirrors SF-2's retry policy: a transient failure is retried up to the cap (backoff timers advanced)", async () => {
    const adapter = vi.fn(async (): Promise<ResolutionResult<ResolvedAddress>> => {
      throw new Error('flaky rpc');
    });
    const { Wrapper } = makeRuntimeWrapper(makeWallet(makeCapability({ resolveName: adapter })));
    const wiring = renderHook(() => useRuntimeNameResolver(), { wrapper: Wrapper });

    const pending = requireResolveName(wiring.result.current)('alice.eth');
    // react-query exponential backoff: 1s then 2s for the 2 default retries
    await tick(1000);
    await tick(2000);
    const result = await pending;

    expect(adapter).toHaveBeenCalledTimes(3); // initial + transientRetryCount(2)
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatchObject({ code: 'ADAPTER_ERROR', message: 'flaky rpc' });
    }
  });
});

describe('INV-119 (3): the imperative fetchQuery path (not a useQuery observer)', () => {
  it('each seam call goes through queryClient.fetchQuery with the shared key; no observer is mounted', async () => {
    const adapter = vi.fn(
      async (): Promise<ResolutionResult<ResolvedAddress>> => ({ ok: true, value: ALICE })
    );
    const wallet = makeWallet(makeCapability({ resolveName: adapter }));
    const { client, Wrapper } = makeRuntimeWrapper(wallet);
    const fetchQuerySpy = vi.spyOn(client, 'fetchQuery');

    const wiring = renderHook(() => useRuntimeNameResolver(), { wrapper: Wrapper });
    await requireResolveName(wiring.result.current)('alice.eth');

    expect(fetchQuerySpy).toHaveBeenCalledTimes(1);
    expect(fetchQuerySpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: buildResolutionKey('name', NETWORK_ID, 'alice.eth') })
    );
    // imperative path only: the cache entry exists with zero mounted observers
    const entry = client
      .getQueryCache()
      .find({ queryKey: buildResolutionKey('name', NETWORK_ID, 'alice.eth') });
    expect(entry?.getObserversCount()).toBe(0);
  });

  it('the projected resolver is referentially stable across re-renders (ambient-mount friendly)', () => {
    const wallet = makeWallet(makeCapability({}));
    const { Wrapper } = makeRuntimeWrapper(wallet);
    const { result, rerender } = renderHook(() => useRuntimeNameResolver(), { wrapper: Wrapper });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
