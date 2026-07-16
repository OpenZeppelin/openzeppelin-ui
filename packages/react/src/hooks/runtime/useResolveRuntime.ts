import { useMemo } from 'react';

import type { EcosystemExport } from '@openzeppelin/ui-types';

import {
  createResolveRuntime,
  type ResolveRuntimeFn,
  type ResolveRuntimeParams,
} from './createResolveRuntime';

/**
 * Memoized {@link createResolveRuntime} for React apps. Recompute when
 * `ecosystemDefinition`, `profile`, or opt-in posture change (INV-217, INV-222).
 *
 * Changing the returned function identity MUST trigger runtime registry flush
 * in {@link RuntimeProvider} (INV-218).
 */
export function useResolveRuntime(
  ecosystemDefinition: EcosystemExport,
  params: ResolveRuntimeParams
): ResolveRuntimeFn {
  const { profile, options } = params;
  const uiKit = options?.uiKit;
  const enableMainnetL1MissFallback = options?.nameResolution?.enableMainnetL1MissFallback;

  return useMemo(
    () =>
      createResolveRuntime(ecosystemDefinition, {
        profile,
        options: {
          ...(uiKit !== undefined ? { uiKit } : {}),
          ...(enableMainnetL1MissFallback === true
            ? { nameResolution: { enableMainnetL1MissFallback: true } }
            : {}),
        },
      }),
    [ecosystemDefinition, profile, uiKit, enableMainnetL1MissFallback]
  );
}
