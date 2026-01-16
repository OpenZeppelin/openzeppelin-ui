---
'@openzeppelin/ui-types': minor
'@openzeppelin/ui-react': minor
'@openzeppelin/ui-utils': minor
---

Add customization support for wallet components

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
