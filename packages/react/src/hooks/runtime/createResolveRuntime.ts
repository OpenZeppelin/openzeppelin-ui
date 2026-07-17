import type {
  CreateRuntimeOptions,
  EcosystemExport,
  EcosystemRuntime,
  NetworkConfig,
  ProfileName,
} from '@openzeppelin/ui-types';

import { buildCreateRuntimeOptions } from './runtimeCreationConfig';

export interface ResolveRuntimeParams {
  readonly profile: ProfileName;
  /** Merged over {@link DEFAULT_RUNTIME_CREATION_CONFIG} per field. */
  readonly options?: CreateRuntimeOptions;
}

export type ResolveRuntimeFn = (networkConfig: NetworkConfig) => Promise<EcosystemRuntime>;

/**
 * Build a `resolveRuntime` callback for {@link RuntimeProvider} that forwards
 * `CreateRuntimeOptions` to `ecosystemDefinition.createRuntime`.
 *
 * Does not cache — {@link RuntimeProvider} owns the per-network singleton registry.
 */
export function createResolveRuntime(
  ecosystemDefinition: EcosystemExport,
  params: ResolveRuntimeParams
): ResolveRuntimeFn {
  const { profile, options } = params;
  const mergedOptions = buildCreateRuntimeOptions(options);

  return (networkConfig: NetworkConfig) =>
    Promise.resolve(ecosystemDefinition.createRuntime(profile, networkConfig, mergedOptions));
}
