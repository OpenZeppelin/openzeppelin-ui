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

// UI Components
export { WalletConnectionHeader } from './components/WalletConnectionHeader';
export { WalletConnectionUI, type WalletConnectionUIProps } from './components/WalletConnectionUI';
export {
  NetworkSwitchManager,
  type NetworkSwitchManagerProps,
} from './components/NetworkSwitchManager';
