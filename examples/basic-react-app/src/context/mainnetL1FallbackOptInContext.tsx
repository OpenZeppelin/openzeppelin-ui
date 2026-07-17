import { createContext, useContext } from 'react';

export interface MainnetL1FallbackOptInContextValue {
  readonly enabled: boolean;
  readonly setEnabled: (enabled: boolean) => void;
}

export const MainnetL1FallbackOptInContext = createContext<
  MainnetL1FallbackOptInContextValue | undefined
>(undefined);

/**
 * Example-app reference seam for mainnet-L1 miss-fallback opt-in wiring.
 * Integrators mirror this with their own config source (feature flag, settings, …).
 */
export function useMainnetL1FallbackOptIn(): MainnetL1FallbackOptInContextValue {
  const value = useContext(MainnetL1FallbackOptInContext);
  if (!value) {
    throw new Error('useMainnetL1FallbackOptIn must be used within AppProviders');
  }
  return value;
}
