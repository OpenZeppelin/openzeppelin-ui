# @openzeppelin/ui-types

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
