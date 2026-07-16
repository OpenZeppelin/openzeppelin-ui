/**
 * SF-4 · useResolveRuntime — memoization and resolveRuntime identity on opt-in change.
 *
 * Verifies: INV-217, INV-222.
 */
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type {
  CreateRuntimeOptions,
  EcosystemExport,
  EcosystemRuntime,
  NetworkConfig,
} from '@openzeppelin/ui-types';

import { useResolveRuntime } from '../useResolveRuntime';

const networkConfig = {} as NetworkConfig;

function makeEcosystemExport(): EcosystemExport {
  return {
    createRuntime: vi.fn(
      () =>
        ({
          dispose: vi.fn(),
          networkConfig,
        }) as unknown as EcosystemRuntime
    ),
    networks: [],
    id: 'evm',
    name: 'EVM',
    capabilities: {},
  } as unknown as EcosystemExport;
}

describe('INV-217: useResolveRuntime returns new function when opt-in posture changes', () => {
  it('changes resolveRuntime reference when enableMainnetL1MissFallback toggles', () => {
    const ecosystem = makeEcosystemExport();

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useResolveRuntime(ecosystem, {
          profile: 'composer',
          options: enabled ? { nameResolution: { enableMainnetL1MissFallback: true } } : undefined,
        }),
      { initialProps: { enabled: false } }
    );

    const offRef = result.current;
    rerender({ enabled: true });
    expect(result.current).not.toBe(offRef);

    const onRef = result.current;
    rerender({ enabled: true });
    expect(result.current).toBe(onRef);
  });

  it('changes resolveRuntime reference when profile changes', () => {
    const ecosystem = makeEcosystemExport();

    const { result, rerender } = renderHook(
      ({ profile }: { profile: 'composer' | 'operator' }) =>
        useResolveRuntime(ecosystem, { profile }),
      { initialProps: { profile: 'composer' as const } }
    );

    const composerRef = result.current;
    rerender({ profile: 'operator' });
    expect(result.current).not.toBe(composerRef);
  });
});

describe('INV-222: memoization keys on primitive opt-in and uiKit — not options object identity', () => {
  it('keeps stable resolveRuntime when parent recreates equivalent options object', () => {
    const ecosystem = makeEcosystemExport();

    const { result, rerender } = renderHook(
      ({ options }: { options: CreateRuntimeOptions }) =>
        useResolveRuntime(ecosystem, { profile: 'composer', options }),
      { initialProps: { options: {} } }
    );

    const firstRef = result.current;
    rerender({ options: {} });
    expect(result.current).toBe(firstRef);

    rerender({ options: { uiKit: 'composer' } });
    const uiKitRef = result.current;
    rerender({ options: { uiKit: 'composer' } });
    expect(result.current).toBe(uiKitRef);
  });
});
