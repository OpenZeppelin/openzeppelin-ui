/**
 * @vitest-environment jsdom
 *
 * SF-3 · Cross-network fallback display note — renderer bridge E2E
 * (INV-176, INV-185, INV-186, INV-188).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

import { AddressDisplay } from '@openzeppelin/ui-components';
import type { ResolvedName } from '@openzeppelin/ui-types';
import { nameResolutionCrossNetworkFallbackMessage } from '@openzeppelin/ui-utils';

import { AddressNameResolutionProvider } from '../AddressNameResolutionProvider';

const mockUseResolveAddress = vi.hoisted(() => vi.fn());

vi.mock('@openzeppelin/ui-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@openzeppelin/ui-react')>();
  return {
    ...actual,
    useResolveAddress: mockUseResolveAddress,
  };
});

const TEST_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const SEPOLIA = 'ethereum-sepolia';

const NETWORK_LABELS: Record<string, string> = {
  'ethereum-sepolia': 'Ethereum Sepolia',
  'ethereum-mainnet': 'Ethereum Mainnet',
};

const resolveNetworkLabel = (id: string): string | undefined => NETWORK_LABELS[id];

const GOLDEN_FALLBACK_PROVENANCE = {
  label: 'ENS',
  external: false,
  resolvedViaNetworkFallback: true,
  queriedOnNetworkId: 'ethereum-sepolia',
  resolvedOnNetworkId: 'ethereum-mainnet',
} as const;

const INTERPOLATED_MESSAGE = nameResolutionCrossNetworkFallbackMessage(
  {
    queriedOnNetworkId: 'ethereum-sepolia',
    resolvedOnNetworkId: 'ethereum-mainnet',
  },
  {
    queriedNetworkName: 'Ethereum Sepolia',
    resolvedNetworkName: 'Ethereum Mainnet',
  }
);

function fallbackRecord(name = 'vitalik.eth'): ResolvedName {
  return {
    address: TEST_ADDRESS.toLowerCase(),
    name,
    forwardVerified: true,
    provenance: GOLDEN_FALLBACK_PROVENANCE,
  };
}

const PROVIDER_SOURCE = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'AddressNameResolutionProvider.tsx'),
  'utf-8'
);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('INV-176: AddressNameResolutionProvider + AddressDisplay golden triplet acceptance', () => {
  it('renders verified name and interpolated disclaimer on a Sepolia-bound row', () => {
    mockUseResolveAddress.mockReturnValue({
      status: 'resolved',
      data: fallbackRecord(),
    });

    render(
      <AddressNameResolutionProvider
        address={TEST_ADDRESS}
        networkId={SEPOLIA}
        resolveNetworkLabel={resolveNetworkLabel}
      >
        <AddressDisplay address={TEST_ADDRESS} networkId={SEPOLIA} />
      </AddressNameResolutionProvider>
    );

    expect(screen.getByText('vitalik.eth')).toBeTruthy();
    expect(screen.getByRole('button', { name: INTERPOLATED_MESSAGE })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: INTERPOLATED_MESSAGE }).getAttribute('aria-label')
    ).toBe(INTERPOLATED_MESSAGE);
  });
});

describe('INV-185: scope gate never consults fallback helpers', () => {
  it('serves golden triplet record through bridge when scopedToNetworkId is absent', () => {
    const record = fallbackRecord();
    mockUseResolveAddress.mockReturnValue({
      status: 'resolved',
      data: record,
    });

    render(
      <AddressNameResolutionProvider address={TEST_ADDRESS} networkId={SEPOLIA}>
        <AddressDisplay address={TEST_ADDRESS} networkId={SEPOLIA} />
      </AddressNameResolutionProvider>
    );

    expect(screen.getByText('vitalik.eth')).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: 'Name not found on ethereum-sepolia, but found on ethereum-mainnet.',
      })
    ).toBeTruthy();
  });

  it('AddressNameResolutionProvider does not import fallback classifier helpers', () => {
    expect(PROVIDER_SOURCE).not.toMatch(/\bisCrossNetworkFallback\b/);
    expect(PROVIDER_SOURCE).not.toMatch(/\bgetFallbackNetworks\b/);
    expect(PROVIDER_SOURCE).not.toMatch(/\bnameResolutionCrossNetworkFallbackMessage\b/);
    expect(PROVIDER_SOURCE).toMatch(/\bisChainScopeMismatch\b/);
  });
});

describe('INV-186: renderer bridge imports no adapter ENS provenance types', () => {
  it('AddressNameResolutionProvider has zero forbidden adapter symbols', () => {
    expect(PROVIDER_SOURCE).not.toMatch(/\bEnsProvenance\b/);
    expect(PROVIDER_SOURCE).not.toMatch(/\bisEnsProvenance\b/);
    expect(PROVIDER_SOURCE).not.toMatch(/\bcoinType\b/);
  });
});

describe('INV-188: resolveNetworkLabel forwarded through provider', () => {
  it('humanizes disclaimer when resolveNetworkLabel is supplied on provider', () => {
    mockUseResolveAddress.mockReturnValue({
      status: 'resolved',
      data: fallbackRecord(),
    });

    render(
      <AddressNameResolutionProvider
        address={TEST_ADDRESS}
        networkId={SEPOLIA}
        resolveNetworkLabel={resolveNetworkLabel}
      >
        <AddressDisplay address={TEST_ADDRESS} networkId={SEPOLIA} />
      </AddressNameResolutionProvider>
    );

    expect(
      screen.getByRole('button', { name: INTERPOLATED_MESSAGE }).getAttribute('aria-label')
    ).toBe(INTERPOLATED_MESSAGE);
  });
});
