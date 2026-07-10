/**
 * Type-level invariant probes for the SF-1 `NameResolutionCapability` interface
 * and its runtime slots (`EcosystemRuntime.nameResolution`,
 * `CapabilityFactoryMap.nameResolution`).
 *
 * Compile-time assertions enforced by `pnpm typecheck` (`tsc --noEmit`). The
 * `satisfies` checks fail the build if a stub stops conforming to the interface;
 * the `@ts-expect-error` directives are two-way (an unused one is TS2578), so a
 * regression that makes `isValidName` optional — or makes a runtime slot required
 * — breaks the typecheck. Runtime `expect`s register the file with Vitest.
 *
 * Verifies: INV-3, INV-20.
 */
import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  CapabilityFactoryMap,
  EcosystemRuntime,
  NameResolutionCapability,
  NetworkConfig,
  ResolutionResult,
  ResolvedAddress,
  ResolvedName,
} from '../../../index';

const networkConfig = {} as NetworkConfig;

describe('INV-3: isValidName is required; resolveName and resolveAddress are optional', () => {
  it('accepts an implementation that omits both directional methods', () => {
    const minimal = {
      networkConfig,
      dispose: () => undefined,
      isValidName: (_name: string) => true,
    } satisfies NameResolutionCapability;
    expect(typeof minimal.isValidName).toBe('function');
  });

  it('accepts an implementation that provides both directional methods', () => {
    const full = {
      networkConfig,
      dispose: () => undefined,
      isValidName: (_name: string) => true,
      resolveName: async (name: string): Promise<ResolutionResult<ResolvedAddress>> => ({
        ok: false,
        error: { code: 'NAME_NOT_FOUND', name },
      }),
      resolveAddress: async (address: string): Promise<ResolutionResult<ResolvedName>> => ({
        ok: false,
        error: { code: 'ADDRESS_NOT_FOUND', address },
      }),
    } satisfies NameResolutionCapability;
    expect(typeof full.resolveName).toBe('function');
    expect(typeof full.resolveAddress).toBe('function');
  });

  it('rejects an implementation missing isValidName', () => {
    const missingIsValidName = {
      networkConfig,
      dispose: () => undefined,
    };
    // @ts-expect-error - isValidName is required by NameResolutionCapability
    const _check: NameResolutionCapability = missingIsValidName;
    void _check;
    expect(true).toBe(true);
  });

  it('types both directional methods as optional', () => {
    expectTypeOf<NameResolutionCapability['resolveName']>().toEqualTypeOf<
      ((name: string) => Promise<ResolutionResult<ResolvedAddress>>) | undefined
    >();
    expectTypeOf<NameResolutionCapability['resolveAddress']>().toEqualTypeOf<
      ((address: string) => Promise<ResolutionResult<ResolvedName>>) | undefined
    >();
    expect(true).toBe(true);
  });
});

describe('INV-20: EcosystemRuntime.nameResolution and CapabilityFactoryMap.nameResolution are both optional', () => {
  it('types the runtime slot as optional (NameResolutionCapability | undefined)', () => {
    expectTypeOf<EcosystemRuntime['nameResolution']>().toEqualTypeOf<
      NameResolutionCapability | undefined
    >();
    expect(true).toBe(true);
  });

  it('types the factory slot as optional and network-scoped', () => {
    expectTypeOf<CapabilityFactoryMap['nameResolution']>().toEqualTypeOf<
      ((config: NetworkConfig) => NameResolutionCapability) | undefined
    >();
    expect(true).toBe(true);
  });

  it('lets an adapter omit nameResolution from its factory map with no type error', () => {
    // Annotation (not `satisfies`) is deliberate: assigning `{}` to the interface
    // compiles ONLY because every slot — including nameResolution — is optional.
    // A required nameResolution would break this line.
    const factoryMapWithout: CapabilityFactoryMap = {};
    expect(factoryMapWithout.nameResolution).toBeUndefined();
  });

  it('lets a runtime omit nameResolution while still satisfying EcosystemRuntime', () => {
    // Only the Tier-1 required capabilities are supplied; omitting nameResolution
    // must still assign to EcosystemRuntime.
    const runtimeWithout: EcosystemRuntime = {
      networkConfig,
      addressing: {} as EcosystemRuntime['addressing'],
      explorer: {} as EcosystemRuntime['explorer'],
      networkCatalog: {} as EcosystemRuntime['networkCatalog'],
      uiLabels: {} as EcosystemRuntime['uiLabels'],
      dispose: () => undefined,
    };
    expect(runtimeWithout.nameResolution).toBeUndefined();
  });
});

// --- Coverage beyond the explicit Stage-5 ask ---
describe('INV-5: network context is bound at construction — no switching method on the interface', () => {
  it('exposes exactly the RuntimeCapability members plus isValidName/resolveName/resolveAddress', () => {
    // Locking the key set proves there is no `setNetwork` / `switchNetwork` / `withNetwork`
    // method — network is bound by the factory (INV-20 asserts the factory takes config).
    expectTypeOf<keyof NameResolutionCapability>().toEqualTypeOf<
      'networkConfig' | 'dispose' | 'isValidName' | 'resolveName' | 'resolveAddress'
    >();
    expect(true).toBe(true);
  });
});
