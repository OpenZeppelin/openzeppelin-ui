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

## Decision 3: Address Uniqueness Enforcement

**Decision**: Use Dexie index on `address` field with upsert semantics via `table.put()`.

**Rationale**:

- Spec requires exactly one alias per address with update-replaces behavior
- `put()` naturally handles upsert: inserts if new, updates if exists
- Index on address enables efficient lookup by address

**Alternatives Considered**:

- **Check-then-insert**: Rejected because it requires two operations and has race condition potential
- **Unique index with error handling**: Works but more complex than upsert semantics

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
export const aliasStorageSchema = {
  aliases: '++id, &address, alias, createdAt, updatedAt',
};
```

**Index Strategy**:

- `++id`: Auto-increment primary key
- `&address`: Unique index on address (enforces one alias per address)
- `alias`: Non-unique index (allows duplicate alias names in "allow" mode)
- `createdAt`, `updatedAt`: Indexed for sorting/filtering

---

## Unresolved Items

None. All technical decisions have been made.

---

## References

- Existing `EntityStorage` implementation: `packages/storage/src/base/EntityStorage.ts`
- Existing `createRepositoryHook`: `packages/storage/src/react/createRepositoryHook.ts`
- Dexie documentation: https://dexie.org/docs/
