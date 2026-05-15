import type { UserExplorerConfig, UserRpcProviderConfig } from '../../config';
import type { RelayerDetails, RelayerDetailsRich } from '../../execution';
import type { NetworkServiceForm } from '../common';
import type { RuntimeCapability } from '../runtime';

/**
 * **Tier 3** — Relayer discovery, network service forms, and RPC/explorer connectivity checks.
 *
 * Extends `RuntimeCapability`.
 */
export interface RelayerCapability extends RuntimeCapability {
  /**
   * List relayers available on a service deployment.
   *
   * @param serviceUrl - Relayer HTTP endpoint.
   * @param accessToken - Bearer or API token.
   */
  getRelayers(serviceUrl: string, accessToken: string): Promise<RelayerDetails[]>;

  /**
   * Detailed metrics for a single relayer id.
   */
  getRelayer(
    serviceUrl: string,
    accessToken: string,
    relayerId: string
  ): Promise<RelayerDetailsRich>;

  /**
   * Dynamic forms for RPC, explorer, indexer, and other network services.
   */
  getNetworkServiceForms(): NetworkServiceForm[];

  /**
   * Validate user-edited service field values before persisting.
   */
  validateNetworkServiceConfig?(
    serviceId: string,
    values: Record<string, unknown>
  ): Promise<boolean>;

  /**
   * Connectivity probe for a saved service configuration.
   */
  testNetworkServiceConnection?(
    serviceId: string,
    values: Record<string, unknown>
  ): Promise<{
    success: boolean;
    latency?: number;
    error?: string;
  }>;

  /**
   * Validate RPC endpoint configuration.
   */
  validateRpcEndpoint?(rpcConfig: UserRpcProviderConfig): Promise<boolean>;

  /**
   * Measure RPC latency and basic health.
   */
  testRpcConnection?(rpcConfig: UserRpcProviderConfig): Promise<{
    success: boolean;
    latency?: number;
    error?: string;
  }>;

  /**
   * Validate explorer API configuration.
   */
  validateExplorerConfig?(explorerConfig: UserExplorerConfig): Promise<boolean>;

  /**
   * Measure explorer API health (e.g. API key validity).
   */
  testExplorerConnection?(explorerConfig: UserExplorerConfig): Promise<{
    success: boolean;
    latency?: number;
    error?: string;
  }>;

  /**
   * Default field values for proactive health checks when the user has not customized a service.
   *
   * @param serviceId - Stable service id from {@link RelayerCapability.getNetworkServiceForms}.
   */
  getDefaultServiceConfig(serviceId: string): Record<string, unknown> | null;
}
