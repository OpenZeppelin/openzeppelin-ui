# Tasks: Account Alias Storage

**Input**: Design documents from `/specs/002-account-alias-storage/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included (Constitution §V requires Vitest tests)

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US10)
- Include exact file paths in descriptions

## Path Conventions

All paths relative to `packages/storage/src/`:

```text
packages/storage/src/
├── plugins/account-alias/     # NEW plugin directory
│   ├── index.ts               # Plugin exports
│   ├── types.ts               # Interfaces and options
│   ├── errors.ts              # Error classes
│   ├── schema.ts              # Dexie schema
│   ├── AliasStorage.ts        # Main storage class
│   ├── react.ts               # React hooks
│   └── __tests__/
│       ├── AliasStorage.test.ts
│       └── react.test.tsx
└── index.ts                   # Add plugin re-export
```

---

## Phase 1: Setup (Plugin Infrastructure)

**Purpose**: Create plugin directory structure and base files

- [x] T001 Create plugin directory structure at `packages/storage/src/plugins/account-alias/`
- [x] T002 [P] Create placeholder `index.ts` with empty exports in `plugins/account-alias/index.ts`
- [x] T003 [P] Create `__tests__/` directory with test setup in `plugins/account-alias/__tests__/setup.ts`

**Checkpoint**: Plugin directory structure ready ✅

---

## Phase 2: Foundational (Types & Schema)

**Purpose**: Core types, error classes, and schema that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 [P] Create `AliasRecord` interface (with `networkId` field matching `NetworkConfig.id`), `AliasInput` type, and `AliasUpdate` type in `plugins/account-alias/types.ts`
- [x] T005 [P] Create `AliasStorageOptions` interface with all config options in `plugins/account-alias/types.ts`
- [x] T006 [P] Create `DuplicateMode` type (`'strict' | 'warn' | 'allow'`) and `LogLevel` type (`'debug' | 'info' | 'warn' | 'error'`) in `plugins/account-alias/types.ts`
- [x] T007 [P] Create `ImportResult` and `AliasExport` interfaces in `plugins/account-alias/types.ts`
- [x] T008 [P] Create `AliasStorageErrorCode` type with all error codes in `plugins/account-alias/errors.ts`
- [x] T009 [P] Create `AliasStorageError` class extending Error with code property in `plugins/account-alias/errors.ts`
- [x] T010 [P] Create `ALIAS_SCHEMA` constant with compound `[address+networkId]` index in `plugins/account-alias/schema.ts`
- [x] T011 [P] Create `DEFAULT_OPTIONS` constant with sensible defaults in `plugins/account-alias/types.ts`

**Checkpoint**: Foundation ready - all types, errors, and schema defined ✅

---

## Phase 3: Core Storage - Create & Lookup (US1, US2, US3, US4, US5, US6) 🎯 MVP

**Goal**: Implement core AliasStorage class with save, get, lookup operations and configuration

**Independent Test**: Create aliases, retrieve by address, retrieve by alias name, verify configuration options work

**Note**: User Stories 1-6 are tightly coupled P1 stories that form the core functionality. They are implemented together as they share the same class.

### Tests for Core Storage

- [x] T012 [P] [US1] Create test file `plugins/account-alias/__tests__/AliasStorage.test.ts` with describe block for save operations
- [x] T013 [P] [US2] Add test cases for configuration options (duplicateMode, maxAliasLength) in `AliasStorage.test.ts`
- [x] T014 [P] [US3] Add test cases for `getByAlias()` and `findByAlias()` in `AliasStorage.test.ts`
- [x] T015 [P] [US4] Add test cases for `getByAddress()`, `getByAddressAndNetwork()`, `findByAddress()` in `AliasStorage.test.ts`
- [x] T015a [P] [US4] Add test cases for multi-network scenarios (same address, different networks) in `AliasStorage.test.ts`

### Implementation for Core Storage

- [x] T016 [US1] Create `AliasStorage` class skeleton extending no base class in `plugins/account-alias/AliasStorage.ts`
- [x] T017 [US2] Implement constructor with options merging and defaults in `plugins/account-alias/AliasStorage.ts`
- [x] T018 [US2] Implement `validateAlias()` private method for length/empty checks in `plugins/account-alias/AliasStorage.ts`
- [x] T019 [US2] Implement `validateAddress()` private method for empty check in `plugins/account-alias/AliasStorage.ts`
- [x] T020 [US2] Implement `checkDuplicate()` private method for duplicate handling modes in `plugins/account-alias/AliasStorage.ts`
- [x] T021 [US1] Implement `save(input: AliasInput): Promise<string>` method with `withQuotaHandling` wrapper in `plugins/account-alias/AliasStorage.ts`
- [x] T022 [US1] Implement `update(id: string, updates: Partial<AliasInput>): Promise<void>` method in `plugins/account-alias/AliasStorage.ts`
- [x] T023 [US1] Implement `get(id: string): Promise<AliasRecord | undefined>` method in `plugins/account-alias/AliasStorage.ts`
- [x] T024 [US4] Implement `getByAddress(address: string): Promise<AliasRecord | undefined>` method (global alias) in `plugins/account-alias/AliasStorage.ts`
- [x] T024a [US4] Implement `getByAddressAndNetwork(address: string, networkId?: string): Promise<AliasRecord | undefined>` method in `plugins/account-alias/AliasStorage.ts`
- [x] T024b [US4] Implement `findByAddress(address: string): Promise<AliasRecord[]>` method (all networks) in `plugins/account-alias/AliasStorage.ts`
- [x] T025 [US3] Implement `getByAlias(alias: string): Promise<AliasRecord | undefined>` method in `plugins/account-alias/AliasStorage.ts`
- [x] T026 [US3] Implement `findByAlias(alias: string): Promise<AliasRecord[]>` method in `plugins/account-alias/AliasStorage.ts`
- [x] T027 [US3] Implement `resolveAlias(alias: string): Promise<string | undefined>` convenience method in `plugins/account-alias/AliasStorage.ts`
- [x] T028 [US4] Implement `resolveAddress(address: string, networkId?: string): Promise<string | undefined>` convenience method in `plugins/account-alias/AliasStorage.ts`
- [x] T029 [US5] Implement `createAliasStorage(db: Dexie, options?: AliasStorageOptions)` factory function in `plugins/account-alias/AliasStorage.ts`
- [x] T030 [US2] Add logging calls using `logger` from `@openzeppelin/ui-utils` throughout AliasStorage in `plugins/account-alias/AliasStorage.ts`

**Checkpoint**: Core CRUD operations working - can create, read, update aliases with configurable behavior ✅

---

## Phase 4: Delete & List Operations (US7, US8)

**Goal**: Add delete operations and list all functionality

**Independent Test**: Create aliases, delete by various methods, list all aliases

### Tests for Delete & List

- [x] T031 [P] [US7] Add test cases for `delete()`, `deleteByAddress()`, `deleteByAlias()` in `AliasStorage.test.ts`
- [x] T032 [P] [US8] Add test cases for `getAll()`, `count()`, `hasAlias()`, `aliasExists()` in `AliasStorage.test.ts`

### Implementation for Delete & List

- [x] T033 [US7] Implement `delete(id: string): Promise<void>` method in `plugins/account-alias/AliasStorage.ts`
- [x] T034 [US7] Implement `deleteByAddress(address: string): Promise<void>` method in `plugins/account-alias/AliasStorage.ts`
- [x] T035 [US7] Implement `deleteByAlias(alias: string): Promise<void>` method in `plugins/account-alias/AliasStorage.ts`
- [x] T036 [US7] Implement `clear(): Promise<void>` method in `plugins/account-alias/AliasStorage.ts`
- [x] T037 [US8] Implement `getAll(): Promise<AliasRecord[]>` method in `plugins/account-alias/AliasStorage.ts`
- [x] T038 [US8] Implement `count(): Promise<number>` method in `plugins/account-alias/AliasStorage.ts`
- [x] T039 [US8] Implement `hasAlias(address: string, networkId?: string): Promise<boolean>` method in `plugins/account-alias/AliasStorage.ts`
- [x] T040 [US8] Implement `aliasExists(alias: string): Promise<boolean>` method in `plugins/account-alias/AliasStorage.ts`

**Checkpoint**: Full CRUD + list operations working ✅

---

## Phase 5: React Hook Integration (US9)

**Goal**: Create React hooks for live reactive queries and CRUD operations

**Independent Test**: Mount React component with hook, verify live updates on alias changes

### Tests for React Hooks

- [ ] T041 [P] [US9] Create test file `plugins/account-alias/__tests__/react.test.tsx` with hook tests
- [ ] T042 [P] [US9] Add test cases for live query updates when aliases change in `react.test.tsx`

### Implementation for React Hooks

- [ ] T043 [US9] Create `createUseAliasStorage` hook factory in `plugins/account-alias/react.ts`
- [ ] T044 [US9] Implement `useAliasStorage` hook return type matching `createRepositoryHook` pattern in `plugins/account-alias/react.ts`
- [ ] T045 [US9] Integrate `useLiveQuery` from dexie-react-hooks for reactive updates in `plugins/account-alias/react.ts`
- [ ] T046 [US9] Add error handling with `onError` callback support in `plugins/account-alias/react.ts`
- [ ] T047 [US9] Expose `getByAddress`, `getByAddressAndNetwork`, `findByAddress`, `getByAlias`, `resolveAlias`, `resolveAddress` in hook return in `plugins/account-alias/react.ts`

**Checkpoint**: React integration complete with live updates

---

## Phase 6: Bulk Import/Export (US10)

**Goal**: Add bulk operations for import/export functionality

**Independent Test**: Export aliases to JSON, import to fresh database, verify data integrity

### Tests for Import/Export

- [ ] T048 [P] [US10] Add test cases for `exportJson()` in `AliasStorage.test.ts`
- [ ] T049 [P] [US10] Add test cases for `importJson()` with various duplicate modes in `AliasStorage.test.ts`
- [ ] T050 [P] [US10] Add test cases for `bulkSave()` and `bulkDelete()` in `AliasStorage.test.ts`

### Implementation for Import/Export

- [ ] T051 [US10] Implement `bulkSave(inputs: AliasInput[]): Promise<string[]>` method in `plugins/account-alias/AliasStorage.ts`
- [ ] T052 [US10] Implement `bulkDelete(ids: string[]): Promise<void>` method in `plugins/account-alias/AliasStorage.ts`
- [ ] T053 [US10] Implement `exportJson(ids?: string[]): Promise<string>` method in `plugins/account-alias/AliasStorage.ts`
- [ ] T054 [US10] Implement `importJson(json: string): Promise<ImportResult>` method in `plugins/account-alias/AliasStorage.ts`
- [ ] T055 [US10] Add JSON schema validation for import in `plugins/account-alias/AliasStorage.ts`
- [ ] T056 [US10] Add `exportAsFile` and `importFromFile` to React hook in `plugins/account-alias/react.ts`

**Checkpoint**: Full import/export functionality working

---

## Phase 7: Polish & Integration

**Purpose**: Package exports, documentation, final integration

- [ ] T057 Export all public APIs from `plugins/account-alias/index.ts`
- [ ] T058 Add plugin exports to main `packages/storage/src/index.ts`
- [ ] T059 [P] Add JSDoc comments to all public methods in `AliasStorage.ts`
- [ ] T060 [P] Add JSDoc comments to all public types in `types.ts`
- [ ] T061 [P] Add JSDoc comments to React hooks in `react.ts`
- [ ] T062 Update `packages/storage/README.md` with Account Alias plugin section
- [ ] T063 Run all tests and verify passing: `pnpm test --filter @openzeppelin/ui-storage`
- [ ] T064 Run linter and fix issues: `pnpm lint --filter @openzeppelin/ui-storage`
- [ ] T065 Run typecheck: `pnpm typecheck --filter @openzeppelin/ui-storage`
- [ ] T066 Create changeset file for the new plugin feature
- [ ] T067 Validate quickstart.md examples work in example app
- [ ] T068 [P] Verify bundle size <5KB minified+gzipped: `pnpm build && du -h dist/`
- [ ] T069 [P] Run performance sanity check: lookup latency with 1000 aliases (manual or script)

**Checkpoint**: Plugin complete, tested, documented, ready for PR

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 - BLOCKS all user stories
- **Phase 3 (Core Storage)**: Depends on Phase 2 - MVP implementation
- **Phase 4 (Delete & List)**: Depends on Phase 3 (uses AliasStorage class)
- **Phase 5 (React Hooks)**: Depends on Phase 3 (uses AliasStorage class)
- **Phase 6 (Import/Export)**: Depends on Phase 3 (uses AliasStorage class)
- **Phase 7 (Polish)**: Depends on all previous phases

### User Story Dependencies

| Story                 | Depends On | Can Start After       |
| --------------------- | ---------- | --------------------- |
| US1-US6 (Core)        | Phase 2    | Foundational complete |
| US7-US8 (Delete/List) | US1-US6    | Core Storage complete |
| US9 (React)           | US1-US6    | Core Storage complete |
| US10 (Import/Export)  | US1-US6    | Core Storage complete |

### Parallel Opportunities

After Phase 2 completes:

- **Phase 4, 5, 6 can run in parallel** (different files, no conflicts)

Within phases:

- All tasks marked `[P]` can run in parallel
- Tests can be written in parallel with implementation (TDD)

---

## Parallel Execution Examples

### Phase 2: All Foundational Tasks

```bash
# Launch all type definitions in parallel:
Task: T004 - Create AliasRecord, AliasInput, AliasUpdate
Task: T005 - Create AliasStorageOptions interface
Task: T006 - Create DuplicateMode and LogLevel types
Task: T007 - Create ImportResult and AliasExport interfaces
Task: T008 - Create AliasStorageErrorCode type
Task: T009 - Create AliasStorageError class
Task: T010 - Create ALIAS_SCHEMA constant
Task: T011 - Create DEFAULT_OPTIONS constant
```

### After Phase 3: Parallel Phases

```bash
# After Core Storage complete, launch in parallel:
# Developer A: Phase 4 (Delete & List)
# Developer B: Phase 5 (React Hooks)
# Developer C: Phase 6 (Import/Export)
```

---

## Implementation Strategy

### MVP First (Phase 1-3 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T011)
3. Complete Phase 3: Core Storage (T012-T030)
4. **STOP and VALIDATE**: Run tests, verify core CRUD works
5. Can demo/use at this point with basic functionality

### Incremental Delivery

| Increment      | Phases | Functionality                        |
| -------------- | ------ | ------------------------------------ |
| MVP            | 1-3    | Create, read, update, lookup aliases |
| +Delete/List   | 4      | Delete aliases, list all             |
| +React         | 5      | Live reactive UI updates             |
| +Import/Export | 6      | Backup/restore, bulk operations      |
| Complete       | 7      | Documentation, polish, PR ready      |

### Estimated Task Counts by Phase

| Phase                  | Tasks  | Parallelizable |
| ---------------------- | ------ | -------------- |
| Phase 1: Setup         | 3      | 2              |
| Phase 2: Foundational  | 8      | 8              |
| Phase 3: Core Storage  | 23     | 5              |
| Phase 4: Delete & List | 10     | 2              |
| Phase 5: React Hooks   | 7      | 2              |
| Phase 6: Import/Export | 9      | 3              |
| Phase 7: Polish        | 13     | 5              |
| **Total**              | **73** | **27**         |

---

## Notes

- All tasks include exact file paths for LLM execution
- Tests are included (required by Constitution §V)
- [P] tasks can run in parallel without conflicts
- Commit after each task or logical group
- Run `pnpm test` after each phase to validate
- MVP (Phases 1-3) provides full basic functionality
- Phases 4-6 can be done in any order after Phase 3
