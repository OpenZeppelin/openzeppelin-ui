# @openzeppelin/ui-utils

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
