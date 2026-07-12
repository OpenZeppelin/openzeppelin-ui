import { createContext, type Context } from 'react';

import type { NameResolver } from '@openzeppelin/ui-types';

/**
 * Value held by NameResolverContext. Extends the SF-3 injection seam with
 * optional network context for SF-6 chain-scope gating only.
 */
export interface NameResolverContextValue extends NameResolver {
  /**
   * Active network id for chain-scope submit gating (opaque string).
   * When absent, `isChainScopeMismatch` is never true and coinType wrong-chain
   * protection is the integrator's responsibility.
   */
  readonly activeNetworkId?: string | null;

  /**
   * Optional human-readable active network name — interpolated into the
   * chain-scope mismatch message only (same seam as INV-78 networkName).
   */
  readonly activeNetworkName?: string;
}

/**
 * Process-global key for the context object. Uses `Symbol.for` so all duplicated
 * module instances share ONE React context — the same cross-bundle-singleton
 * pattern as `@openzeppelin/ui-react`'s `NameResolutionContext` /
 * `WalletStateContext` (bundler pre-bundling / npm-installed consumers).
 */
const CONTEXT_KEY = Symbol.for('@openzeppelin/ui-components/NameResolverContext');

interface GlobalWithNameResolverContext {
  [CONTEXT_KEY]?: Context<NameResolverContextValue | null>;
}

function getOrCreateSharedContext(): Context<NameResolverContextValue | null> {
  const globalScope = globalThis as GlobalWithNameResolverContext;
  if (!globalScope[CONTEXT_KEY]) {
    globalScope[CONTEXT_KEY] = createContext<NameResolverContextValue | null>(null);
  }
  return globalScope[CONTEXT_KEY];
}

/**
 * @internal Shared context instance consumed by both AddressField and
 * NameResolverProvider (INV-118). Kept in its own file so component files
 * export only components (required by React Fast Refresh).
 *
 * `null` means no provider is mounted — every ENS branch in `AddressField` is
 * then dead code and the field is byte-identical to its pre-ENS behavior
 * (INV-82).
 */
export const NameResolverContext = getOrCreateSharedContext();
