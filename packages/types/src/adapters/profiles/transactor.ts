import type { EcosystemRuntime } from '../runtime';
import type { DeclarativeEcosystemRuntime } from './declarative';

/**
 * Runtime shape for the **transactor** profile — Tier 1–2 (except `query`) plus execution and wallet.
 */
export type TransactorEcosystemRuntime = DeclarativeEcosystemRuntime &
  Required<
    Pick<EcosystemRuntime, 'contractLoading' | 'schema' | 'typeMapping' | 'execution' | 'wallet'>
  >;
