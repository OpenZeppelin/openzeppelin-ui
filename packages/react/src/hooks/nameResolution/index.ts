// Internal barrel for the name-resolution hook surface. The curated public
// re-exports live in `packages/react/src/index.ts`.

// Public hooks
export { useResolveName, type UseResolveNameOptions } from './useResolveName';
export { useResolveAddress, type UseResolveAddressOptions } from './useResolveAddress';
export { useRuntimeNameResolver } from './useRuntimeNameResolver';

// Public result / status types
export type {
  NameResolutionStatus,
  UseResolveNameResult,
  UseResolveAddressResult,
} from './resolutionState';

// Provider + context
export { NameResolutionProvider, type NameResolutionProviderProps } from './NameResolutionProvider';
export {
  NameResolutionContext,
  type NameResolutionContextValue,
  useNameResolutionContext,
} from './NameResolutionContext';

// Config surface
export {
  DEFAULT_CONFIG,
  type ResolutionConfig,
  type ResolutionNamespace,
} from './resolutionConfig';

// Internal helpers exposed for the Tests stage (not re-exported from the package root).
export {
  buildResolutionKey,
  createResolutionQueryClient,
  getDefaultResolutionQueryClient,
  getRuntimeInstanceId,
  isTransientError,
} from './resolutionConfig';
export { ResolutionQueryError } from './resolutionState';
