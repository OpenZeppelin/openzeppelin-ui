import { describe, expect, it, vi } from 'vitest';
import React from 'react';

import type { EcosystemSpecificReactHooks } from '@openzeppelin/ui-types';

import {
  getWalletSession,
  upsertWalletSession,
  type WalletSessionEntry,
  type WalletSessionRegistry,
} from './walletSessionRegistry';

const providerA: React.FC<React.PropsWithChildren> = ({ children }) =>
  React.createElement(React.Fragment, null, children);
const providerB: React.FC<React.PropsWithChildren> = ({ children }) =>
  React.createElement(React.Fragment, null, children);

function createSession(
  ecosystem: string,
  networkId: string,
  providerComponent: React.ComponentType<React.PropsWithChildren>,
  hooks: EcosystemSpecificReactHooks
): WalletSessionEntry {
  return {
    ecosystem,
    lastConfiguredNetworkId: networkId,
    providerComponent,
    hooks,
  };
}

describe('walletSessionRegistry', () => {
  it('returns null when no session exists for an ecosystem', () => {
    const registry: WalletSessionRegistry = {};

    expect(getWalletSession(registry, 'evm')).toBeNull();
  });

  it('stores and retrieves sessions by ecosystem', () => {
    const hooks = { useAccount: vi.fn() };
    const registry = upsertWalletSession(
      {},
      createSession('evm', 'ethereum-mainnet', providerA, hooks)
    );

    expect(getWalletSession(registry, 'evm')).toEqual({
      ecosystem: 'evm',
      lastConfiguredNetworkId: 'ethereum-mainnet',
      providerComponent: providerA,
      hooks,
    });
  });

  it('replaces only the targeted ecosystem entry and preserves dormant sessions', () => {
    const evmHooksA = { useAccount: vi.fn() };
    const evmHooksB = { useAccount: vi.fn() };
    const stellarHooks = { useAccount: vi.fn() };

    const withEvm = upsertWalletSession(
      {},
      createSession('evm', 'ethereum-mainnet', providerA, evmHooksA)
    );
    const withDormantStellar = upsertWalletSession(
      withEvm,
      createSession('stellar', 'stellar-testnet', providerB, stellarHooks)
    );
    const updatedEvm = upsertWalletSession(
      withDormantStellar,
      createSession('evm', 'ethereum-sepolia', providerA, evmHooksB)
    );

    expect(getWalletSession(updatedEvm, 'evm')).toEqual({
      ecosystem: 'evm',
      lastConfiguredNetworkId: 'ethereum-sepolia',
      providerComponent: providerA,
      hooks: evmHooksB,
    });
    expect(getWalletSession(updatedEvm, 'stellar')).toEqual({
      ecosystem: 'stellar',
      lastConfiguredNetworkId: 'stellar-testnet',
      providerComponent: providerB,
      hooks: stellarHooks,
    });
  });
});
