import type { ContractSchema } from '../../contracts/schema';
import type { ExecutionConfig } from '../../execution';
import type { FormFieldType } from '../../forms/form-field';
import type { TransactionStatusUpdate } from '../../transactions';
import type { ExecutionMethodDetail } from '../common';
import type { RuntimeCapability } from '../runtime';

/**
 * **Tier 3** — Transaction construction, signing/broadcast, execution validation.
 *
 * Extends `RuntimeCapability`.
 */
export interface ExecutionCapability extends RuntimeCapability {
  /**
   * Build an opaque transaction payload from form inputs.
   */
  formatTransactionData(
    contractSchema: ContractSchema,
    functionId: string,
    submittedInputs: Record<string, unknown>,
    fields: FormFieldType[]
  ): unknown;

  /**
   * Sign and broadcast (or submit via relayer) a prepared transaction.
   *
   * @param transactionData - Output of {@link ExecutionCapability.formatTransactionData}.
   * @param executionConfig - EOA, relayer, or multisig configuration.
   * @param onStatusChange - Status stream for UI progress.
   * @param runtimeApiKey - Optional session API key (e.g. relayer).
   * @param runtimeSecret - Optional per-execution secret (e.g. privacy circuits).
   * @returns Transaction hash / job id and optional decoded result.
   */
  signAndBroadcast: (
    transactionData: unknown,
    executionConfig: ExecutionConfig,
    onStatusChange: (status: string, details: TransactionStatusUpdate) => void,
    runtimeApiKey?: string,
    runtimeSecret?: string
  ) => Promise<{ txHash: string; result?: unknown }>;

  /**
   * Supported execution modes for this network / build.
   */
  getSupportedExecutionMethods(): Promise<ExecutionMethodDetail[]>;

  /**
   * Validate execution configuration before submit.
   *
   * @returns `true` or a user-facing error string.
   */
  validateExecutionConfig(config: ExecutionConfig): Promise<true | string>;

  /**
   * Optional waiter until a transaction is included / finalized.
   *
   * @param txHash - Hash from {@link ExecutionCapability.signAndBroadcast}.
   */
  waitForTransactionConfirmation?(txHash: string): Promise<{
    status: 'success' | 'error';
    receipt?: unknown;
    error?: Error;
  }>;
}
