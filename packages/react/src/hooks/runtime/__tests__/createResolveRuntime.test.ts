/**
 * SF-4 · createResolveRuntime — pure factory threading to ecosystemDefinition.createRuntime.
 *
 * Verifies: INV-213, INV-219, INV-224, INV-227, INV-228.
 */
import { describe, expect, it, vi } from 'vitest';

import type { EcosystemExport, EcosystemRuntime, NetworkConfig } from '@openzeppelin/ui-types';

import { createResolveRuntime } from '../createResolveRuntime';

const networkConfig = {
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
} as NetworkConfig;

function makeRuntime(): EcosystemRuntime {
  return { dispose: vi.fn(), networkConfig } as unknown as EcosystemRuntime;
}

function makeEcosystemExport(
  createRuntime = vi.fn(() => makeRuntime())
): Pick<EcosystemExport, 'createRuntime'> {
  return { createRuntime };
}

describe('INV-219: each resolveRuntime call delegates to createRuntime with merged options', () => {
  it('invokes createRuntime per network with profile and merged third argument', async () => {
    const createRuntime = vi.fn(() => makeRuntime());
    const ecosystem = makeEcosystemExport(createRuntime);
    const resolveRuntime = createResolveRuntime(ecosystem as EcosystemExport, {
      profile: 'composer',
      options: { uiKit: 'composer' },
    });

    const sepolia = networkConfig;
    const mainnet = { ...networkConfig, id: 'ethereum-mainnet', chainId: 1 };

    await resolveRuntime(sepolia);
    await resolveRuntime(mainnet);

    expect(createRuntime).toHaveBeenCalledTimes(2);
    expect(createRuntime).toHaveBeenNthCalledWith(1, 'composer', sepolia, { uiKit: 'composer' });
    expect(createRuntime).toHaveBeenNthCalledWith(2, 'composer', mainnet, { uiKit: 'composer' });
  });
});

describe('INV-228 / INV-204: default OFF omits enablement key at adapter boundary (SC-004)', () => {
  it('passes {} when options are omitted — miss-fallback OFF', async () => {
    const createRuntime = vi.fn(() => makeRuntime());
    const resolveRuntime = createResolveRuntime(
      makeEcosystemExport(createRuntime) as EcosystemExport,
      {
        profile: 'composer',
      }
    );

    await resolveRuntime(networkConfig);

    expect(createRuntime).toHaveBeenCalledWith('composer', networkConfig, {});
    const thirdArg = createRuntime.mock.calls[0]?.[2];
    expect(thirdArg).not.toHaveProperty('nameResolution');
  });

  it('passes options without nameResolution when opt-in is false', async () => {
    const createRuntime = vi.fn(() => makeRuntime());
    const resolveRuntime = createResolveRuntime(
      makeEcosystemExport(createRuntime) as EcosystemExport,
      {
        profile: 'composer',
        options: { nameResolution: { enableMainnetL1MissFallback: false } },
      }
    );

    await resolveRuntime(networkConfig);

    const thirdArg = createRuntime.mock.calls[0]?.[2];
    expect(thirdArg).toEqual({});
    expect(thirdArg).not.toHaveProperty('nameResolution');
  });
});

describe('INV-208: ON posture threads enableMainnetL1MissFallback: true only', () => {
  it('passes { nameResolution: { enableMainnetL1MissFallback: true } } when opt-in is ON', async () => {
    const createRuntime = vi.fn(() => makeRuntime());
    const resolveRuntime = createResolveRuntime(
      makeEcosystemExport(createRuntime) as EcosystemExport,
      {
        profile: 'composer',
        options: { nameResolution: { enableMainnetL1MissFallback: true } },
      }
    );

    await resolveRuntime(networkConfig);

    expect(createRuntime).toHaveBeenCalledWith('composer', networkConfig, {
      nameResolution: { enableMainnetL1MissFallback: true },
    });
  });
});

describe('INV-213 / INV-227: options pass through without UIKit throw', () => {
  it('does not throw when non-EVM export ignores nameResolution slice (INV-213)', async () => {
    const createRuntime = vi.fn(() => makeRuntime());
    const resolveRuntime = createResolveRuntime(
      makeEcosystemExport(createRuntime) as EcosystemExport,
      {
        profile: 'composer',
        options: { nameResolution: { enableMainnetL1MissFallback: true } },
      }
    );

    await expect(resolveRuntime(networkConfig)).resolves.toBeDefined();
    expect(createRuntime).toHaveBeenCalled();
  });

  it('does not throw when adapter ignores third arg (pre-adapter-003, INV-227)', async () => {
    const createRuntime = vi.fn((_profile, _config) => makeRuntime());
    const resolveRuntime = createResolveRuntime(
      makeEcosystemExport(createRuntime) as EcosystemExport,
      {
        profile: 'composer',
        options: { nameResolution: { enableMainnetL1MissFallback: true } },
      }
    );

    await expect(resolveRuntime(networkConfig)).resolves.toBeDefined();
  });
});

describe('INV-224: createResolveRuntime performs no I/O beyond createRuntime delegate', () => {
  it('returns a Promise from the ecosystem delegate only', async () => {
    const runtime = makeRuntime();
    const createRuntime = vi.fn(() => runtime);
    const resolveRuntime = createResolveRuntime(
      makeEcosystemExport(createRuntime) as EcosystemExport,
      {
        profile: 'composer',
      }
    );

    const result = await resolveRuntime(networkConfig);
    expect(result).toBe(runtime);
    expect(createRuntime).toHaveBeenCalledTimes(1);
  });
});
