/**
 * How far a write must progress before the capability call resolves.
 *
 * - `'confirmed'` (default when absent) — submit → confirm → verify (today's path)
 * - `'submitted'` — resolve as soon as submission is known; no post-submit verification
 */
export type WriteCompletion = 'submitted' | 'confirmed';

/**
 * Known completion keys for {@link RelayerExecutionConfig.transactionOptions}.
 *
 * Absent / undefined `completion` ≡ confirmed (default unchanged).
 * The adapter does **not** invoke `onSubmitted` — the strategy owns that hook.
 */
export interface WriteCompletionOptions {
  completion?: WriteCompletion;
  onSubmitted?: (relayerTxId: string) => void | Promise<void>;
}
