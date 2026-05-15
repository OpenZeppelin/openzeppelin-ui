import type { EcosystemRuntime } from '../runtime';
import type { DeclarativeEcosystemRuntime } from './declarative';

/**
 * Runtime shape for the **operator** profile — full Tier 2 plus execution, wallet, UI kit, and access control.
 */
export type OperatorEcosystemRuntime = DeclarativeEcosystemRuntime &
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
      | 'accessControl'
    >
  >;
