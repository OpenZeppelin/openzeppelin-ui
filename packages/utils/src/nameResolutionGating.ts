/**
 * Chain-scope gating helpers for coinType wrong-network protection (SF-6).
 *
 * Pure functions consumed by the enhanced base `AddressField` for internal
 * submit/hex-write gating only — never for success-display branching.
 *
 * @see INV-133 (strict equality gate)
 * @see INV-138 (interpolation + generic fallback)
 * @see INV-146 (utils-only — not part of SF-1 error taxonomy)
 */
import type { ResolutionProvenance } from '@openzeppelin/ui-types';

/**
 * True when the adapter marked the resolved address as network-scoped and the
 * injected active network does not match. Used ONLY for submit/hex-write gating —
 * never for success-display branching (SF-6 Rev 4).
 *
 * @param provenance - Forward-resolve provenance from the settled result.
 * @param activeNetworkId - Caller-supplied active network id (opaque string, e.g.
 *   `eip155:8453`). When `null`/`undefined`/empty, returns `false` (gate
 *   disabled — integrator must wire the id for funds-safe coinType behavior).
 */
export function isChainScopeMismatch(
  provenance: Pick<ResolutionProvenance, 'scopedToNetworkId'>,
  activeNetworkId: string | null | undefined
): boolean {
  const scopedId = provenance.scopedToNetworkId;
  // INV-133: gate disabled without a non-empty scoped id or active id.
  if (!scopedId || scopedId === '') return false;
  if (activeNetworkId == null || activeNetworkId === '') return false;
  return scopedId !== activeNetworkId;
}

/** Optional human names for chain-scope error interpolation (INV-78 pattern). */
export interface ChainScopeMessageContext {
  /** Display name for the network the address is scoped to (from adapter/runtime). */
  readonly scopedNetworkName?: string;
  /** Display name for the wallet's active network (from runtime config). */
  readonly activeNetworkName?: string;
}

/**
 * Distinct, actionable, mechanism-neutral message when a coinType-scoped resolve
 * does not match the active network. NOT part of the SF-1 7-code union — this is
 * a UI-layer gate message derived from provenance + injected context.
 */
export function nameResolutionChainScopeMismatchMessage(ctx?: ChainScopeMessageContext): string {
  const scopedName = ctx?.scopedNetworkName?.trim();
  const activeName = ctx?.activeNetworkName?.trim();

  // INV-138: interpolate when both names are available; generic fallback otherwise.
  if (scopedName && activeName) {
    return `This name resolves to an address on ${scopedName}, not ${activeName}.`;
  }

  return 'This name resolves to an address for a different network.';
}
