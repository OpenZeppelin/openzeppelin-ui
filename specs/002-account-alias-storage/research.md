# Research: Account Alias Storage

**Feature**: 002-account-alias-storage  
**Date**: 2026-02-03

## Overview

This document records design decisions and research findings for the Account Alias Storage plugin.

---

## Decision 1: Plugin Architecture Pattern

**Decision**: Extend `EntityStorage` base class for the main `AliasStorage` implementation.

**Rationale**:

- `EntityStorage` already provides CRUD operations, timestamps, ID generation, and quota handling
- Alias records naturally fit the entity model (id, createdAt, updatedAt + domain fields)
- Reduces code duplication and ensures consistency with other storage consumers
- Existing tests and patterns can be referenced for implementation

**Alternatives Considered**:

- **KeyValueStorage**: Rejected because aliases need bidirectional lookup (by address AND by name), which doesn't fit key-value semantics cleanly
- **Custom implementation**: Rejected because it would duplicate EntityStorage functionality without benefit
- **Separate plugin package**: Rejected because spec requires it within the storage package for simplicity

---

## Decision 2: Duplicate Alias Name Detection Strategy

**Decision**: Use Dexie's `where().equals()` to check for existing alias names before save/update operations.

**Rationale**:

- Index on `alias` field enables O(log n) lookup for duplicate detection
- Check happens synchronously within the save transaction for consistency
- Callback invocation (warn mode) happens after successful detection but before final write

**Alternatives Considered**:

- **Unique index constraint**: Rejected because it doesn't support configurable modes (would always fail on duplicates)
- **Post-save detection**: Rejected because it would require rollback logic and is more complex
- **Application-level caching**: Rejected because it adds memory overhead and sync complexity

---

## Decision 3: Composite Key for Multi-Network Support

**Decision**: Use Dexie compound index on `[address+networkId]` for uniqueness, with upsert semantics via `table.put()`.

**Rationale**:

- Products support multiple ecosystems and networks; same address may exist on different networks
- Users may want different aliases per network (e.g., "Treasury Mainnet" vs "Treasury Polygon")
- ENS supports chain-specific resolutions; an address may have different ENS names per chain
- Compound key `[address+networkId]` allows one alias per (address, network) pair
- `undefined` networkId represents a "global" alias (not network-specific)

**NetworkId Format**: Matches `NetworkConfig.id` pattern from `@openzeppelin/ui-types`:

- EVM: `ethereum-mainnet`, `polygon-mainnet`, `arbitrum-mainnet`
- Stellar: `stellar-mainnet`, `stellar-testnet`
- Solana: `solana-mainnet-beta`, `solana-devnet`
- Midnight: `midnight-testnet`
- Polkadot: `polkadot-hub`, `polkadot-moonbeam-mainnet`

**Alternatives Considered**:

- **Address-only uniqueness**: Rejected because it doesn't support multi-network scenarios where users need different aliases per network
- **NetworkId in metadata**: Rejected because it would require complex filtering and wouldn't enforce uniqueness properly
- **Separate tables per network**: Rejected because it complicates queries and import/export
- **Numeric chainId for EVM**: Rejected because it's not ecosystem-agnostic; `NetworkConfig.id` provides consistent string-based identification across all ecosystems

---

## Decision 3a: NetworkId as Optional Field

**Decision**: Make `networkId` optional (undefined = global alias).

**Rationale**:

- Backward compatibility: existing code without networkId continues to work
- Simpler API for single-network applications
- Global aliases are useful when users want the same alias across all networks
- Empty string networkId is normalized to `undefined` for consistency

**Alternatives Considered**:

- **Required networkId**: Rejected because it breaks simplicity for single-network use cases
- **Default networkId value**: Rejected because there's no sensible default across all ecosystems

---

## Decision 4: React Hook Implementation

**Decision**: Use `createRepositoryHook` factory from existing React utilities.

**Rationale**:

- Provides live queries, CRUD operations, and file I/O integration out of the box
- Consistent API with other storage consumers in the ecosystem
- Reduces custom code and ensures patterns match existing hooks

**Alternatives Considered**:

- **Custom hooks from scratch**: Rejected because it would duplicate createRepositoryHook functionality
- **Direct useLiveQuery usage**: Works but provides less functionality than the full repository hook

---

## Decision 5: Metadata Field Storage

**Decision**: Store metadata as JSON-serializable object in a single `metadata` field.

**Rationale**:

- Flexible enough to store any implementer-defined data
- No schema changes needed when metadata structure changes
- IndexedDB handles object serialization natively via Dexie

**Alternatives Considered**:

- **Separate metadata table**: Rejected because it complicates queries and joins
- **Typed metadata with generics**: Considered but adds complexity; type safety at storage level is optional

---

## Decision 6: Plugin Export Strategy

**Decision**: Export plugin from main package index under `@openzeppelin/ui-storage` with dedicated plugin re-exports.

**Rationale**:

- Simple import: `import { createAliasStorage } from '@openzeppelin/ui-storage'`
- Alternative import for isolation: `import { createAliasStorage } from '@openzeppelin/ui-storage/plugins/account-alias'`
- Follows package.json `exports` pattern for tree-shaking

**Alternatives Considered**:

- **Only sub-path export**: Rejected because it's less discoverable and breaks the "3 lines of code" success criterion
- **Separate npm package**: Rejected per spec requirement to be within storage package

---

## Decision 7: Logging Integration

**Decision**: Use `logger` from `@openzeppelin/ui-utils` with configurable enable/disable via options.

**Rationale**:

- Constitution requires using `logger`, not `console`
- Existing EntityStorage and KeyValueStorage use the same logger
- Configurable via `enableLogging` option per spec

**Alternatives Considered**:

- **No logging**: Rejected because observability was identified as important during clarification
- **Custom logger interface**: Rejected because existing logger is sufficient and consistent

---

## Decision 8: Schema Version Strategy

**Decision**: Provide a schema definition object that implementers merge into their database versions.

**Rationale**:

- Implementers control their database versioning
- Plugin schema can be added to any version number
- Follows existing `createDexieDatabase` patterns

**Schema Definition**:

```typescript
export const ALIAS_SCHEMA = {
  aliases: '++id, [address+networkId], address, networkId, alias, createdAt, updatedAt',
};
```

**Index Strategy**:

- `++id`: Auto-increment primary key
- `[address+networkId]`: Compound unique index (enforces one alias per address+network pair)
- `address`: Non-unique index (for finding all aliases for an address)
- `networkId`: Non-unique index (for filtering by network)
- `alias`: Non-unique index (allows duplicate alias names in "allow" mode)
- `createdAt`, `updatedAt`: Indexed for sorting/filtering

---

## Decision 9: ENS and Network-Specific Features

**Decision**: ENS resolution, smart account detection, and other network-specific features are explicitly out of scope.

**Rationale**:

- Constitution requires chain-agnostic design (no blockchain SDK dependencies)
- ENS names can change over time; storing them would require sync logic
- Smart account detection requires network-specific RPC calls
- These features belong in the adapter layer (ui-builder) where chain SDKs are available

**What Plugin Provides**:

- Storage for `networkId` as a plain string matching `NetworkConfig.id` pattern
- `metadata` field for implementer-defined context (e.g., `isSmartAccount`, `accountType`)

**What Implementer Does**:

- Resolve ENS at display time using adapters
- Detect smart accounts using adapters
- Store network-specific context in `metadata` if needed
- Obtain `networkId` from `NetworkConfig.id` via the adapter layer

---

## Unresolved Items

None. All technical decisions have been made.

---

## References

- Existing `EntityStorage` implementation: `packages/storage/src/base/EntityStorage.ts`
- Existing `createRepositoryHook`: `packages/storage/src/react/createRepositoryHook.ts`
- Dexie documentation: https://dexie.org/docs/
