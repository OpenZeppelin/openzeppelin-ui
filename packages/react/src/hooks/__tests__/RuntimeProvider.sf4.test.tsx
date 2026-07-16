/**
 * SF-4 · RuntimeProvider — full registry disposal on resolveRuntime identity change.
 *
 * Verifies: INV-218, INV-223, INV-226 (deferred dispose discipline).
 */
import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect, useRef, type ReactNode } from 'react';

import type { EcosystemRuntime, NetworkConfig } from '@openzeppelin/ui-types';

import { RuntimeProvider } from '../AdapterProvider';
import { useRuntimeContext } from '../useAdapterContext';

function createNetworkConfig(overrides: Partial<NetworkConfig> = {}): NetworkConfig {
  return {
    id: 'ethereum-sepolia',
    name: 'Ethereum Sepolia',
    ecosystem: 'evm',
    network: 'ethereum',
    type: 'testnet',
    isTestnet: true,
    exportConstName: 'ethereumSepolia',
    chainId: 11155111,
    rpcUrl: 'https://rpc.example.test',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    ...overrides,
  };
}

function createMockRuntime(dispose = vi.fn()): EcosystemRuntime {
  return { dispose, networkConfig: createNetworkConfig() } as unknown as EcosystemRuntime;
}

/** Loads a runtime into the provider registry and signals when settled. */
function RuntimeLoader({
  networkConfig,
  onLoaded,
}: {
  networkConfig: NetworkConfig;
  onLoaded: (runtime: EcosystemRuntime) => void;
}): null {
  const { getRuntimeForNetwork } = useRuntimeContext();
  const reportedRef = useRef<EcosystemRuntime | null>(null);

  useEffect(() => {
    const { runtime } = getRuntimeForNetwork(networkConfig);
    if (runtime && runtime !== reportedRef.current) {
      reportedRef.current = runtime;
      onLoaded(runtime);
    }
  });

  return null;
}

function renderWithProvider(
  resolveRuntime: (networkConfig: NetworkConfig) => Promise<EcosystemRuntime>,
  children: ReactNode
) {
  return render(<RuntimeProvider resolveRuntime={resolveRuntime}>{children}</RuntimeProvider>);
}

describe('INV-218: RuntimeProvider disposes all cached runtimes when resolveRuntime changes', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('calls dispose on every cached runtime and clears registry before reload', async () => {
    const networkConfig = createNetworkConfig();
    const dispose1 = vi.fn();
    const runtime1 = createMockRuntime(dispose1);
    const resolveRuntime1 = vi.fn(async () => runtime1);

    let loadedRuntime: EcosystemRuntime | null = null;
    const onLoaded = (runtime: EcosystemRuntime) => {
      loadedRuntime = runtime;
    };

    const { rerender } = renderWithProvider(
      resolveRuntime1,
      <RuntimeLoader networkConfig={networkConfig} onLoaded={onLoaded} />
    );

    await waitFor(() => expect(loadedRuntime).toBe(runtime1));
    expect(resolveRuntime1).toHaveBeenCalledWith(networkConfig);

    const dispose2 = vi.fn();
    const runtime2 = createMockRuntime(dispose2);
    const resolveRuntime2 = vi.fn(async () => runtime2);

    rerender(
      <RuntimeProvider resolveRuntime={resolveRuntime2}>
        <RuntimeLoader networkConfig={networkConfig} onLoaded={onLoaded} />
      </RuntimeProvider>
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(
      dispose1,
      'INV-218: prior cached runtime must be disposed when resolveRuntime identity changes'
    ).toHaveBeenCalledTimes(1);
    expect(dispose2).not.toHaveBeenCalled();
  });
});

describe('INV-223: registry flush uses deferred dispose — no synchronous disposal during commit', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('defers dispose to a macrotask (setTimeout 0) matching releaseRuntime discipline', async () => {
    const networkConfig = createNetworkConfig();
    const dispose = vi.fn();
    const runtime = createMockRuntime(dispose);
    const resolveRuntime1 = vi.fn(async () => runtime);

    let loaded = false;
    const { rerender } = renderWithProvider(
      resolveRuntime1,
      <RuntimeLoader
        networkConfig={networkConfig}
        onLoaded={() => {
          loaded = true;
        }}
      />
    );

    await waitFor(() => expect(loaded).toBe(true));

    const resolveRuntime2 = vi.fn(async () => createMockRuntime());
    dispose.mockClear();

    rerender(
      <RuntimeProvider resolveRuntime={resolveRuntime2}>
        <RuntimeLoader networkConfig={networkConfig} onLoaded={() => undefined} />
      </RuntimeProvider>
    );

    expect(
      dispose,
      'dispose must not run synchronously during React commit'
    ).not.toHaveBeenCalled();

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(dispose).toHaveBeenCalledTimes(1);
  });
});

describe('INV-226: in-flight load during flush does not leave unhandled rejections', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('survives resolveRuntime swap while a prior resolver promise is still pending', async () => {
    const networkConfig = createNetworkConfig();
    let resolvePending: ((runtime: EcosystemRuntime) => void) | undefined;
    const slowResolver = vi.fn(
      () =>
        new Promise<EcosystemRuntime>((resolve) => {
          resolvePending = resolve;
        })
    );

    const { rerender, unmount } = renderWithProvider(
      slowResolver,
      <RuntimeLoader networkConfig={networkConfig} onLoaded={() => undefined} />
    );

    await waitFor(() => expect(slowResolver).toHaveBeenCalled());

    const fastResolver = vi.fn(async () => createMockRuntime());
    rerender(
      <RuntimeProvider resolveRuntime={fastResolver}>
        <RuntimeLoader networkConfig={networkConfig} onLoaded={() => undefined} />
      </RuntimeProvider>
    );

    await act(async () => {
      resolvePending?.(createMockRuntime());
      await vi.runAllTimersAsync();
    });

    expect(() => unmount()).not.toThrow();
  });
});
