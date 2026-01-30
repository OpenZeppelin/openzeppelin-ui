/**
 * Utilities for detecting and categorizing network service connection errors.
 * This module provides functions to identify when errors are caused by network
 * service failures (RPC, Explorer, Indexer, etc.) and determine which service
 * type was affected.
 */

/**
 * Common patterns that indicate a network service connection failure.
 * These patterns help distinguish network/service issues from other errors.
 */
export const SERVICE_ERROR_PATTERNS = [
  // General connection failures
  'failed to fetch',
  'network error',
  'connection refused',
  'timeout',
  'econnrefused',
  'fetch failed',
  'network request failed',
  'connection timeout',
  'unable to connect',
  'no response',
  'service unavailable',
  'could not connect',
  'connection failed',
  'network unavailable',
  'dns resolution failed',
  'socket hang up',
  'read econnreset',
  // HTTP error codes indicating service issues
  '503',
  '502',
  '504',
  '500',
  'gateway timeout',
  'bad gateway',
  'internal server error',
  // Service-specific patterns
  'rpc error',
  'rpc endpoint',
  'indexer',
  'explorer',
  'horizon',
  'api error',
  'rate limit',
  'too many requests',
  '429',
] as const;

/**
 * Known network service types with their display names.
 * Adapters can use any service ID, but these are common ones.
 */
export const SERVICE_DISPLAY_NAMES: Record<string, string> = {
  rpc: 'RPC Provider',
  explorer: 'Block Explorer',
  indexer: 'Indexer',
  horizon: 'Horizon API',
  'contract-definitions': 'Contract Definitions',
  soroban: 'Soroban RPC',
  graphql: 'GraphQL API',
  'proof-server': 'Proof Server',
  node: 'Node Provider',
};

/**
 * Patterns that suggest a specific service type caused the error.
 * More specific patterns take priority in the detection order.
 */
export const SERVICE_TYPE_HINTS: Array<{ patterns: string[]; serviceType: string }> = [
  // Indexer patterns - check first as they're more specific
  {
    patterns: ['indexer', 'graphql', 'subquery', 'subgraph', 'the graph'],
    serviceType: 'indexer',
  },
  // Explorer patterns
  {
    patterns: ['explorer', 'etherscan', 'blockscout', 'sourcify', 'polygonscan', 'bscscan'],
    serviceType: 'explorer',
  },
  // Stellar/Soroban patterns
  { patterns: ['horizon', 'stellar'], serviceType: 'horizon' },
  { patterns: ['soroban'], serviceType: 'soroban' },
  // RPC patterns - check last as it's the default
  {
    patterns: ['rpc', 'jsonrpc', 'json-rpc', 'eth_', 'web3', 'provider', 'node'],
    serviceType: 'rpc',
  },
];

/**
 * Checks if an error message indicates a network service connection failure.
 *
 * @param errorMessage The error message to check
 * @returns True if the error appears to be caused by a service connection issue
 *
 * @example
 * ```ts
 * isServiceConnectionError('Failed to fetch'); // true
 * isServiceConnectionError('Invalid address'); // false
 * ```
 */
export function isServiceConnectionError(errorMessage: string | null | undefined): boolean {
  if (!errorMessage) return false;
  const lowerCaseError = errorMessage.toLowerCase();
  return SERVICE_ERROR_PATTERNS.some((pattern) => lowerCaseError.includes(pattern));
}

/**
 * Attempts to determine which service type caused the error based on the error message.
 * Falls back to 'rpc' as the most common case for blockchain-related failures.
 *
 * @param errorMessage The error message to analyze
 * @returns The detected service type (e.g., 'rpc', 'explorer', 'indexer')
 *
 * @example
 * ```ts
 * detectServiceType('Indexer connection failed'); // 'indexer'
 * detectServiceType('Etherscan API error'); // 'explorer'
 * detectServiceType('RPC endpoint timeout'); // 'rpc'
 * detectServiceType('Unknown error'); // 'rpc' (default)
 * ```
 */
export function detectServiceType(errorMessage: string | null | undefined): string {
  if (!errorMessage) return 'rpc';

  const lowerCaseError = errorMessage.toLowerCase();

  for (const { patterns, serviceType } of SERVICE_TYPE_HINTS) {
    if (patterns.some((pattern) => lowerCaseError.includes(pattern))) {
      return serviceType;
    }
  }

  // Default to RPC since most blockchain operation issues are RPC-related
  return 'rpc';
}

/**
 * Gets a user-friendly display name for a service type.
 * Falls back to capitalizing the service ID if not found in known mappings.
 *
 * @param serviceType The service type identifier (e.g., 'rpc', 'explorer')
 * @returns A user-friendly display name (e.g., 'RPC Provider', 'Block Explorer')
 *
 * @example
 * ```ts
 * getServiceDisplayName('rpc'); // 'RPC Provider'
 * getServiceDisplayName('indexer'); // 'Indexer'
 * getServiceDisplayName('custom-service'); // 'Custom service'
 * ```
 */
export function getServiceDisplayName(serviceType: string): string {
  return (
    SERVICE_DISPLAY_NAMES[serviceType] ||
    serviceType.charAt(0).toUpperCase() + serviceType.slice(1).replace(/-/g, ' ')
  );
}

/**
 * Analyzes an error and returns detailed information about the service failure.
 *
 * @param errorMessage The error message to analyze
 * @returns Object containing detection results
 *
 * @example
 * ```ts
 * const result = analyzeServiceError('Indexer timeout');
 * // { isServiceError: true, serviceType: 'indexer', serviceName: 'Indexer' }
 * ```
 */
export function analyzeServiceError(errorMessage: string | null | undefined): {
  isServiceError: boolean;
  serviceType: string;
  serviceName: string;
} {
  const isServiceError = isServiceConnectionError(errorMessage);
  const serviceType = detectServiceType(errorMessage);
  const serviceName = getServiceDisplayName(serviceType);

  return {
    isServiceError,
    serviceType,
    serviceName,
  };
}
