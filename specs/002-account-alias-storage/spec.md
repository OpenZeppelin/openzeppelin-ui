# Feature Specification: Account Alias Storage

**Feature Branch**: `002-account-alias-storage`  
**Created**: 2026-02-03  
**Status**: Draft  
**Input**: User description: "Universal account address aliasing store. New plugin for the storage package allowing developers to link any account address to a custom alias name and utilize existing storage library capabilities."

## Clarifications

### Session 2026-02-03

- Q: Should AliasRecord support custom metadata beyond the fixed fields? → A: Allow optional `metadata` field that stores arbitrary JSON
- Q: How should the plugin support debugging/observability? → A: Use existing logger utility from `@openzeppelin/ui-utils`, configurable via options
- Q: Can an address have multiple aliases? → A: One alias per (address, networkId) pair - update always replaces existing alias for that combination
- Q: How should multi-chain scenarios be handled? → A: Add optional `networkId` field matching `NetworkConfig.id` pattern (e.g., `ethereum-mainnet`, `stellar-testnet`). Uniqueness is on `(address, networkId)` composite key. Same address on different networks can have different aliases. If `networkId` is undefined, it acts as a "global" alias fallback.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Create Address Alias (Priority: P1)

A developer integrating the storage package wants to assign a human-readable name to a blockchain account address so that users can easily identify and reference accounts without memorizing long hexadecimal strings.

**Why this priority**: This is the core functionality - without the ability to create aliases, the entire feature has no value. All other features depend on aliases existing.

**Independent Test**: Can be fully tested by creating an alias for an address and verifying it persists in storage, delivering immediate value for account identification.

**Acceptance Scenarios**:

1. **Given** an account address and an alias name, **When** the developer saves the alias, **Then** the alias is stored and can be retrieved by either the address or the alias name.
2. **Given** an alias name that already exists and duplicate mode is "strict", **When** the developer attempts to create another alias with the same name, **Then** the system rejects the operation with a clear error.
3. **Given** an alias name that already exists and duplicate mode is "warn", **When** the developer attempts to create another alias with the same name, **Then** the system allows the operation and invokes the configured warning callback.
4. **Given** an alias name that already exists and duplicate mode is "allow", **When** the developer attempts to create another alias with the same name, **Then** the system allows the operation without any warnings.
5. **Given** an address that already has an alias for a specific network, **When** the developer creates a new alias for the same address and network, **Then** the system updates the existing alias with the new name.
6. **Given** the same address on different networks, **When** the developer creates aliases for each network, **Then** each (address, networkId) pair can have its own independent alias.

---

### User Story 2 - Configure Plugin Behavior (Priority: P1)

A developer wants to customize the plugin's behavior to match their project's specific requirements without modifying the library code, so that the same plugin works across projects with vastly different needs.

**Why this priority**: Configurability is a core design principle. Different projects have different requirements for validation, duplicate handling, and storage behavior.

**Independent Test**: Can be fully tested by initializing the plugin with various configuration options and verifying each option affects behavior as expected.

**Acceptance Scenarios**:

1. **Given** a new project, **When** the developer initializes the plugin with default configuration, **Then** sensible defaults are applied without requiring any configuration.
2. **Given** a project requiring strict uniqueness, **When** the developer configures duplicate mode as "strict", **Then** duplicate alias names are rejected with errors.
3. **Given** a project allowing duplicates with warnings, **When** the developer configures duplicate mode as "warn" with a callback, **Then** duplicates are allowed and the callback is invoked.
4. **Given** a project not caring about duplicates, **When** the developer configures duplicate mode as "allow", **Then** duplicates are silently allowed.
5. **Given** custom storage constraints, **When** the developer configures max alias length, **Then** the plugin enforces the custom limit.

---

### User Story 3 - Lookup by Alias Name (Priority: P1)

A developer needs to resolve a human-readable alias back to its underlying account address so that the application can execute blockchain transactions or display account information.

**Why this priority**: Bidirectional lookup is essential for the feature to be useful. Users will input aliases in UIs, and developers need to resolve them to actual addresses for transaction execution.

**Independent Test**: Can be fully tested by creating aliases and then resolving them back to addresses, enabling address resolution from user-friendly names.

**Acceptance Scenarios**:

1. **Given** an alias that exists in storage, **When** the developer looks up the alias by name, **Then** the system returns the associated account address.
2. **Given** an alias that does not exist, **When** the developer looks up the alias, **Then** the system returns undefined/null without throwing an error.
3. **Given** multiple addresses with the same alias (when duplicates allowed), **When** the developer looks up the alias, **Then** the system returns an array of all matching addresses.

---

### User Story 4 - Lookup by Address (Priority: P1)

A developer receiving an account address from a blockchain event or transaction wants to display the human-readable alias to users rather than the raw address.

**Why this priority**: Equally critical for bidirectional utility. When displaying transaction history or account activity, developers need to resolve addresses to their friendly names.

**Independent Test**: Can be fully tested by storing aliases and then looking up which alias belongs to a given address, enabling human-readable display of account information.

**Acceptance Scenarios**:

1. **Given** an address with an associated alias, **When** the developer looks up the address, **Then** the system returns the alias name.
2. **Given** an address without an alias, **When** the developer looks up the address, **Then** the system returns undefined/null without throwing an error.
3. **Given** an address with aliases on multiple networks, **When** the developer looks up by address and networkId, **Then** the system returns the alias for that specific network.
4. **Given** an address with aliases on multiple networks, **When** the developer looks up by address only, **Then** the system returns all aliases for that address across all networks.

---

### User Story 5 - Drop-in Integration for New Projects (Priority: P1)

A developer starting a new project wants to add alias storage with minimal setup, so that they can immediately start storing and retrieving aliases without extensive configuration.

**Why this priority**: Ease of adoption is critical for plugin success. New projects should be able to adopt the plugin with just a few lines of code.

**Independent Test**: Can be fully tested by following the quickstart documentation and having working alias storage within minutes.

**Acceptance Scenarios**:

1. **Given** a new project using the storage package, **When** the developer imports and instantiates the alias plugin, **Then** it works immediately with sensible defaults.
2. **Given** the alias plugin, **When** the developer creates the database with the plugin's schema, **Then** the required tables are automatically configured.
3. **Given** a project using React, **When** the developer imports the provided hooks, **Then** they integrate with existing storage hook patterns: hook returns `{ records, isLoading, save, update, remove, clear }` matching `createRepositoryHook` convention.

---

### User Story 6 - Migration Path for Existing Projects (Priority: P1)

A developer with an existing project using the storage package wants to add alias functionality to their existing data, so that they can enrich their current address data with human-readable names.

**Why this priority**: Many projects already use the storage package. The plugin must support seamless integration without disrupting existing data or requiring major refactoring.

**Independent Test**: Can be fully tested by adding the plugin to an existing database and verifying existing data remains intact while alias functionality becomes available.

**Acceptance Scenarios**:

1. **Given** an existing database with other tables, **When** the developer adds the alias plugin, **Then** existing tables and data remain unchanged.
2. **Given** existing address data in a project, **When** the developer wants to create aliases for those addresses, **Then** they can do so without modifying the original data structures.
3. **Given** a database version upgrade, **When** the plugin is added, **Then** the plugin provides a schema constant (`ALIAS_SCHEMA`) that can be spread into the Dexie version definition; no automatic migrations are performed—implementers control versioning.

---

### User Story 7 - Delete Alias (Priority: P2)

A developer needs to remove an alias that is no longer valid (e.g., account decommissioned, alias reassignment needed) so that the alias name becomes available for reuse.

**Why this priority**: Deletion is important for lifecycle management but secondary to core CRUD operations.

**Independent Test**: Can be fully tested by creating and then deleting an alias, verifying it no longer exists.

**Acceptance Scenarios**:

1. **Given** an existing alias, **When** the developer deletes it by alias name, **Then** the alias is removed and subsequent lookups return undefined.
2. **Given** an existing alias, **When** the developer deletes it by address, **Then** the alias is removed and subsequent lookups return undefined.
3. **Given** a non-existent alias, **When** the developer attempts to delete it, **Then** the operation completes without error (idempotent delete).

---

### User Story 8 - List All Aliases (Priority: P2)

A developer building a contact book or account management UI needs to retrieve all stored aliases so that users can browse and manage their saved accounts.

**Why this priority**: Essential for any UI that displays or manages aliases, but not required for basic alias functionality.

**Independent Test**: Can be fully tested by creating multiple aliases and retrieving the complete list.

**Acceptance Scenarios**:

1. **Given** multiple aliases in storage, **When** the developer requests all aliases, **Then** the system returns an array of all alias records with both names and addresses.
2. **Given** no aliases in storage, **When** the developer requests all aliases, **Then** the system returns an empty array.

---

### User Story 9 - React Hook Integration (Priority: P2)

A React developer wants to use the alias storage with live reactive updates so that the UI automatically reflects changes when aliases are created, updated, or deleted.

**Why this priority**: Aligns with the existing storage package patterns and provides a seamless developer experience for React applications.

**Independent Test**: Can be fully tested by creating a React component that uses the hook and verifying UI updates when aliases change.

**Acceptance Scenarios**:

1. **Given** a React component using the alias hook, **When** an alias is created, **Then** the component's alias list updates automatically without manual refresh.
2. **Given** a React component using the alias hook, **When** an alias is deleted, **Then** the component's alias list updates automatically.
3. **Given** the existing storage React patterns, **When** using the alias hooks, **Then** they follow the same API conventions (createRepositoryHook, createCrudHook patterns).

---

### User Story 10 - Bulk Import/Export (Priority: P3)

A developer needs to import aliases from an external source or export them for backup/migration purposes so that alias data can be transferred between environments.

**Why this priority**: Important for enterprise use cases and data portability, but not required for core functionality.

**Independent Test**: Can be fully tested by exporting aliases to JSON and reimporting them, verifying data integrity.

**Acceptance Scenarios**:

1. **Given** multiple aliases in storage, **When** the developer exports to JSON, **Then** the system produces a valid JSON file containing all alias data.
2. **Given** a valid JSON file with alias data, **When** the developer imports it, **Then** aliases are created according to the configured duplicate mode.

---

### Edge Cases

- **Empty string address**: Plugin rejects with `INVALID_ADDRESS` error; addresses must be non-empty strings
- **Empty string alias**: Plugin rejects with `INVALID_ALIAS` error; aliases must be non-empty strings
- **Empty string networkId**: Treated as `undefined` (global alias); empty strings are normalized to undefined
- **Undefined networkId**: Acts as a "global" alias, not network-specific; can coexist with network-specific aliases for the same address
- **Special characters (emojis, unicode)**: System accepts any non-empty string; validation is the implementer's responsibility
- **Unicode normalization**: Plugin stores strings as-is without normalization (no NFC/NFD conversion); implementers should normalize before storage if needed
- **Very long alias names**: Configurable via `maxAliasLength`; when set, plugin rejects with `ALIAS_TOO_LONG` error
- **Very long addresses (>10KB)**: Plugin accepts addresses up to IndexedDB's practical limits (~10MB); no explicit length limit enforced
- **Invalid address format**: Plugin stores addresses as-is; format validation is the implementer's responsibility
- **Invalid networkId format**: Plugin stores networkId as-is; format validation is the implementer's responsibility
- **Storage quota exceeded**: Utilizes existing `withQuotaHandling` utility; throws `STORAGE_QUOTA_EXCEEDED` error
- **Concurrent alias operations**: Leverages Dexie's transaction support for consistency; last-write-wins semantics
- **Database corrupted/inaccessible**: Plugin propagates Dexie errors; implementers should handle `DatabaseClosedError` and similar
- **Maximum alias count**: No explicit limit; bounded only by IndexedDB storage quota (typically 50% of available disk space)
- **Same address, different networks**: Each (address, networkId) pair is a separate record; no limit on aliases per address across networks

## Requirements _(mandatory)_

### Functional Requirements

#### Core Operations

- **FR-001**: Plugin MUST allow storing a mapping between an account address (optionally with networkId) and a custom alias name
- **FR-002**: Plugin MUST support lookup of address by alias name
- **FR-003**: Plugin MUST support lookup of alias name by address (optionally filtered by networkId)
- **FR-004**: Plugin MUST allow updating an existing alias (changing the name for an address/networkId pair)
- **FR-005**: Plugin MUST allow deleting an alias by either alias name, address, or address+networkId
- **FR-006**: Plugin MUST support retrieving all stored aliases
- **FR-007**: Plugin MUST manage timestamps (createdAt, updatedAt) for each alias record
- **FR-008**: Plugin MUST persist aliases using IndexedDB via the existing Dexie infrastructure

#### Multi-Network Support

- **FR-032**: Plugin MUST support an optional `networkId` field in alias records, matching the `NetworkConfig.id` pattern (e.g., `ethereum-mainnet`, `stellar-testnet`)
- **FR-033**: Plugin MUST enforce uniqueness on the composite key `(address, networkId)`, not just address
- **FR-034**: Plugin MUST treat `undefined` networkId as a "global" alias that is network-agnostic
- **FR-035**: Plugin MUST allow the same address to have different aliases on different networks
- **FR-036**: Plugin MUST provide lookup methods that can filter by networkId
- **FR-037**: Plugin MUST provide lookup methods that return all aliases for an address across all networks
- **FR-038**: Plugin MUST NOT validate networkId format; this is the implementer's responsibility (adapters provide the value from `NetworkConfig.id`)

#### Configuration & Extensibility

- **FR-009**: Plugin MUST support configurable duplicate alias name handling with modes: "strict" (reject), "warn" (allow + callback), "allow" (silent)
- **FR-010**: Plugin MUST accept optional configuration for maximum alias name length
- **FR-011**: Plugin MUST accept optional onDuplicate callback for "warn" mode
- **FR-012**: Plugin MUST provide sensible defaults for all configuration options
- **FR-013**: Plugin MUST NOT perform address validation; this is the implementer's responsibility
- **FR-014**: Plugin MUST NOT perform alias name validation beyond configured length limits; content validation is the implementer's responsibility
- **FR-015**: Plugin MUST expose configuration options via a typed options interface
- **FR-016**: Plugin MUST use the existing logger utility from `@openzeppelin/ui-utils` for observability
- **FR-017**: Plugin MUST allow logging to be enabled/disabled via configuration

#### Plugin Architecture

- **FR-018**: Plugin MUST be contained in an isolated directory within the storage package (e.g., `plugins/account-alias/`)
- **FR-019**: Plugin MUST export a factory function that accepts configuration and returns the storage instance
- **FR-020**: Plugin MUST provide schema definitions that can be merged with existing database schemas
- **FR-021**: Plugin MUST not modify or interfere with other tables in the database
- **FR-022**: Plugin MUST follow the patterns established by EntityStorage and KeyValueStorage classes

#### React Integration

- **FR-023**: Plugin MUST provide React hooks for live reactive queries and CRUD operations
- **FR-024**: Plugin MUST follow existing hook patterns (createRepositoryHook, createCrudHook conventions)
- **FR-025**: Plugin MUST support the existing error handling patterns (onError callbacks)
- **FR-029**: React hooks MUST automatically clean up subscriptions on component unmount
- **FR-030**: React hooks MUST handle storage errors by invoking the configured onError callback
- **FR-031**: React hooks MUST expose the same methods as the core storage class (getByAddress, getByAlias, resolveAlias, resolveAddress)

#### Import/Export

- **FR-026**: Plugin MUST support bulk import from JSON
- **FR-027**: Plugin MUST support bulk export to JSON
- **FR-028**: Plugin MUST handle storage quota errors gracefully using existing utilities

### Key Entities

- **AliasRecord**: Represents a mapping between an account address and an alias name
  - `id`: Auto-generated unique identifier
  - `address`: The account address (stored as-is, no normalization)
  - `networkId`: Optional network identifier matching `NetworkConfig.id` pattern (e.g., `ethereum-mainnet`, `stellar-testnet`); undefined means "global" alias
  - `alias`: The human-readable alias name
  - `metadata`: Optional arbitrary JSON for implementer-defined context (e.g., category, source, notes, isSmartAccount)
  - `createdAt`: Timestamp when the alias was created
  - `updatedAt`: Timestamp when the alias was last modified

- **AliasStorageOptions**: Configuration for plugin behavior
  - `duplicateMode`: "strict" | "warn" | "allow" (default: "strict")
  - `maxAliasLength`: Maximum characters for alias names (default: 64); set to `undefined` to disable length checking entirely
  - `onDuplicate`: Callback invoked when duplicate detected in "warn" mode; if not provided in "warn" mode, duplicates are allowed silently (equivalent to "allow" behavior)
  - `tableName`: Custom table name for the Dexie store (default: "aliases"); allows multiple independent alias stores in the same database
  - `enableLogging`: Enable/disable logging output (default: `true` when `process.env.NODE_ENV !== 'production'`, otherwise `false`)
  - `logLevel`: Verbosity level for logging (default: "info"); options: "debug" | "info" | "warn" | "error"

### Configuration Defaults Reference

| Option           | Default Value               | Behavior When Undefined                            |
| ---------------- | --------------------------- | -------------------------------------------------- |
| `duplicateMode`  | `"strict"`                  | Rejects duplicate alias names                      |
| `maxAliasLength` | `64`                        | Set to `undefined` to disable length enforcement   |
| `onDuplicate`    | `undefined`                 | In "warn" mode without callback, acts like "allow" |
| `tableName`      | `"aliases"`                 | Uses default table name                            |
| `enableLogging`  | `NODE_ENV !== 'production'` | Enabled in development, disabled in production     |
| `logLevel`       | `"info"`                    | Logs info-level and above                          |

### Error Codes

The plugin throws typed errors with the following codes:

| Code                     | Condition                          | Thrown By                              |
| ------------------------ | ---------------------------------- | -------------------------------------- |
| `DUPLICATE_ALIAS`        | Alias name exists (strict mode)    | `save()`, `bulkSave()`, `importJson()` |
| `ALIAS_TOO_LONG`         | Alias exceeds `maxAliasLength`     | `save()`, `update()`, `bulkSave()`     |
| `INVALID_ALIAS`          | Alias is empty string              | `save()`, `update()`, `bulkSave()`     |
| `INVALID_ADDRESS`        | Address is empty string            | `save()`, `bulkSave()`                 |
| `ALIAS_NOT_FOUND`        | Record ID doesn't exist            | `update()`                             |
| `INVALID_IMPORT_FORMAT`  | JSON doesn't match expected schema | `importJson()`                         |
| `STORAGE_QUOTA_EXCEEDED` | IndexedDB quota exceeded           | All write operations                   |

### Logging Behavior

When logging is enabled, the plugin logs the following events:

| Event              | Level   | Message Format                                      |
| ------------------ | ------- | --------------------------------------------------- |
| Alias saved        | `info`  | `"aliases saved"`, `"ID: {id}"`                     |
| Alias updated      | `info`  | `"aliases updated"`, `"ID: {id}"`                   |
| Alias deleted      | `info`  | `"aliases deleted"`, `"ID: {id}"`                   |
| Bulk operation     | `info`  | `"aliases bulk {op}"`, `"Count: {n}"`               |
| Duplicate detected | `debug` | `"aliases duplicate"`, `"Alias: {alias}"`           |
| Storage cleared    | `info`  | `"aliases storage cleared"`                         |
| Import completed   | `info`  | `"aliases import"`, `"Imported: {n}, Skipped: {n}"` |
| Export completed   | `info`  | `"aliases export"`, `"Count: {n}"`                  |

### Bulk Operations

- **`bulkSave(inputs: AliasInput[])`**: Saves multiple aliases with per-record processing
  - Returns array of created/updated record IDs
  - Respects `duplicateMode` for each record
  - Individual records may fail while others succeed (partial success semantics)
  - In "strict" mode: invalid or duplicate records are rejected, but valid records are still persisted
  - Already-saved records are not rolled back when subsequent records fail
  - Performance: O(n) with per-record saves

- **`bulkDelete(ids: string[])`**: Deletes multiple aliases by ID
  - Idempotent: non-existent IDs are silently skipped
  - Performance: O(n) with single IndexedDB transaction

### Convenience Methods

- **`count()`**: Returns the number of stored aliases; O(1) operation
- **`hasAlias(address: string, networkId?: string)`**: Returns `true` if address has an alias (optionally for specific network); O(log n) lookup
- **`aliasExists(alias: string)`**: Returns `true` if alias name is in use; O(log n) lookup
- **`resolveAlias(alias: string)`**: Shorthand for `getByAlias(alias)?.address`
- **`resolveAddress(address: string, networkId?: string)`**: Shorthand for `getByAddressAndNetwork(address, networkId)?.alias`
- **`findByAddress(address: string)`**: Returns all aliases for an address across all networks

### Lookup Method Semantics

| Method                                        | Returns                    | Description                                            |
| --------------------------------------------- | -------------------------- | ------------------------------------------------------ |
| `getByAlias(alias)`                           | `AliasRecord \| undefined` | Returns first match (oldest by createdAt)              |
| `findByAlias(alias)`                          | `AliasRecord[]`            | Returns all matches (ordered by createdAt)             |
| `getByAddress(address)`                       | `AliasRecord \| undefined` | Returns global alias (networkId undefined) for address |
| `getByAddressAndNetwork(address, networkId?)` | `AliasRecord \| undefined` | Returns alias for specific (address, networkId) pair   |
| `findByAddress(address)`                      | `AliasRecord[]`            | Returns all aliases for address across all networks    |

### React Hook Behavior

**Hook Return Type** (matches `createRepositoryHook` pattern):

```typescript
{
  records: AliasRecord[] | undefined;  // All aliases, undefined while loading
  isLoading: boolean;                   // True during initial load
  save: (input: AliasInput) => Promise<string>;
  update: (id: string, updates: Partial<AliasInput>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
  exportAsFile: () => Promise<void>;
  importFromFile: (file: File) => Promise<string[]>;
  getByAddress: (address: string) => Promise<AliasRecord | undefined>;
  getByAddressAndNetwork: (address: string, networkId?: string) => Promise<AliasRecord | undefined>;
  findByAddress: (address: string) => Promise<AliasRecord[]>;
  getByAlias: (alias: string) => Promise<AliasRecord | undefined>;
  resolveAlias: (alias: string) => Promise<string | undefined>;
  resolveAddress: (address: string, networkId?: string) => Promise<string | undefined>;
}
```

**Lifecycle Behavior**:

- **Mount**: Hook subscribes to Dexie live query; `isLoading` is `true` until first data load
- **Unmount**: Subscription automatically cleaned up by `useLiveQuery` internals
- **Error Handling**: All CRUD methods catch errors and invoke `onError` callback if provided; errors are re-thrown after callback
- **Re-initialization**: Hook factory can be called with different options; each call creates independent hook instance

**Re-initialization with Different Options**:

- Creating a new storage instance with different options does not affect existing instances
- Each `createAliasStorage(db, options)` call returns an independent instance
- React hooks created from different storage instances are independent

### Import/Export JSON Schema

**Export Format (AliasExport)**:

```json
{
  "version": 1,
  "exportedAt": "2026-02-03T12:00:00.000Z",
  "aliases": [
    {
      "address": "0x742d35Cc...",
      "networkId": "ethereum-mainnet",
      "alias": "Treasury Mainnet",
      "metadata": { "category": "main" }
    },
    {
      "address": "0x742d35Cc...",
      "networkId": "polygon-mainnet",
      "alias": "Treasury Polygon",
      "metadata": { "category": "main" }
    },
    {
      "address": "0x742d35Cc...",
      "alias": "Treasury",
      "metadata": { "category": "main" }
    }
  ]
}
```

Note: Records without `networkId` are global aliases. The same address can appear multiple times with different networkId values.

**Import Behavior**:

- Timestamps (`createdAt`, `updatedAt`) are regenerated on import (not preserved)
- Duplicate (address, networkId) pairs in import JSON: last occurrence wins (upsert semantics)
- Duplicate alias names: handled according to `duplicateMode`
- Partial failure: individual records may fail while others succeed (partial success semantics)
  - In "strict" mode: invalid or duplicate records are rejected, but valid records are still persisted
  - In "warn"/"allow" modes: continues with remaining records, skipping duplicates
  - Already-saved records are not rolled back when subsequent records fail

**Import Result**:

```typescript
interface ImportResult {
  imported: number; // Successfully imported count
  skipped: number; // Skipped due to duplicates (strict mode)
  ids: string[]; // IDs of imported records
}
```

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Developers can add the plugin to a new project with 3 lines of code or less
  - _Measurement_: Quickstart example demonstrates: (1) import, (2) create database with schema, (3) create storage instance
- **SC-002**: Developers can add the plugin to an existing project without modifying existing data or schemas
  - _Measurement_: Adding plugin to existing database only requires adding a new version with the alias schema; no migration of existing tables
- **SC-003**: Alias lookups (by name or address) complete in under 50 milliseconds for stores with up to 10,000 aliases
  - _Measurement_: Performance test with 10,000 records, measure p95 lookup latency
- **SC-004**: React components using the alias hook automatically update within 100 milliseconds of data changes
  - _Measurement_: useLiveQuery from dexie-react-hooks provides sub-100ms reactivity; verified by hook integration test
- **SC-005**: 100% of existing storage package patterns (EntityStorage API, React hooks) are compatible with the plugin
  - _Measurement_: Plugin exports match patterns from EntityStorage (save, update, delete, get, getAll, count, has, bulkAdd, bulkPut, bulkDelete)
- **SC-006**: Plugin configuration covers all common use cases without requiring library modifications
  - _Measurement_: All configuration options documented with use cases; no hardcoded business logic
- **SC-007**: Import/export functionality preserves 100% data integrity across round-trips
  - _Measurement_: Test exports N records, imports to fresh database, verifies address+alias+metadata match exactly

## Non-Functional Requirements

### Performance

| Metric            | Target    | Measurement                            |
| ----------------- | --------- | -------------------------------------- |
| Single lookup     | <50ms p95 | 10,000 aliases, indexed query          |
| Bulk save         | <500ms    | 1,000 aliases in single transaction    |
| React hook update | <100ms    | Time from write to component re-render |
| Plugin load time  | <10ms     | Time to import and instantiate         |

### Browser Compatibility

- **Required**: IndexedDB support (all modern browsers)
- **Minimum Versions**: Chrome 60+, Firefox 55+, Safari 11+, Edge 79+
- **Not Supported**: IE11, browsers without IndexedDB

### Bundle Size

- Plugin code: Target <5KB minified + gzipped
- Tree-shakeable: Unused exports (e.g., React hooks) can be eliminated by bundlers

### Memory

- No in-memory caching by default; all data stored in IndexedDB
- Memory usage proportional to active query results, not total stored aliases

### Security Considerations

- **Local Storage Only**: All data stored locally in IndexedDB; no network transmission
- **No Encryption**: Data stored in plain text; implementers requiring encryption should encrypt before storage
- **No Sensitive Data Enforcement**: Plugin does not distinguish between sensitive/non-sensitive addresses
- **XSS Consideration**: Alias names are user input; implementers should sanitize before rendering in HTML

## Dependencies & Compatibility

### Runtime Dependencies

| Package                  | Version     | Required              |
| ------------------------ | ----------- | --------------------- |
| `dexie`                  | ^4.0.11     | Yes                   |
| `dexie-react-hooks`      | ^1.1.7      | Yes (for React hooks) |
| `@openzeppelin/ui-utils` | workspace:^ | Yes (for logger)      |

### Peer Dependencies

| Package | Version              | Required              |
| ------- | -------------------- | --------------------- |
| `react` | ^18.0.0 \|\| ^19.0.0 | Yes (for React hooks) |

### Development Dependencies

| Package          | Version | Purpose                     |
| ---------------- | ------- | --------------------------- |
| `fake-indexeddb` | ^6.0.1  | IndexedDB mocking for tests |
| `vitest`         | ^3.2.4  | Test runner                 |

### Version Compatibility

- **IndexedDB**: Requires IndexedDB 2.0 (structured cloning, compound keys)
- **TypeScript**: 5.0+ (satisfies, const type parameters)
- **Node.js**: Not applicable (browser-only)

### Backwards Compatibility

- **API Stability**: Major version bumps for breaking changes to public API
- **Schema Migrations**: Plugin schema version tracked; migrations documented in CHANGELOG
- **Deprecation Policy**: Deprecated APIs marked in JSDoc, removed in next major version

## Design Principles

### 1. Validation is the Implementer's Responsibility

The plugin stores data as provided. It does not validate:

- Address format or validity
- Alias name content (beyond optional length limits)
- Business logic constraints

This allows maximum flexibility across different blockchain ecosystems and project requirements.

### 2. Configuration Over Code Changes

All behavioral variations are handled through configuration:

- Duplicate handling modes eliminate the need for strict vs. flexible variants
- Length limits are configurable, not hardcoded
- Callbacks provide extensibility points without modifying the plugin

### 3. Isolated Plugin Architecture

The plugin is self-contained:

- All plugin code resides in a dedicated directory (e.g., `src/plugins/account-alias/`)
- No dependencies on other plugins
- Clean exports that don't pollute the main package namespace
- Schema definitions are provided, not automatically applied

### 4. Drop-in Compatibility

The plugin integrates seamlessly with existing storage infrastructure:

- Uses the same Dexie instance as other storage
- Follows established patterns (EntityStorage, React hooks)
- New projects: zero-config sensible defaults
- Existing projects: additive-only, no breaking changes

### 5. Network-Agnostic Multi-Network Support

The plugin supports multi-network scenarios without violating ecosystem-agnostic principles:

- `networkId` is stored as a plain string matching `NetworkConfig.id` pattern (e.g., `ethereum-mainnet`, `stellar-testnet`)
- No blockchain SDK dependencies or network-specific logic
- ENS resolution is explicitly out of scope (implementer responsibility via adapters)
- Smart account detection is explicitly out of scope (implementer responsibility via adapters)
- Same address can have different aliases per network, matching real-world usage patterns
- Works across all supported ecosystems: EVM, Stellar, Solana, Midnight, Polkadot

## Assumptions

1. **No Built-in Validation**: The plugin does not validate addresses, networkIds, or alias content. Implementers are responsible for validating data before storing.

2. **Case Sensitivity**: Alias names are stored and compared as-is (case-sensitive). Implementers may normalize case before storage if needed.

3. **Configurable Alias Name Uniqueness**: Alias name uniqueness is configurable via `duplicateMode`. In "strict" mode, duplicate names are rejected; in "warn" and "allow" modes, multiple addresses may share the same alias name.

4. **One Alias Per (Address, NetworkId) Pair**: Each (address, networkId) combination can have exactly one alias. Creating an alias for an (address, networkId) pair that already has one will replace the existing alias. The same address can have different aliases on different networks.

5. **Storage Backend**: The plugin uses IndexedDB via Dexie, consistent with the existing storage package architecture.

6. **No Cross-Device Sync**: The alias storage is local to the application/device. Synchronization, if needed, is the implementer's responsibility.

7. **Schema Composition**: Implementers compose the plugin's schema with their existing database schema, maintaining full control over database structure.

8. **Network-Agnostic Design**: The plugin stores networkId as a string without any validation or interpretation. It does not depend on any blockchain SDK or network-specific logic. ENS resolution, smart account detection, and other network-specific features are the implementer's responsibility. The `networkId` value should match the `NetworkConfig.id` pattern from `@openzeppelin/ui-types` (e.g., `ethereum-mainnet`, `stellar-testnet`).

9. **Global Aliases**: When `networkId` is undefined, the alias is considered "global" and not tied to any specific network. This is useful for addresses that should have the same alias across all networks.
