import type { CreateRuntimeOptions, NameResolutionRuntimeOptions } from '@openzeppelin/ui-types';

/** Safe default: miss-fallback OFF; no uiKit override. INV-204 */
export const DEFAULT_RUNTIME_CREATION_CONFIG: CreateRuntimeOptions = {};

/**
 * Normalizes the opt-in flag to the adapter's strict-enable contract.
 * UIKit uses this at the threading boundary so `false` and `undefined` never
 * emit `enableMainnetL1MissFallback: false` into adapter options (absent = OFF).
 */
export function isMainnetL1MissFallbackEnabled(options?: NameResolutionRuntimeOptions): boolean {
  return options?.enableMainnetL1MissFallback === true; // INV-206
}

/**
 * Builds the `createRuntime` options bag for adapter threading.
 * When OFF, `nameResolution` is omitted (INV-207). When ON, spreads only
 * `{ enableMainnetL1MissFallback: true }` (INV-208).
 */
export function buildCreateRuntimeOptions(options?: CreateRuntimeOptions): CreateRuntimeOptions {
  return {
    ...(options?.uiKit !== undefined ? { uiKit: options.uiKit } : {}),
    ...(isMainnetL1MissFallbackEnabled(options?.nameResolution)
      ? { nameResolution: { enableMainnetL1MissFallback: true as const } }
      : {}),
  };
}
