/**
 * Runtime creation options threaded into {@link EcosystemExport.createRuntime}.
 * Ecosystem adapters read relevant slices when composing capability factories.
 */

/**
 * Per-network name-resolution options threaded into adapter capability factories
 * at {@link EcosystemExport.createRuntime} time. Immutable for the lifetime of the
 * constructed capability instance.
 */
export interface NameResolutionRuntimeOptions {
  /**
   * When `true`, permits EVM mainnet-L1 miss-fallback after a **definitive**
   * bound-chain empty / NAME_NOT_FOUND-class miss on **both** forward and reverse
   * resolution (adapters `003` SF-1). When absent or `false`, adapter posture is OFF.
   *
   * Field name is **locked** to adapter `CreateNameResolutionOptions.enableMainnetL1MissFallback`
   * — do not alias in UIKit types.
   *
   * @remarks Only `=== true` enables miss-fallback. `undefined`, `false`, and any other
   * value are normalized to OFF at the adapter boundary (adapters INV-2 / INV-9).
   */
  readonly enableMainnetL1MissFallback?: boolean;
}

/**
 * Options passed to {@link EcosystemExport.createRuntime}. Ecosystem adapters read
 * relevant slices when composing capability factories.
 */
export interface CreateRuntimeOptions {
  /** Initial UI kit hint (existing — FR-017). */
  readonly uiKit?: string;

  /**
   * Name-resolution factory options (003 SF-4). Ecosystems without name resolution
   * ignore this slice. EVM adapter threads `enableMainnetL1MissFallback` into
   * `createNameResolution` when strictly `true`.
   */
  readonly nameResolution?: NameResolutionRuntimeOptions;
}
