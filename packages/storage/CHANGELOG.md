# @openzeppelin/ui-storage

## 1.2.0

### Minor Changes

- [#76](https://github.com/OpenZeppelin/openzeppelin-ui/pull/76) [`4e053d4`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/4e053d486ea5d0520bc8520f3d3b0f450e5b961c) Thanks [@pasevin](https://github.com/pasevin)! - Add `useAddressBookWidgetProps` bridge hook that returns spread-ready props for the `AddressBookWidget`, and export a new `useAliasEditCallbacks` hook for configuring alias edit behavior when integrating the address book storage hooks

- [#76](https://github.com/OpenZeppelin/openzeppelin-ui/pull/76) [`4e053d4`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/4e053d486ea5d0520bc8520f3d3b0f450e5b961c) Thanks [@pasevin](https://github.com/pasevin)! - Add `useAliasLabelResolver` hook for reactive address label resolution from alias storage. Returns an `AddressLabelResolver` that can be spread directly into `AddressLabelProvider` from ui-components, enabling automatic alias display across all `AddressDisplay` instances with zero call-site changes.

- [#76](https://github.com/OpenZeppelin/openzeppelin-ui/pull/76) [`4e053d4`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/4e053d486ea5d0520bc8520f3d3b0f450e5b961c) Thanks [@pasevin](https://github.com/pasevin)! - Add `getByNetworkIds` method to `AliasStorage` for efficient DB-level network filtering using Dexie indexed queries. Update `useAddressBookWidgetProps` to accept `filterNetworkIds` for reactive multi-network filtering.

- [#76](https://github.com/OpenZeppelin/openzeppelin-ui/pull/76) [`4e053d4`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/4e053d486ea5d0520bc8520f3d3b0f450e5b961c) Thanks [@pasevin](https://github.com/pasevin)! - Add `useAliasSuggestionResolver` hook for reactive address suggestion resolution from alias storage. Returns an `AddressSuggestionResolver` that can be spread directly into `AddressSuggestionProvider` from ui-components, enabling automatic autocomplete across all `AddressField` instances with zero call-site changes.

### Patch Changes

- Updated dependencies [[`c3cc7d1`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/c3cc7d1f5fa2a2c1663f0c54449f51f321d78919), [`c3cc7d1`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/c3cc7d1f5fa2a2c1663f0c54449f51f321d78919), [`c3cc7d1`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/c3cc7d1f5fa2a2c1663f0c54449f51f321d78919)]:
  - @openzeppelin/ui-types@1.11.0

## 1.1.0

### Minor Changes

- [#59](https://github.com/OpenZeppelin/openzeppelin-ui/pull/59) [`4a9d0b9`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/4a9d0b984f390d7bae694d02ee9503ee3c1fd221) Thanks [@pasevin](https://github.com/pasevin)! - Add Account Alias Storage plugin for mapping blockchain addresses to human-readable names
  - New `AliasStorage` class with full CRUD operations for address aliases
  - Support for multi-network aliases (same address can have different aliases per network)
  - Configurable duplicate handling modes: 'strict', 'warn', or 'allow'
  - React hook integration via `createUseAliasStorage` with live reactive updates
  - Import/export functionality for backup and migration
  - Comprehensive error handling with typed error codes
  - Full TypeScript support with JSDoc documentation
