---
'@openzeppelin/ui-types': minor
---

Add the shared write-completion vocabulary and widen `IRSCapability.deployOnchainId` to a
completion-keyed result.

**New exports**

- `WriteCompletion` — `'submitted' | 'confirmed'`. How far a write must progress before the
  capability call resolves; absent ≡ `'confirmed'`, so today's behaviour is unchanged.
- `WriteCompletionOptions` — the known keys (`completion`, `onSubmitted`) for
  `RelayerExecutionConfig.transactionOptions`.
- `DeployOnchainIdConfirmedResult` / `DeployOnchainIdSubmittedResult` /
  `DeployOnchainIdOutcome` — the completion-keyed union returned by `deployOnchainId`.

**`RelayerExecutionConfig.transactionOptions`** is now typed as known-keys-plus-passthrough
(`WriteCompletionOptions & Record<string, unknown>`). Known keys become compile-checked across
consumers and adapters; residual keys remain passthrough, so existing callers keep compiling.

**`IRSCapability.deployOnchainId` now returns `Promise<DeployOnchainIdOutcome>`** instead of
`Promise<DeployOnchainIdResult>`.

This is the migration-relevant change. `DeployOnchainIdResult` is unchanged and still exported —
it is the confirmed arm's base — but the method's return type is now a union, because on the
submit-only path the ONCHAINID address does not exist yet. The submit-only arm therefore has
**no `onchainId` property at all** rather than an optional `onchainId?: string` on one shared
shape, so a caller cannot read a fabricated or empty address without narrowing first.

Migration — narrow on `completion` before reading `onchainId`:

```ts
// Before
const { onchainId } = await irs.deployOnchainId({ holder }, executionConfig);
use(onchainId);

// After
const outcome = await irs.deployOnchainId({ holder }, executionConfig);
if (outcome.completion === 'confirmed') {
  use(outcome.onchainId); // required on this arm
} else {
  // submit-only: persist outcome.id and resolve the address on resume
  // (e.g. via findIdentityByWallet once the deployment is mined)
}
```

Callers that never request submit-only still only ever receive the `'confirmed'` arm at runtime,
so the narrowing is the only change required. Code that already destructured `onchainId`
directly will now fail to compile until the check above is added — that is intentional, and is
what prevents a submit-only deploy from silently yielding an undefined address.

Vocabulary and result shapes only: receipt-waiting, IRS / ERC-3643 behaviour, and per-operation
semantics stay in the adapters.
