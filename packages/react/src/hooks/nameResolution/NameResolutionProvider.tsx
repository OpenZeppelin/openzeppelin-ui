import type { QueryClient } from '@tanstack/react-query';
import { useMemo, type ReactNode } from 'react';

import { NameResolutionContext, type NameResolutionContextValue } from './NameResolutionContext';
import {
  DEFAULT_CONFIG,
  getDefaultResolutionQueryClient,
  type ResolutionConfig,
} from './resolutionConfig';

/**
 * Props for {@link NameResolutionProvider}. Mounting the Provider is OPTIONAL —
 * absent it, hooks use the module-singleton client and {@link DEFAULT_CONFIG}
 * (INV-48). Mount it only to override config or share the cache with an existing
 * QueryClient.
 */
export interface NameResolutionProviderProps {
  readonly children: ReactNode;
  /** Partial override of the default config (TTLs, debounce, retry count). Merged per-field. */
  readonly config?: Partial<ResolutionConfig>;
  /**
   * Inject a QueryClient to SHARE the resolution cache with the app / adapter
   * client (unified devtools / persistence). Omit for an isolated owned client.
   */
  readonly queryClient?: QueryClient;
}

/**
 * Optional provider that overrides resolution config and/or the QueryClient for
 * its subtree. It does NOT render a `QueryClientProvider`: the client is passed
 * explicitly to `useQuery` (INV-48), so no ambient react-query provider is needed.
 *
 * Config is merged field-by-field over {@link DEFAULT_CONFIG} (INV-30), and the
 * context value is memoized so a Provider re-render does not cascade to every hook
 * (INV-38).
 */
export function NameResolutionProvider({
  children,
  config,
  queryClient,
}: NameResolutionProviderProps): ReactNode {
  const value = useMemo<NameResolutionContextValue>(
    () => ({
      queryClient: queryClient ?? getDefaultResolutionQueryClient(),
      // INV-30: shallow per-field merge — a partial override never nulls unset knobs.
      config: { ...DEFAULT_CONFIG, ...config },
    }),
    [queryClient, config]
  );

  return <NameResolutionContext.Provider value={value}>{children}</NameResolutionContext.Provider>;
}
