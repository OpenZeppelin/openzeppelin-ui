import type { ContractFunction, ContractSchema } from '../../contracts/schema';
import type { RuntimeCapability } from '../runtime';

/**
 * **Tier 2** — Read-only RPC: view function calls, result formatting, chain head.
 *
 * Extends `RuntimeCapability`. Absorbs `queryViewFunction` and `formatFunctionResult` from the
 * removed `ContractStateCapabilities` interface.
 */
export interface QueryCapability extends RuntimeCapability {
  /**
   * Execute a read-only contract call.
   *
   * @param contractAddress - Target contract.
   * @param functionId - Function identifier from the schema.
   * @param params - Positional arguments for the call.
   * @param contractSchema - Optional cached schema to avoid refetch.
   * @returns Raw decoded result (chain-specific).
   * @throws On RPC errors or reverts.
   */
  queryViewFunction(
    contractAddress: string,
    functionId: string,
    params?: unknown[],
    contractSchema?: ContractSchema
  ): Promise<unknown>;

  /**
   * Format a raw call result for display in the UI.
   *
   * @param result - Raw value from {@link QueryCapability.queryViewFunction}.
   * @param functionDetails - Function metadata used for formatting rules.
   */
  formatFunctionResult(
    result: unknown,
    functionDetails: ContractFunction
  ): string | Record<string, unknown>;

  /**
   * Current block or ledger height for expiration math and freshness checks.
   *
   * @throws When the RPC request fails.
   */
  getCurrentBlock(): Promise<number>;
}
