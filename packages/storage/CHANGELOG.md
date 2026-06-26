# @openzeppelin/ui-storage

## 1.2.3

### Patch Changes

- [#171](https://github.com/OpenZeppelin/openzeppelin-ui/pull/171) [`0abe1fb`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/0abe1fb233d4f3ab1793fae873f79a9d4ec8a861) Thanks [@pasevin](https://github.com/pasevin)! - chore(deps): resolve Dependabot security alerts for transitive dependencies

  Update the workspace `pnpm` overrides so vulnerable transitive dependencies resolve to patched versions:
  - `protobufjs` &rarr; `^7.6.3` (was pinned to `^7.5.5`, still allowed `7.6.x` advisories)
  - `ws` &rarr; `^8.21.0` for the v8 line and `^7.5.11` for the v7 line (was `^8.20.1`)
  - `hono` &rarr; `^4.12.25`
  - `form-data` &rarr; `^4.0.6` (CRLF injection)
  - `ua-parser-js` &rarr; `^2.0.10` (ReDoS)
  - `js-yaml` (v4) &rarr; `^4.2.0` (quadratic-complexity DoS)
  - `uuid` &rarr; `^11.1.1` (missing buffer bounds check)
  - `esbuild` &rarr; `^0.28.1` (dev-server arbitrary file read)
  - `@babel/core` &rarr; `^7.29.6` (arbitrary file read via `sourceMappingURL`)

  `elliptic` (`<= 6.6.1`) has no published fix and remains; it is a low-severity advisory with no upstream patch available.

  These overrides only affect dependency resolution within this monorepo's lockfile and do not change the published packages' declared dependency ranges.

- Updated dependencies [[`0abe1fb`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/0abe1fb233d4f3ab1793fae873f79a9d4ec8a861)]:
  - @openzeppelin/ui-utils@3.1.1

## 1.2.2

### Patch Changes

- Updated dependencies [[`5fc43ce`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/5fc43cead09bff7a54951c2cd9911641158017b9), [`6f09f66`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/6f09f66fe3e647ae234bb507795e0caa362b29aa), [`f88f86b`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/f88f86bb9be61fdb42c58143164df7267671a027)]:
  - @openzeppelin/ui-types@3.0.0
  - @openzeppelin/ui-utils@3.0.0

## 1.2.1

### Patch Changes

- Updated dependencies [[`52f2823`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/52f2823734d1a123b607f1ce8804b0f6d57cf728), [`52f2823`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/52f2823734d1a123b607f1ce8804b0f6d57cf728), [`52f2823`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/52f2823734d1a123b607f1ce8804b0f6d57cf728)]:
  - @openzeppelin/ui-types@2.0.0
  - @openzeppelin/ui-utils@2.0.0

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
