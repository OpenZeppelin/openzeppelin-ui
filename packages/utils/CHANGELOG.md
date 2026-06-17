# @openzeppelin/ui-utils

## 3.0.1

### Patch Changes

- [#161](https://github.com/OpenZeppelin/openzeppelin-ui/pull/161) [`adb3d75`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/adb3d7543158ae4d94fe74cb9bd1e9ea4adefeaa) Thanks [@pasevin](https://github.com/pasevin)! - Add network availability policy for hosted deployments: disable mainnet networks via `mainnet_networks_disabled`, per-network blocklist via `disabledNetworkIds`, shared resolution helpers, disabled `NetworkSelector` items, and a self-host notice banner.

- Updated dependencies [[`adb3d75`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/adb3d7543158ae4d94fe74cb9bd1e9ea4adefeaa)]:
  - @openzeppelin/ui-types@3.1.1

## 3.0.0

### Major Changes

- [#113](https://github.com/OpenZeppelin/openzeppelin-ui/pull/113) [`6f09f66`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/6f09f66fe3e647ae234bb507795e0caa362b29aa) Thanks [@pasevin](https://github.com/pasevin)! - Migrate shared UI packages from monolithic adapter APIs to capability-based runtime APIs.

  BREAKING CHANGE: shared component props, helper types, and React context exports now use
  narrow capability interfaces and runtime-oriented names instead of `ContractAdapter` and
  `FullContractAdapter` surfaces.

### Patch Changes

- Updated dependencies [[`5fc43ce`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/5fc43cead09bff7a54951c2cd9911641158017b9), [`6f09f66`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/6f09f66fe3e647ae234bb507795e0caa362b29aa), [`f88f86b`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/f88f86bb9be61fdb42c58143164df7267671a027)]:
  - @openzeppelin/ui-types@3.0.0

## 2.0.0

### Major Changes

- [#113](https://github.com/OpenZeppelin/openzeppelin-ui/pull/113) [`52f2823`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/52f2823734d1a123b607f1ce8804b0f6d57cf728) Thanks [@pasevin](https://github.com/pasevin)! - Migrate shared UI packages from monolithic adapter APIs to capability-based runtime APIs.

  BREAKING CHANGE: shared component props, helper types, and React context exports now use
  narrow capability interfaces and runtime-oriented names instead of `ContractAdapter` and
  `FullContractAdapter` surfaces.

### Patch Changes

- Updated dependencies [[`52f2823`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/52f2823734d1a123b607f1ce8804b0f6d57cf728), [`52f2823`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/52f2823734d1a123b607f1ce8804b0f6d57cf728), [`52f2823`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/52f2823734d1a123b607f1ce8804b0f6d57cf728)]:
  - @openzeppelin/ui-types@2.0.0

## 1.4.0

### Minor Changes

- [#96](https://github.com/OpenZeppelin/openzeppelin-ui/pull/96) [`b7f6eb5`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/b7f6eb5d8c1c0a0090f8cc22370c1c397435d71a) Thanks [@pasevin](https://github.com/pasevin)! - Add VERSION export to all public packages for runtime peer compatibility validation. Each package now exports a `VERSION` constant that reflects the package version at build time, enabling consuming libraries (such as adapters) to verify compatible versions are installed and throw actionable errors on mismatch.

### Patch Changes

- Updated dependencies [[`b7f6eb5`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/b7f6eb5d8c1c0a0090f8cc22370c1c397435d71a)]:
  - @openzeppelin/ui-types@1.12.0

## 1.3.0

### Minor Changes

- [#72](https://github.com/OpenZeppelin/openzeppelin-ui/pull/72) [`78c3ae9`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/78c3ae9247b743a6a6fa0805e5a6db2d99de411e) Thanks [@pasevin](https://github.com/pasevin)! - Add network service feature gate mechanism
  - Add optional `requiredFeature` property to `NetworkServiceForm` interface
  - Add `filterEnabledServiceForms()` utility that gates forms behind `AppConfigService` feature flags
  - Apply filtering in `NetworkSettingsDialog` to hide service tabs when the feature flag is not enabled

### Patch Changes

- Updated dependencies [[`78c3ae9`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/78c3ae9247b743a6a6fa0805e5a6db2d99de411e)]:
  - @openzeppelin/ui-types@1.10.0

## 1.2.2

### Patch Changes

- [#68](https://github.com/OpenZeppelin/openzeppelin-ui/pull/68) [`5bd3406`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/5bd3406e1c6a766bb95ca2b3571ff6e2c9066d01) Thanks [@pasevin](https://github.com/pasevin)! - Add `formatSecondsToReadable` to format a duration in seconds as a human-readable string (e.g. "1 day", "24 hours", "30 minutes").

## 1.2.1

### Patch Changes

- [#57](https://github.com/OpenZeppelin/openzeppelin-ui/pull/57) [`b62aab7`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/b62aab793843d25797717feba6b9a0630df9ebac) Thanks [@pasevin](https://github.com/pasevin)! - Add exactBytes validation for fixed-size bytes types (bytes32, bytes4, etc.) to properly validate exact byte length requirements

## 1.2.0

### Minor Changes

- [#48](https://github.com/OpenZeppelin/openzeppelin-ui/pull/48) [`0cb85e7`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/0cb85e720dbd8bbac660227d1213acad4247ff92) Thanks [@pasevin](https://github.com/pasevin)! - Added service error detection utilities for identifying and categorizing network service connection errors (RPC, Explorer, Indexer, etc.)

### Patch Changes

- Updated dependencies [[`0cb85e7`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/0cb85e720dbd8bbac660227d1213acad4247ff92)]:
  - @openzeppelin/ui-types@1.5.0

## 1.1.1

### Patch Changes

- [#43](https://github.com/OpenZeppelin/openzeppelin-ui/pull/43) [`2fece05`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/2fece05af7e8bb1fa6be12605b3c57e8b0bcf883) Thanks [@pasevin](https://github.com/pasevin)! - Update logger comments to reference tsdown instead of tsup after build tool migration

- Updated dependencies [[`c7a6a61`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/c7a6a61af83cda327c6b655936907ac709c199f3)]:
  - @openzeppelin/ui-types@1.4.0

## 1.1.0

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

### Patch Changes

- Updated dependencies [[`20856cf`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/20856cf7b7bfee4868ea12f1ace963e54049a93d)]:
  - @openzeppelin/ui-types@1.2.0
