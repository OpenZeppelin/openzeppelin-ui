# @openzeppelin/ui-types

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
