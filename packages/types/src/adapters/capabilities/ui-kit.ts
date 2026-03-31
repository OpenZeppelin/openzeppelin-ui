import type React from 'react';

import type { RuntimeCapability } from '../runtime';
import type {
  AvailableUiKit,
  EcosystemReactUiProviderProps,
  EcosystemSpecificReactHooks,
  EcosystemWalletComponents,
  UiKitConfiguration,
} from '../ui-enhancements';

/**
 * **Tier 3** — UI kit configuration, React providers, facade hooks, and wallet chrome.
 *
 * Extends `RuntimeCapability`.
 */
export interface UiKitCapability extends RuntimeCapability {
  /**
   * Apply UI kit selection or partial overrides for subsequent provider/hook resolution.
   *
   * Passing an empty object is a valid way to initialize adapter-managed defaults before
   * resolving providers, hooks, or wallet components.
   *
   * @param config - Partial kit selection and opaque kit-specific options.
   * @param options - Optional loader for native config modules.
   */
  configureUiKit?(
    config: Partial<UiKitConfiguration>,
    options?: {
      loadUiKitNativeConfig?: (relativePath: string) => Promise<Record<string, unknown> | null>;
    }
  ): void | Promise<void>;

  /**
   * Root React provider composing ecosystem clients (e.g. wagmi) and optional third-party kit providers.
   */
  getEcosystemReactUiContextProvider?():
    | React.ComponentType<EcosystemReactUiProviderProps>
    | undefined;

  /**
   * Facade hooks that mirror underlying wallet libraries behind the provider.
   */
  getEcosystemReactHooks?(): EcosystemSpecificReactHooks | undefined;

  /**
   * Standard wallet UI primitives (connect button, account display, etc.).
   */
  getEcosystemWalletComponents?(): EcosystemWalletComponents | undefined;

  /**
   * Kits advertised as supported for this adapter build.
   */
  getAvailableUiKits(): Promise<AvailableUiKit[]>;

  /**
   * Optional relayer transaction options UI (gas controls, etc.).
   */
  getRelayerOptionsComponent?():
    | React.ComponentType<{
        options: Record<string, unknown>;
        onChange: (options: Record<string, unknown>) => void;
      }>
    | undefined;

  /**
   * Generate wallet config files to embed in exported applications.
   */
  getExportableWalletConfigFiles?(
    uiKitConfig?: UiKitConfiguration
  ): Promise<Record<string, string>>;
}
