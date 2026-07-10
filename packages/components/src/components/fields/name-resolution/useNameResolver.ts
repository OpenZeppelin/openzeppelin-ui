import { useContext } from 'react';

import { NameResolverContext, type NameResolverContextValue } from './context';

/**
 * Read the injected resolver context. Returns `null` when no
 * `NameResolverProvider` is mounted — the consuming field must then treat
 * every ENS branch as dead code (INV-82).
 *
 * @returns The extended context value, or `null` when no provider is mounted.
 */
export function useNameResolver(): NameResolverContextValue | null {
  return useContext(NameResolverContext);
}
