# @openzeppelin/ui-utils

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
