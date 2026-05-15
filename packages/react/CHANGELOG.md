# @openzeppelin/ui-react

## 3.0.0

### Major Changes

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
- Updated dependencies [[`5fc43ce`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/5fc43cead09bff7a54951c2cd9911641158017b9), [`6f09f66`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/6f09f66fe3e647ae234bb507795e0caa362b29aa), [`f88f86b`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/f88f86bb9be61fdb42c58143164df7267671a027)]:
  - @openzeppelin/ui-types@3.0.0
  - @openzeppelin/ui-components@3.0.0
  - @openzeppelin/ui-utils@3.0.0

## 2.0.1

### Patch Changes

- [#116](https://github.com/OpenZeppelin/openzeppelin-ui/pull/116) [`092a0f7`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/092a0f72f7e0ba9edeafe9623d1579c8d6cf3bad) Thanks [@pasevin](https://github.com/pasevin)! - Prevent infinite retry loop in RuntimeProvider when adapter loading fails

  When `resolveRuntime` rejected (e.g. due to a peer-dependency version mismatch),
  the provider would remove the network from `loadingNetworks`, which re-memoised
  `getRuntimeForNetwork`, which re-triggered the consumer's effect, restarting the
  failed load indefinitely. A `failedNetworksRef` now tracks permanently-failed
  networks so they are not retried. The set resets when `resolveRuntime` changes,
  allowing recovery after the host app fixes the underlying issue.

## 2.0.0

### Major Changes

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
- Updated dependencies [[`52f2823`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/52f2823734d1a123b607f1ce8804b0f6d57cf728), [`52f2823`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/52f2823734d1a123b607f1ce8804b0f6d57cf728), [`52f2823`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/52f2823734d1a123b607f1ce8804b0f6d57cf728)]:
  - @openzeppelin/ui-types@2.0.0
  - @openzeppelin/ui-components@2.0.0
  - @openzeppelin/ui-utils@2.0.0

## 1.2.0

### Minor Changes

- [#96](https://github.com/OpenZeppelin/openzeppelin-ui/pull/96) [`b7f6eb5`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/b7f6eb5d8c1c0a0090f8cc22370c1c397435d71a) Thanks [@pasevin](https://github.com/pasevin)! - Add VERSION export to all public packages for runtime peer compatibility validation. Each package now exports a `VERSION` constant that reflects the package version at build time, enabling consuming libraries (such as adapters) to verify compatible versions are installed and throw actionable errors on mismatch.

### Patch Changes

- Updated dependencies [[`b7f6eb5`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/b7f6eb5d8c1c0a0090f8cc22370c1c397435d71a)]:
  - @openzeppelin/ui-components@1.7.0
  - @openzeppelin/ui-types@1.12.0
  - @openzeppelin/ui-utils@1.4.0

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
  - @openzeppelin/ui-utils@1.1.0

## 1.0.1

### Patch Changes

- [#19](https://github.com/OpenZeppelin/openzeppelin-ui/pull/19) [`1ffc0ac`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/1ffc0ac13b5a904ce49a393047075c6a7e17aa71) Thanks [@pasevin](https://github.com/pasevin)! - Fix React context mismatch when adapters bundle their own copy of ui-react

  Implements the Shared Global Context Pattern for WalletStateContext, storing the React context on globalThis to ensure a single instance is shared across all module loads. This prevents "useWalletState must be used within a WalletStateProvider" errors when bundlers (like Vite's optimizeDeps) inline transitive dependencies.
