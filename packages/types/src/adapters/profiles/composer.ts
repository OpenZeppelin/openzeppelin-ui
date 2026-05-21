import type { EcosystemRuntime } from '../runtime';
import type { DeclarativeEcosystemRuntime } from './declarative';

/**
 * Runtime shape for the **composer** profile — full Tier 2 plus execution, wallet, UI kit, and relayer.
 */
export type ComposerEcosystemRuntime = DeclarativeEcosystemRuntime &
  Required<
    Pick<
      EcosystemRuntime,
      | 'contractLoading'
      | 'schema'
      | 'typeMapping'
      | 'query'
      | 'execution'
      | 'wallet'
      | 'uiKit'
      | 'relayer'
    >
  >;
