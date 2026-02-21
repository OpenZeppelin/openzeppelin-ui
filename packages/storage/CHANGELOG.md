# @openzeppelin/ui-storage

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
