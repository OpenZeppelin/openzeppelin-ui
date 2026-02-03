# Implementation Plan: Account Alias Storage

**Branch**: `002-account-alias-storage` | **Date**: 2026-02-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-account-alias-storage/spec.md`

## Summary

Implement a universal account address aliasing plugin for the `@openzeppelin/ui-storage` package. The plugin enables developers to map blockchain addresses to human-readable alias names with configurable duplicate handling, optional metadata, and React hook integration. The implementation follows the existing `EntityStorage` pattern and integrates with the storage package's Dexie infrastructure.

## Technical Context

**Language/Version**: TypeScript 5.8+  
**Primary Dependencies**: Dexie ^4.0.11, dexie-react-hooks ^1.1.7, @openzeppelin/ui-utils (logger)  
**Storage**: IndexedDB via Dexie (existing infrastructure)  
**Testing**: Vitest with fake-indexeddb for IndexedDB mocking  
**Target Platform**: Browser (IndexedDB required)  
**Project Type**: Library package (monorepo member)  
**Performance Goals**: <50ms lookups for 10,000 aliases, <100ms React hook updates  
**Constraints**: Must not break existing storage consumers, chain-agnostic  
**Scale/Scope**: Single plugin addition to existing package, ~500-800 lines of code

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                          | Status  | Notes                                                                                  |
| ---------------------------------- | ------- | -------------------------------------------------------------------------------------- |
| I. Library-First Architecture      | ✅ PASS | Plugin contained within `@openzeppelin/ui-storage` (Layer 7), no new packages required |
| II. Chain-Agnostic Design          | ✅ PASS | Addresses stored as strings, no validation of format, no chain SDK dependencies        |
| III. Type Safety & API Stability   | ✅ PASS | Full TypeScript with explicit interfaces, JSDoc required, uses `logger` not console    |
| IV. Design System Ownership        | ✅ N/A  | No UI components, pure data layer                                                      |
| V. Testing & Documentation         | ✅ PASS | Vitest tests required, README section for plugin usage                                 |
| VI. Packaging & Release Management | ✅ PASS | Changeset required, exported via package.json `exports`                                |
| VII. Consumer-First Development    | ✅ PASS | Simple 3-line integration, follows existing patterns                                   |

**Gate Status**: ✅ PASSED — No violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/002-account-alias-storage/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (TypeScript interfaces)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
packages/storage/src/
├── base/
│   ├── EntityStorage.ts
│   ├── KeyValueStorage.ts
│   └── index.ts
├── core/
│   ├── db.ts
│   └── index.ts
├── plugins/                    # NEW: Plugin directory
│   └── account-alias/          # NEW: Alias plugin
│       ├── index.ts            # Plugin exports
│       ├── AliasStorage.ts     # Main storage class
│       ├── types.ts            # Interfaces and options
│       ├── schema.ts           # Dexie schema definition
│       ├── react.ts            # React hooks
│       └── __tests__/
│           ├── AliasStorage.test.ts
│           └── react.test.tsx
├── react/
│   └── (existing hooks)
└── index.ts                    # Add plugin re-export
```

**Structure Decision**: Plugin resides in `src/plugins/account-alias/` as an isolated module. Exports are added to the main `index.ts` for convenient access while maintaining isolation. This follows the spec requirement for isolated plugin architecture.

## Complexity Tracking

> No violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| —         | —          | —                                    |
