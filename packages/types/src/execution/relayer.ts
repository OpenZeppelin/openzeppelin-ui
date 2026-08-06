import type { WriteCompletionOptions } from './write-completion';

export interface RelayerDetails {
  relayerId: string;
  name: string;
  address: string;
  network: string;
  paused: boolean;
}

export interface RelayerDetailsRich extends RelayerDetails {
  systemDisabled: boolean;
  balance?: string;
  nonce?: string;
  pendingTransactionsCount?: number;
  lastConfirmedTransactionTimestamp?: string;
}

export interface RelayerExecutionConfig {
  method: 'relayer';
  serviceUrl: string;
  relayer: RelayerDetails;
  /**
   * Known completion keys (`completion`, `onSubmitted`) are typed; residual keys
   * remain passthrough so existing callers keep compiling.
   */
  transactionOptions?: WriteCompletionOptions & Record<string, unknown>;
}
