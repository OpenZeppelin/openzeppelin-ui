import type { EcosystemRuntime } from '../runtime';

/**
 * Runtime shape for the **declarative** profile — Tier 1 capabilities only (no RPC, no wallet).
 */
export type DeclarativeEcosystemRuntime = Pick<
  EcosystemRuntime,
  'networkConfig' | 'addressing' | 'explorer' | 'networkCatalog' | 'uiLabels' | 'dispose'
>;
