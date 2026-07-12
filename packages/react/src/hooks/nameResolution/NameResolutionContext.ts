import type { QueryClient } from '@tanstack/react-query';
import { createContext, useContext, type Context } from 'react';

import {
  DEFAULT_CONFIG,
  getDefaultResolutionQueryClient,
  type ResolutionConfig,
} from './resolutionConfig';

/**
 * Value carried by {@link NameResolutionContext}: the owned QueryClient (passed
 * explicitly to `useQuery`, never via an ambient `QueryClientProvider`) and the
 * merged resolution config.
 */
export interface NameResolutionContextValue {
  /** OWNED resolution QueryClient, passed explicitly to `useQuery` (INV-48). */
  readonly queryClient: QueryClient;
  /** Effective config (Provider overrides merged over {@link DEFAULT_CONFIG}). */
  readonly config: ResolutionConfig;
}

/**
 * Process-global key for the context object. Uses `Symbol.for` so all duplicated
 * module instances share ONE React context — the same cross-bundle-singleton
 * pattern as `WalletStateContext` (bundler pre-bundling / npm-installed adapters).
 */
const CONTEXT_KEY = Symbol.for('@openzeppelin/ui-react/NameResolutionContext');

interface GlobalWithResolutionContext {
  [CONTEXT_KEY]?: Context<NameResolutionContextValue | null>;
}

function getOrCreateSharedContext(): Context<NameResolutionContextValue | null> {
  const globalScope = globalThis as GlobalWithResolutionContext;
  if (!globalScope[CONTEXT_KEY]) {
    globalScope[CONTEXT_KEY] = createContext<NameResolutionContextValue | null>(null);
  }
  return globalScope[CONTEXT_KEY];
}

/**
 * React context for resolution. `null` default triggers the module-singleton
 * fallback in {@link useNameResolutionContext} — no Provider is required (INV-48).
 */
export const NameResolutionContext = getOrCreateSharedContext();

/**
 * Stable fallback value used when no Provider is mounted. Cached per module so the
 * returned reference is referentially stable across renders (INV-38); it wraps the
 * process-global default client, so caches are still shared even across bundles.
 */
let fallbackValue: NameResolutionContextValue | undefined;

function getFallbackContextValue(): NameResolutionContextValue {
  if (!fallbackValue) {
    fallbackValue = {
      queryClient: getDefaultResolutionQueryClient(),
      config: DEFAULT_CONFIG,
    };
  }
  return fallbackValue;
}

/**
 * Read the resolution context, falling back to the zero-wiring default (global
 * singleton client + {@link DEFAULT_CONFIG}) when no `NameResolutionProvider` is
 * mounted (INV-48). Never throws for a missing provider.
 *
 * @returns The active {@link NameResolutionContextValue}.
 */
export function useNameResolutionContext(): NameResolutionContextValue {
  return useContext(NameResolutionContext) ?? getFallbackContextValue();
}
