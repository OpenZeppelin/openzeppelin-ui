---
'@openzeppelin/ui-storage': minor
---

Add Account Alias Storage plugin for mapping blockchain addresses to human-readable names

- New `AliasStorage` class with full CRUD operations for address aliases
- Support for multi-network aliases (same address can have different aliases per network)
- Configurable duplicate handling modes: 'strict', 'warn', or 'allow'
- React hook integration via `createUseAliasStorage` with live reactive updates
- Import/export functionality for backup and migration
- Comprehensive error handling with typed error codes
- Full TypeScript support with JSDoc documentation
