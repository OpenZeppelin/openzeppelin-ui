/**
 * Cross-network fallback provenance classifiers (003 SF-2).
 *
 * Pure helpers that read **only** base {@link ResolutionProvenance} fields —
 * never adapter ENS types, `label`, or `scopedToNetworkId` (Principle II).
 *
 * Used by display disclaimer copy (SF-3); does not drive scope-gate suppression
 * (`isChainScopeMismatch` remains scopedToNetworkId-only per 002).
 *
 * @see adapters 003 SF-2 triplet integrity matrix (via SF-1 design)
 */
import type { NetworkLabelResolver, ResolutionProvenance } from '@openzeppelin/ui-types';

export type { NetworkLabelResolver } from '@openzeppelin/ui-types';

/** Minimal provenance slice for cross-network fallback classification. */
export type CrossNetworkFallbackProvenance = Pick<
  ResolutionProvenance,
  'resolvedViaNetworkFallback' | 'queriedOnNetworkId' | 'resolvedOnNetworkId'
>;

/** Network ids extracted from a complete cross-network fallback triplet. */
export interface CrossNetworkFallbackNetworks {
  /** Bound network that missed first (e.g. `ethereum-sepolia`). */
  readonly queriedOnNetworkId: string;
  /** Network where the record was found (e.g. `ethereum-mainnet`). */
  readonly resolvedOnNetworkId: string;
}

function isNonEmptyNetworkId(id: string | undefined): id is string {
  return typeof id === 'string' && id !== '';
}

function readCompleteFallbackTriplet(
  provenance: CrossNetworkFallbackProvenance
): CrossNetworkFallbackNetworks | undefined {
  // INV-F1: only strict `true` activates fallback classification.
  if (provenance.resolvedViaNetworkFallback !== true) return undefined;

  const { queriedOnNetworkId, resolvedOnNetworkId } = provenance;
  // INV-F2: both ids must be non-empty when flag is true.
  if (!isNonEmptyNetworkId(queriedOnNetworkId) || !isNonEmptyNetworkId(resolvedOnNetworkId)) {
    return undefined;
  }

  return { queriedOnNetworkId, resolvedOnNetworkId };
}

/**
 * True when provenance carries a **complete** cross-network fallback triplet:
 * `resolvedViaNetworkFallback === true` and both network ids are non-empty strings.
 *
 * Returns `false` for absent/false flags, orphan ids without the flag, incomplete
 * triplets (flag true but missing ids), and bound-local records without fallback.
 *
 * @param provenance - Base resolution provenance from a settled result.
 */
export function isCrossNetworkFallback(provenance: CrossNetworkFallbackProvenance): boolean {
  return readCompleteFallbackTriplet(provenance) !== undefined;
}

/**
 * Extracts the two network ids when {@link isCrossNetworkFallback} is true;
 * otherwise `undefined` (no false-positive disclaimer inputs).
 *
 * @param provenance - Base resolution provenance from a settled result.
 */
export function getFallbackNetworks(
  provenance: CrossNetworkFallbackProvenance
): CrossNetworkFallbackNetworks | undefined {
  return readCompleteFallbackTriplet(provenance);
}

/** Optional human names for cross-network fallback copy interpolation (INV-182). */
export interface CrossNetworkFallbackMessageContext extends CrossNetworkFallbackNetworks {
  /** Display name for {@link queriedOnNetworkId} (bound network that missed). */
  readonly queriedNetworkName?: string;
  /** Display name for {@link resolvedOnNetworkId} (network where found). */
  readonly resolvedNetworkName?: string;
}

/**
 * Resolves a slug to a display string. Falls back to the raw `networkId` when
 * the resolver is absent or returns empty — never throws, never guesses (INV-196).
 */
export function networkDisplayName(networkId: string, resolveLabel?: NetworkLabelResolver): string {
  const resolved = resolveLabel?.(networkId)?.trim();
  return resolved || networkId;
}

const CROSS_NETWORK_FALLBACK_GENERIC_MESSAGE =
  'Name not found on the connected network, but found on another network.';

/**
 * Mechanism-neutral disclaimer when a resolution succeeded via cross-network
 * L1 miss-fallback. NOT part of the SF-1 error taxonomy — informational only.
 *
 * Interpolation when both names are non-empty; generic fallback otherwise (INV-198).
 */
export function nameResolutionCrossNetworkFallbackMessage(
  _ctx: CrossNetworkFallbackNetworks,
  names?: Pick<CrossNetworkFallbackMessageContext, 'queriedNetworkName' | 'resolvedNetworkName'>
): string {
  const queriedName = names?.queriedNetworkName?.trim();
  const resolvedName = names?.resolvedNetworkName?.trim();

  // INV-198: interpolate only when both humanized names are present.
  if (queriedName && resolvedName) {
    return `Name not found on ${queriedName}, but found on ${resolvedName}.`;
  }

  // INV-199: generic template never embeds raw slugs.
  return CROSS_NETWORK_FALLBACK_GENERIC_MESSAGE;
}

/**
 * Builds the optional name pair for {@link nameResolutionCrossNetworkFallbackMessage}.
 * When a resolver is wired, both labels must resolve or callers get generic copy (INV-198).
 * When absent, repo slugs are passed for interpolated copy (INV-170).
 */
export function crossNetworkFallbackMessageNames(
  networks: CrossNetworkFallbackNetworks,
  resolveLabel?: NetworkLabelResolver
): Pick<CrossNetworkFallbackMessageContext, 'queriedNetworkName' | 'resolvedNetworkName'> {
  if (resolveLabel) {
    return {
      queriedNetworkName: resolveLabel(networks.queriedOnNetworkId)?.trim(),
      resolvedNetworkName: resolveLabel(networks.resolvedOnNetworkId)?.trim(),
    };
  }

  return {
    queriedNetworkName: networks.queriedOnNetworkId,
    resolvedNetworkName: networks.resolvedOnNetworkId,
  };
}
