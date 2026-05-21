import type { ContractFunction, ContractSchema } from '../../contracts/schema';
import type { RuntimeCapability } from '../runtime';
import type { FunctionDecorationsMap } from '../ui-enhancements';

/**
 * **Tier 2** — Contract schema introspection: writable vs view functions, decorations, auto-query filtering.
 *
 * Extends `RuntimeCapability`. Absorbs `isViewFunction` (and related helpers) from the removed
 * `ContractStateCapabilities` interface.
 */
export interface SchemaCapability extends RuntimeCapability {
  /**
   * Returns state-mutating functions from a loaded contract schema.
   *
   * @param contractSchema - Loaded {@link ContractSchema}.
   */
  getWritableFunctions(contractSchema: ContractSchema): ContractSchema['functions'];

  /**
   * Whether the function is read-only (view/pure) for this ecosystem.
   *
   * @param functionDetails - Function entry from the schema.
   */
  isViewFunction(functionDetails: ContractFunction): boolean;

  /**
   * Optional filter for view functions that are safe to auto-query without user parameters.
   */
  filterAutoQueryableFunctions?(functions: ContractFunction[]): ContractFunction[];

  /**
   * Optional per-function UI decorations (badges, notes).
   */
  getFunctionDecorations?(): Promise<FunctionDecorationsMap | undefined>;
}
