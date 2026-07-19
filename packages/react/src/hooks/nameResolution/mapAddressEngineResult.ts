import type { ResolvedName } from '@openzeppelin/ui-types';

import { type EngineResult, type UseResolveAddressResult } from './resolutionState';

/**
 * Remap the engine's generic `input` to `address` (INV-24). A `debouncing` arm —
 * only reachable when a caller passes a non-zero reverse `debounceMs` — collapses
 * to `loading` so {@link UseResolveAddressResult} keeps no `debouncing` variant.
 */
export function mapAddressEngineResult(
  engine: EngineResult<ResolvedName>
): UseResolveAddressResult {
  switch (engine.status) {
    case 'idle':
      return { status: 'idle' };
    case 'debouncing':
    case 'loading':
      return { status: 'loading', address: engine.input };
    case 'resolved':
      return { status: 'resolved', address: engine.input, data: engine.data };
    case 'error':
      return { status: 'error', address: engine.input, error: engine.error, retry: engine.retry };
  }
}
