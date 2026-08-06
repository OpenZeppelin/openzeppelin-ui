# @openzeppelin/ui-types

## 3.5.0

### Minor Changes

- [#206](https://github.com/OpenZeppelin/openzeppelin-ui/pull/206) [`f2d90e3`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/f2d90e3da2924506a37eed42322d3400c9e9f265) Thanks [@pasevin](https://github.com/pasevin)! - Add the shared write-completion vocabulary and widen `IRSCapability.deployOnchainId` to a
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

## 3.4.0

### Minor Changes

- [#202](https://github.com/OpenZeppelin/openzeppelin-ui/pull/202) [`f0aee8b`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/f0aee8b713c2a421b517aaf00ddb24d58804053d) Thanks [@pasevin](https://github.com/pasevin)! - Extend `IRSCapability` with factory identity lookup, key-purpose probe, and holder management-key grant.

  Adds `getFactoryIdentity`, `hasIdentityKeyPurpose`, and `grantHolderManagementKey` with discriminated read results (`read_failed` distinct from negative answers). Aligns the shared capability contract with adapter-evm 2.4.0+ so consumers no longer need structural casts at the IRS boundary.

  **Breaking for implementors:** any external `IRSCapability` implementor must now provide all three members or fail to compile; consumers calling the capability are unaffected. No in-repo or in-adapters implementor is impacted today (only adapter-evm implements IRS, and it already ships these methods), so practical blast radius is limited to out-of-tree implementations.

## 3.3.0

### Minor Changes

- [#188](https://github.com/OpenZeppelin/openzeppelin-ui/pull/188) [`b4eab15`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/b4eab1593a31035a54368ae9a845c359377613dc) Thanks [@pasevin](https://github.com/pasevin)! - Add cross-network fallback provenance fields and runtime creation options (initiative 003, SF-1 + SF-4 types).

  `@openzeppelin/ui-types@3.3.0` extends the chain-agnostic base `ResolutionProvenance` with three additive optional readonly fields locked to the cross-repo adapters `003` contract: `resolvedViaNetworkFallback`, `queriedOnNetworkId`, and `resolvedOnNetworkId`. Network ids are present only when `resolvedViaNetworkFallback === true`. `scopedToNetworkId` remains orthogonal — L1-fallback hits keep absent scope per initiative `002` display parity. Existing consumers upgrading from `3.2.x` continue to compile without reading the new fields.

  Also adds `CreateRuntimeOptions` / `NameResolutionRuntimeOptions` with `enableMainnetL1MissFallback?: boolean` (default OFF when omitted) and threads the options bag through `EcosystemExport.createRuntime`'s additive third argument. Exports optional `NetworkLabelResolver` on `AddressNameResolver` for humanized cross-network disclaimer copy (SF-3 display seam).

## 3.2.0

### Minor Changes

- [#180](https://github.com/OpenZeppelin/openzeppelin-ui/pull/180) [`290dc8f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/290dc8f751247e3634e0ab9a6e580c2ef60a5d12) Thanks [@pasevin](https://github.com/pasevin)! - Add opt-in ENS name resolution to the AddressBookWidget. A new optional `enableNameResolution` flag (default `false`) gates both the Add-alias dialog's ENS-aware address field (auto-suggest alias from the resolved name) and per-row reverse-ENS display. When the flag is off, neither the dialog seam nor any row reverse-resolution provider mounts — no resolution calls and no `WalletStateProvider` required (backward-compatible default). When the flag is on without a wallet provider, resolution degrades gracefully (unsupported-network / hex fallback) rather than throwing. Existing manual-alias flows, search, and export/import (no auto re-resolution on import) are unchanged.

## 3.1.1

### Patch Changes

- [#161](https://github.com/OpenZeppelin/openzeppelin-ui/pull/161) [`adb3d75`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/adb3d7543158ae4d94fe74cb9bd1e9ea4adefeaa) Thanks [@pasevin](https://github.com/pasevin)! - Add network availability policy for hosted deployments: disable mainnet networks via `mainnet_networks_disabled`, per-network blocklist via `disabledNetworkIds`, shared resolution helpers, disabled `NetworkSelector` items, and a self-host notice banner.

## 3.1.0

### Minor Changes

- [#149](https://github.com/OpenZeppelin/openzeppelin-ui/pull/149) [`e5199a9`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/e5199a969cbbf0853c7e58b3d3bcaa0c1d216b52) Thanks [@pasevin](https://github.com/pasevin)! - Add RI capability domain types, typed error classes, and Tier 3 capability interfaces (ERC3643, ERC4626, IRS) for the tokenized-deposits POC.

## 3.0.0

### Major Changes

- [#113](https://github.com/OpenZeppelin/openzeppelin-ui/pull/113) [`5fc43ce`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/5fc43cead09bff7a54951c2cd9911641158017b9) Thanks [@pasevin](https://github.com/pasevin)! - BREAKING: Replace monolithic `ContractAdapter` with 13 capability interfaces, profile runtime types, `EcosystemRuntime`, `CapabilityFactoryMap`, and updated `EcosystemExport` (`capabilities` + `createRuntime`). Removes `ContractAdapter`, `FullContractAdapter`, and `ContractStateCapabilities`.

- [#113](https://github.com/OpenZeppelin/openzeppelin-ui/pull/113) [`6f09f66`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/6f09f66fe3e647ae234bb507795e0caa362b29aa) Thanks [@pasevin](https://github.com/pasevin)! - Migrate shared UI packages from monolithic adapter APIs to capability-based runtime APIs.

  BREAKING CHANGE: shared component props, helper types, and React context exports now use
  narrow capability interfaces and runtime-oriented names instead of `ContractAdapter` and
  `FullContractAdapter` surfaces.

### Patch Changes

- [#113](https://github.com/OpenZeppelin/openzeppelin-ui/pull/113) [`f88f86b`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/f88f86bb9be61fdb42c58143164df7267671a027) Thanks [@pasevin](https://github.com/pasevin)! - Fix local adapter development installs by resolving first-party workspace packages that are
  outside the public family package map. Derive pnpmfile family data from the canonical
  `STANDARD_FAMILIES` definition instead of maintaining a hardcoded duplicate. Also formalize
  partial `UiKitConfiguration` overrides in the public types and ensure wallet state initializes
  adapter-managed UI kits consistently.

## 2.0.0

### Major Changes

- [#113](https://github.com/OpenZeppelin/openzeppelin-ui/pull/113) [`52f2823`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/52f2823734d1a123b607f1ce8804b0f6d57cf728) Thanks [@pasevin](https://github.com/pasevin)! - BREAKING: Replace monolithic `ContractAdapter` with 13 capability interfaces, profile runtime types, `EcosystemRuntime`, `CapabilityFactoryMap`, and updated `EcosystemExport` (`capabilities` + `createRuntime`). Removes `ContractAdapter`, `FullContractAdapter`, and `ContractStateCapabilities`.

- [#113](https://github.com/OpenZeppelin/openzeppelin-ui/pull/113) [`52f2823`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/52f2823734d1a123b607f1ce8804b0f6d57cf728) Thanks [@pasevin](https://github.com/pasevin)! - Migrate shared UI packages from monolithic adapter APIs to capability-based runtime APIs.

  BREAKING CHANGE: shared component props, helper types, and React context exports now use
  narrow capability interfaces and runtime-oriented names instead of `ContractAdapter` and
  `FullContractAdapter` surfaces.

### Patch Changes

- [#113](https://github.com/OpenZeppelin/openzeppelin-ui/pull/113) [`52f2823`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/52f2823734d1a123b607f1ce8804b0f6d57cf728) Thanks [@pasevin](https://github.com/pasevin)! - Fix local adapter development installs by resolving first-party workspace packages that are
  outside the public family package map. Derive pnpmfile family data from the canonical
  `STANDARD_FAMILIES` definition instead of maintaining a hardcoded duplicate. Also formalize
  partial `UiKitConfiguration` overrides in the public types and ensure wallet state initializes
  adapter-managed UI kits consistently.

## 1.13.0

### Minor Changes

- [#100](https://github.com/OpenZeppelin/openzeppelin-ui/pull/100) [`4ef354a`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/4ef354a1c7da7c31e9ff0e18e617904c5029dc4c) Thanks [@pasevin](https://github.com/pasevin)! - Add optional `onTransactionSuccess` callback to `TransactionForm` so host apps can run side effects (for example analytics) when a transaction completes successfully. The callback receives `network_id`, `ecosystem`, `execution_method`, and optionally `transaction_hash` when the adapter provides one.

## 1.12.0

### Minor Changes

- [#96](https://github.com/OpenZeppelin/openzeppelin-ui/pull/96) [`b7f6eb5`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/b7f6eb5d8c1c0a0090f8cc22370c1c397435d71a) Thanks [@pasevin](https://github.com/pasevin)! - Add VERSION export to all public packages for runtime peer compatibility validation. Each package now exports a `VERSION` constant that reflects the package version at build time, enabling consuming libraries (such as adapters) to verify compatible versions are installed and throw actionable errors on mismatch.

## 1.11.1

### Patch Changes

- [#78](https://github.com/OpenZeppelin/openzeppelin-ui/pull/78) [`8c646a8`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/8c646a8859ffa8d37cb59499fb5695abd6cb2cb2) Thanks [@pasevin](https://github.com/pasevin)! - Add optional `title` prop to AddressBookWidget for customizable card header

## 1.11.0

### Minor Changes

- [#76](https://github.com/OpenZeppelin/openzeppelin-ui/pull/76) [`c3cc7d1`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/c3cc7d1f5fa2a2c1663f0c54449f51f321d78919) Thanks [@pasevin](https://github.com/pasevin)! - Add `AddressBookAlias` and `AddressBookWidgetProps` types for the address book widget interface. Includes props for network resolution, explorer URL generation, adapter-based validation, network filtering, and import/export support.

- [#76](https://github.com/OpenZeppelin/openzeppelin-ui/pull/76) [`c3cc7d1`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/c3cc7d1f5fa2a2c1663f0c54449f51f321d78919) Thanks [@pasevin](https://github.com/pasevin)! - Add `AddressLabelResolver` interface for generic address-to-label resolution. This type defines the contract consumed by `AddressLabelContext` in ui-components, enabling any address label source (alias storage, ENS, REST API) to integrate with `AddressDisplay`.

- [#76](https://github.com/OpenZeppelin/openzeppelin-ui/pull/76) [`c3cc7d1`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/c3cc7d1f5fa2a2c1663f0c54449f51f321d78919) Thanks [@pasevin](https://github.com/pasevin)! - Add `AddressSuggestion` and `AddressSuggestionResolver` interfaces for generic address autocomplete. Storage-agnostic types consumed by `AddressField` via `AddressSuggestionContext` in ui-components.

## 1.10.0

### Minor Changes

- [#72](https://github.com/OpenZeppelin/openzeppelin-ui/pull/72) [`78c3ae9`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/78c3ae9247b743a6a6fa0805e5a6db2d99de411e) Thanks [@pasevin](https://github.com/pasevin)! - Add network service feature gate mechanism
  - Add optional `requiredFeature` property to `NetworkServiceForm` interface
  - Add `filterEnabledServiceForms()` utility that gates forms behind `AppConfigService` feature flags
  - Apply filtering in `NetworkSettingsDialog` to hide service tabs when the feature flag is not enabled

## 1.9.0

### Minor Changes

- [#70](https://github.com/OpenZeppelin/openzeppelin-ui/pull/70) [`fb781d4`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fb781d4df95365b2ef184c893d6b39b38a2bc20e) Thanks [@pasevin](https://github.com/pasevin)! - Add EcosystemMetadata and EcosystemExport interfaces for self-describing adapters
  - `EcosystemMetadata`: display-oriented metadata (id, name, description, icon, styling, feature defaults)
  - `EcosystemExport`: full adapter definition (metadata, networks, adapter factory)
  - Remove unused `EcosystemInfo` and `EcosystemDefinition` types

## 1.8.0

### Minor Changes

- [#66](https://github.com/OpenZeppelin/openzeppelin-ui/pull/66) [`8cf2a51`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/8cf2a5197679a0fd4cd1899b0304525b7f8433ec) Thanks [@pasevin](https://github.com/pasevin)! - Add chain-agnostic capability flags, expiration metadata, and new service methods
  - Add optional capability flags to `AccessControlCapabilities`: `hasRenounceOwnership`, `hasRenounceRole`, `hasCancelAdminTransfer`, `hasAdminDelayManagement`
  - Add `ExpirationMetadata` interface with `mode` ('required' | 'none' | 'contract-managed'), `label`, `unit`, and `currentValue`
  - Add `AdminDelayInfo` interface and optional `delayInfo` field to `AdminInfo`
  - Add optional methods to `AccessControlService`: `renounceOwnership`, `renounceRole`, `cancelAdminTransfer`, `changeAdminDelay`, `rollbackAdminDelay`, `getExpirationMetadata`

## 1.7.0

### Minor Changes

- [#64](https://github.com/OpenZeppelin/openzeppelin-ui/pull/64) [`b09ca9c`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/b09ca9c8607e3c6f89ee7927a8419c8321c2db58) Thanks [@pasevin](https://github.com/pasevin)! - Add EVM access control support to unified types
  - Make `expirationBlock` optional in `PendingOwnershipTransfer` and `PendingAdminTransfer` (EVM has no expiration)
  - Make `expirationBlock` parameter `number | undefined` in `transferOwnership()` and `transferAdminRole()` signatures
  - Add `ADMIN_TRANSFER_CANCELED`, `ADMIN_DELAY_CHANGE_SCHEDULED`, `ADMIN_DELAY_CHANGE_CANCELED` to `HistoryChangeType`
  - Add `accessControlIndexerUrl` to `BaseNetworkConfig` for feature-specific indexer endpoints across all ecosystems

## 1.6.0

### Minor Changes

- [#60](https://github.com/OpenZeppelin/openzeppelin-ui/pull/60) [`c3750e6`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/c3750e6ea248959f29ae45fd20b1dfb76497d33f) Thanks [@pasevin](https://github.com/pasevin)! - Add new HistoryChangeType values for additional access control events
  - `ROLE_ADMIN_CHANGED`: Role's admin role was changed
  - `OWNERSHIP_RENOUNCED`: Ownership was renounced
  - `ADMIN_RENOUNCED`: Admin role was renounced (Stellar only)

## 1.5.0

### Minor Changes

- [#48](https://github.com/OpenZeppelin/openzeppelin-ui/pull/48) [`0cb85e7`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/0cb85e720dbd8bbac660227d1213acad4247ff92) Thanks [@pasevin](https://github.com/pasevin)! - Add `getDefaultServiceConfig` method to `ContractAdapter` interface

  This new required method enables adapters to provide default service configuration values for proactive network service health checks. The method returns the default endpoint values for a given service (e.g., RPC URL, indexer URLs) extracted from the network configuration.

  **New interface method:**

  ```typescript
  getDefaultServiceConfig(serviceId: string): Record<string, unknown> | null;
  ```

  This method is used by the UI Builder to test network service connectivity when a network is selected, displaying user-friendly error banners before users attempt operations that would fail due to service outages.

## 1.4.0

### Minor Changes

- [#45](https://github.com/OpenZeppelin/openzeppelin-ui/pull/45) [`c7a6a61`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/c7a6a61af83cda327c6b655936907ac709c199f3) Thanks [@pasevin](https://github.com/pasevin)! - Add Polkadot ecosystem support
  - Add 'polkadot' to Ecosystem union type
  - Add `isPolkadotEcosystem` type guard
  - Add `PolkadotNetworkConfig` interface extending EVM config with Polkadot-specific fields:
    - `executionType`: 'evm' | 'substrate' for future extensibility
    - `networkCategory`: 'hub' | 'parachain' for UI grouping
    - `relayChain`: optional 'polkadot' | 'kusama' identifier
  - Add `isPolkadotNetworkConfig` type guard
  - Add helper types: `PolkadotExecutionType`, `PolkadotNetworkCategory`, `PolkadotRelayChain`

## 1.3.0

### Minor Changes

- [#39](https://github.com/OpenZeppelin/openzeppelin-ui/pull/39) [`05084a4`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/05084a4608828c5cb926d8b92b5a32a879e29da1) Thanks [@pasevin](https://github.com/pasevin)! - Add `patchedDependencies` field to `AdapterConfig` interface to support adapter patch exports

## 1.2.0

### Minor Changes

- [#33](https://github.com/OpenZeppelin/openzeppelin-ui/pull/33) [`20856cf`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/20856cf7b7bfee4868ea12f1ace963e54049a93d) Thanks [@pasevin](https://github.com/pasevin)! - Add customization support for wallet components

  **@openzeppelin/ui-types:**
  - Add `WalletComponentSize` type (`'sm' | 'default' | 'lg' | 'xl'`)
  - Add `WalletComponentVariant` type (`'default' | 'outline' | 'ghost' | 'secondary'`)
  - Extend `BaseComponentProps` with `size`, `variant`, and `fullWidth` properties

  **@openzeppelin/ui-react:**
  - Add `useWalletComponents()` hook for direct access to adapter wallet components
  - Add `connectButtonProps`, `accountDisplayProps`, and `networkSwitcherProps` to `WalletConnectionUI`
  - Export `WalletConnectionUIProps` type

  **@openzeppelin/ui-utils:**
  - Add shared wallet component sizing utilities:
    - `getWalletButtonSizeProps()` - Maps size to button styling props
    - `getWalletAccountDisplaySizeProps()` - Maps size to account display styling
    - `getWalletNetworkSwitcherSizeProps()` - Maps size to network switcher styling
  - Export `WalletButtonSizeProps`, `WalletAccountDisplaySizeProps`, `WalletNetworkSwitcherSizeProps` types

## 1.1.0

### Minor Changes

- [#14](https://github.com/OpenZeppelin/openzeppelin-ui/pull/14) [`779a5fb`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/779a5fb82ae2611fb571f8015dae7a29177c4100) Thanks [@pasevin](https://github.com/pasevin)! - Add `getTypeMappingInfo()` method to ContractAdapter interface for runtime type introspection

  New types:
  - `DynamicTypePattern`: describes pattern-based type mappings (arrays, generics, etc.)
  - `TypeMappingInfo`: contains primitives and dynamicPatterns

  This enables consuming applications to programmatically discover all adapter type capabilities at runtime.
