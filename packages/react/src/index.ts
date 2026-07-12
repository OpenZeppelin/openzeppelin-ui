// Package version (injected at build time)
export { VERSION } from './version';

// Contexts and Providers
export {
  RuntimeContext,
  type RuntimeContextValue,
  type RuntimeRegistry,
} from './hooks/AdapterContext';
export { RuntimeProvider, type RuntimeProviderProps } from './hooks/AdapterProvider';
export { WalletStateContext, type WalletStateContextValue } from './hooks/WalletStateContext';
export { WalletStateProvider, type WalletStateProviderProps } from './hooks/WalletStateProvider';

// Analytics
export { AnalyticsContext, type AnalyticsContextValue } from './hooks/AnalyticsContext';
export { AnalyticsProvider, type AnalyticsProviderProps } from './hooks/AnalyticsProvider';
export { useAnalytics } from './hooks/useAnalytics';

// Consumer Hooks
export { useRuntimeContext } from './hooks/useAdapterContext';
export { useWalletState } from './hooks/WalletStateContext';
export { useWalletComponents } from './hooks/useWalletComponents';
export {
  useDerivedAccountStatus,
  type DerivedAccountStatus,
} from './hooks/useDerivedAccountStatus';
export {
  useDerivedSwitchChainStatus,
  type DerivedSwitchChainStatus,
} from './hooks/useDerivedSwitchChainStatus';
export { useDerivedChainInfo, type DerivedChainInfo } from './hooks/useDerivedChainInfo';
export {
  useDerivedConnectStatus,
  type DerivedConnectStatus,
} from './hooks/useDerivedConnectStatus';
export { useDerivedDisconnect, type DerivedDisconnectStatus } from './hooks/useDerivedDisconnect';
export { useWalletReconnectionHandler } from './hooks/useWalletReconnectionHandler';

// Name Resolution (ENS forward + reverse) — SF-2
export { useResolveName, type UseResolveNameOptions } from './hooks/nameResolution/useResolveName';
export {
  useResolveAddress,
  type UseResolveAddressOptions,
} from './hooks/nameResolution/useResolveAddress';
export type {
  NameResolutionStatus,
  UseResolveNameResult,
  UseResolveAddressResult,
} from './hooks/nameResolution/resolutionState';
export {
  NameResolutionProvider,
  type NameResolutionProviderProps,
} from './hooks/nameResolution/NameResolutionProvider';
export {
  NameResolutionContext,
  type NameResolutionContextValue,
  useNameResolutionContext,
} from './hooks/nameResolution/NameResolutionContext';
export { DEFAULT_CONFIG, type ResolutionConfig } from './hooks/nameResolution/resolutionConfig';
// SF-3: smart capability→context wiring for the ui-components NameResolver seam.
export { useRuntimeNameResolver } from './hooks/nameResolution/useRuntimeNameResolver';

// UI Components
export { WalletConnectionHeader } from './components/WalletConnectionHeader';
export { WalletConnectionUI, type WalletConnectionUIProps } from './components/WalletConnectionUI';
export {
  NetworkSwitchManager,
  type NetworkSwitchManagerProps,
} from './components/NetworkSwitchManager';
