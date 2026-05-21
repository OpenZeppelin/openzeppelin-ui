import type React from 'react';

import type {
  EcosystemReactUiProviderProps,
  EcosystemSpecificReactHooks,
} from '@openzeppelin/ui-types';

/**
 * Cached wallet session artifacts for a single ecosystem.
 *
 * This keeps the wallet provider and facade hooks stable while network-scoped
 * runtimes are recreated underneath the session.
 */
export interface WalletSessionEntry {
  /** Ecosystem identifier, e.g. `evm` or `stellar`. */
  ecosystem: string;
  /** The network whose runtime most recently configured this session. */
  lastConfiguredNetworkId: string;
  /** Ecosystem-scoped React provider root for wallet libraries such as wagmi. */
  providerComponent: React.ComponentType<EcosystemReactUiProviderProps> | null;
  /** Facade hooks resolved from the ecosystem session. */
  hooks: EcosystemSpecificReactHooks | null;
}

/**
 * Internal registry of dormant and active wallet sessions keyed by ecosystem.
 */
export type WalletSessionRegistry = Record<string, WalletSessionEntry>;

/**
 * Returns the cached wallet session for an ecosystem, if present.
 *
 * @param registry - Current internal wallet session registry.
 * @param ecosystem - Ecosystem key to resolve.
 * @returns The cached session entry or `null` when the ecosystem has not been configured yet.
 */
export function getWalletSession(
  registry: WalletSessionRegistry,
  ecosystem: string | null | undefined
): WalletSessionEntry | null {
  if (!ecosystem) {
    return null;
  }

  return registry[ecosystem] ?? null;
}

/**
 * Inserts or replaces the cached wallet session for a single ecosystem.
 *
 * @param registry - Current internal wallet session registry.
 * @param session - Session entry to cache.
 * @returns A new registry object containing the upserted ecosystem session.
 */
export function upsertWalletSession(
  registry: WalletSessionRegistry,
  session: WalletSessionEntry
): WalletSessionRegistry {
  return {
    ...registry,
    [session.ecosystem]: session,
  };
}
