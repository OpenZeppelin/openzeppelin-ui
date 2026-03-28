import type { Ecosystem, ExecutionConfig, TransactionSuccessPayload } from '@openzeppelin/ui-types';

/**
 * Normalizes adapter `txHash` for the success callback (non-empty trimmed string or omitted).
 */
export function normalizeTransactionSuccessHash(finalTxHash: unknown): string | undefined {
  if (finalTxHash == null) {
    return undefined;
  }
  const trimmed = String(finalTxHash).trim();
  return trimmed !== '' ? trimmed : undefined;
}

/**
 * Builds the {@link TransactionSuccessPayload} passed to `onTransactionSuccess`.
 */
export function buildTransactionSuccessPayload(options: {
  networkId: string;
  ecosystem: Ecosystem;
  executionMethod: ExecutionConfig['method'];
  finalTxHash: unknown;
}): TransactionSuccessPayload {
  const hash = normalizeTransactionSuccessHash(options.finalTxHash);
  return {
    network_id: options.networkId,
    ecosystem: options.ecosystem,
    execution_method: options.executionMethod,
    ...(hash !== undefined ? { transaction_hash: hash } : {}),
  };
}

/** Minimal logger surface used by {@link invokeOnTransactionSuccess}. */
export type TransactionSuccessLog = {
  error(component: string, message: string, error?: unknown): void;
};

/**
 * Invokes `onTransactionSuccess` with error containment: synchronous throws and async
 * rejections are logged and never rethrown, so host callbacks cannot break transaction flow.
 */
export function invokeOnTransactionSuccess(
  callback: ((payload: TransactionSuccessPayload) => void | Promise<void>) | undefined,
  payload: TransactionSuccessPayload,
  log: TransactionSuccessLog
): void {
  try {
    const maybePromise = callback?.(payload);
    void Promise.resolve(maybePromise).catch((error: unknown) => {
      log.error('TransactionForm', 'onTransactionSuccess callback rejected with an error', error);
    });
  } catch (error) {
    log.error('TransactionForm', 'onTransactionSuccess callback threw an error', error);
  }
}
