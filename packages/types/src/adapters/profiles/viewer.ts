import type { EcosystemRuntime } from '../runtime';
import type { DeclarativeEcosystemRuntime } from './declarative';

/**
 * Runtime shape for the **viewer** profile — Tier 1 plus contract loading, schema, mapping, and read queries.
 */
export type ViewerEcosystemRuntime = DeclarativeEcosystemRuntime &
  Required<Pick<EcosystemRuntime, 'contractLoading' | 'schema' | 'typeMapping' | 'query'>>;
