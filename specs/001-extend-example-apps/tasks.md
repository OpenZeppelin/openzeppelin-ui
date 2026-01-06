# Tasks: Extend Example Apps

**Input**: Design documents from `/specs/001-extend-example-apps/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, quickstart.md ✓

**Tests**: Visual verification via the example app (no automated tests required per spec)

**Organization**: Tasks grouped by user story for independent implementation and testing

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US6)
- All paths relative to `examples/basic-react-app/`

---

## Phase 1: Setup

**Purpose**: Project initialization and shared component creation

- [x] T001 Add wallet dependencies to examples/basic-react-app/package.json (@openzeppelin/ui-react, wagmi, viem, @rainbow-me/rainbowkit, @tanstack/react-query)
- [x] T002 Create DemoSection wrapper component in examples/basic-react-app/src/components/DemoSection.tsx
- [x] T003 Export DemoSection from examples/basic-react-app/src/components/index.ts

---

## Phase 2: Foundational (Navigation Restructure)

**Purpose**: Update App.tsx to support categorized navigation - MUST complete before user stories

**⚠️ CRITICAL**: Navigation structure needed for all demo components

- [x] T004 Update DemoKey type in examples/basic-react-app/src/App.tsx to include all new demo keys per data-model.md
- [x] T005 Restructure navItems in examples/basic-react-app/src/App.tsx into NavCategory groups (Inputs, Feedback, Layout, Data Display, Forms, Integration)
- [x] T006 Update SidebarLayout in examples/basic-react-app/src/App.tsx to render categorized SidebarSections
- [x] T007 Update demoComponents registry in examples/basic-react-app/src/App.tsx with placeholder imports for new demos

**Checkpoint**: Navigation structure ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Component Showcase Discovery (P1) 🎯 MVP

**Goal**: Complete core input component demos with variants, states, and code examples

**Independent Test**: Navigate to each input section and verify component displays with all variants

### Implementation for User Story 1

- [x] T008 [P] [US1] Create TextareaDemo in examples/basic-react-app/src/components/TextareaDemo.tsx
- [x] T009 [P] [US1] Create CheckboxDemo in examples/basic-react-app/src/components/CheckboxDemo.tsx
- [x] T010 [P] [US1] Create RadioGroupDemo in examples/basic-react-app/src/components/RadioGroupDemo.tsx
- [x] T011 [US1] Update examples/basic-react-app/src/components/index.ts with new Input demo exports
- [x] T012 [US1] Update demoComponents in examples/basic-react-app/src/App.tsx to import US1 demos
- [x] T013 [US1] Enhance existing ButtonDemo with loading and disabled states in examples/basic-react-app/src/components/ButtonDemo.tsx
- [x] T014 [US1] Enhance existing InputDemo with error states in examples/basic-react-app/src/components/InputDemo.tsx
- [x] T015 [US1] Enhance existing SelectDemo with grouped options in examples/basic-react-app/src/components/SelectDemo.tsx

**Checkpoint**: All Input category components functional and testable

---

## Phase 4: User Story 2 - Data Display Components (P1)

**Goal**: Blockchain data display components (addresses, networks, status badges)

**Independent Test**: Navigate to Data Display section and verify components render with sample blockchain data

### Implementation for User Story 2

- [x] T016 [P] [US2] Create AddressDisplayDemo in examples/basic-react-app/src/components/AddressDisplayDemo.tsx
- [x] T017 [P] [US2] Create NetworkDemo (NetworkIcon, NetworkSelector with loading state, NetworkStatusBadge) in examples/basic-react-app/src/components/NetworkDemo.tsx
- [x] T018 [P] [US2] Create EmptyStateDemo in examples/basic-react-app/src/components/EmptyStateDemo.tsx
- [x] T019 [P] [US2] Create BannerDemo in examples/basic-react-app/src/components/BannerDemo.tsx
- [x] T020 [P] [US2] Create ExternalLinkDemo in examples/basic-react-app/src/components/ExternalLinkDemo.tsx
- [x] T021 [P] [US2] Create LoadingButtonDemo in examples/basic-react-app/src/components/LoadingButtonDemo.tsx
- [x] T022 [US2] Update examples/basic-react-app/src/components/index.ts with Data Display exports
- [x] T023 [US2] Update demoComponents in examples/basic-react-app/src/App.tsx to import US2 demos

**Checkpoint**: All Data Display components functional - P1 stories complete

---

## Phase 5: User Story 3 - Feedback and Overlay Components (P2)

**Goal**: User feedback components (alerts, dialogs, tooltips, notifications)

**Independent Test**: Interact with Alert, Dialog, Toast demos and verify display/dismiss behavior

### Implementation for User Story 3

- [x] T024 [P] [US3] Create AlertDemo in examples/basic-react-app/src/components/AlertDemo.tsx
- [x] T025 [P] [US3] Create DialogDemo in examples/basic-react-app/src/components/DialogDemo.tsx
- [x] T026 [P] [US3] Create TooltipDemo in examples/basic-react-app/src/components/TooltipDemo.tsx
- [x] T027 [P] [US3] Create PopoverDemo in examples/basic-react-app/src/components/PopoverDemo.tsx
- [x] T028 [P] [US3] Create ToastDemo (Sonner) in examples/basic-react-app/src/components/ToastDemo.tsx
- [x] T029 [US3] Add Toaster provider to examples/basic-react-app/src/main.tsx
- [x] T030 [US3] Update examples/basic-react-app/src/components/index.ts with Feedback exports
- [x] T031 [US3] Update demoComponents in examples/basic-react-app/src/App.tsx to import US3 demos

**Checkpoint**: All Feedback components functional and testable

---

## Phase 6: User Story 4 - Form Field Components (P2)

**Goal**: Specialized blockchain form fields demo with validation

**Independent Test**: Navigate to Form Fields demo, interact with each field type, verify validation messages

### Implementation for User Story 4

- [ ] T032 [P] [US4] Create FormFieldsDemo (all 20 fields with tabs) in examples/basic-react-app/src/components/FormFieldsDemo.tsx
- [ ] T033 [P] [US4] Create CalendarDemo in examples/basic-react-app/src/components/CalendarDemo.tsx
- [ ] T034 [P] [US4] Create DateRangePickerDemo in examples/basic-react-app/src/components/DateRangePickerDemo.tsx
- [ ] T035 [US4] Enhance existing FormDemo with additional field examples in examples/basic-react-app/src/components/FormDemo.tsx
- [ ] T036 [US4] Update examples/basic-react-app/src/components/index.ts with Form exports
- [ ] T037 [US4] Update demoComponents in examples/basic-react-app/src/App.tsx to import US4 demos

**Checkpoint**: All Form Field components functional - P2 stories complete

---

## Phase 7: User Story 5 - Layout and Navigation Components (P3)

**Goal**: Layout primitives (cards, tabs, accordion, progress, dropdown)

**Independent Test**: Navigate to Layout section and verify components render and function correctly

### Implementation for User Story 5

- [ ] T038 [P] [US5] Create CardDemo in examples/basic-react-app/src/components/CardDemo.tsx
- [ ] T039 [P] [US5] Create TabsDemo in examples/basic-react-app/src/components/TabsDemo.tsx
- [ ] T040 [P] [US5] Create AccordionDemo in examples/basic-react-app/src/components/AccordionDemo.tsx
- [ ] T041 [P] [US5] Create ProgressDemo in examples/basic-react-app/src/components/ProgressDemo.tsx
- [ ] T042 [P] [US5] Create DropdownMenuDemo in examples/basic-react-app/src/components/DropdownMenuDemo.tsx
- [ ] T043 [US5] Update examples/basic-react-app/src/components/index.ts with Layout exports
- [ ] T044 [US5] Update demoComponents in examples/basic-react-app/src/App.tsx to import US5 demos

**Checkpoint**: All Layout components functional

---

## Phase 8: User Story 6 - React Hooks and Providers (P3)

**Goal**: Live wallet connection demo using EVM adapter pattern

**Independent Test**: Connect wallet, verify connection state, test disconnect flow

### Implementation for User Story 6

- [ ] T045 [P] [US6] Create network config in examples/basic-react-app/src/config/networks.ts
- [ ] T046 [P] [US6] Create AppProviders wrapper in examples/basic-react-app/src/providers/AppProviders.tsx
- [ ] T047 [US6] Update examples/basic-react-app/src/main.tsx to wrap App with AppProviders
- [ ] T048 [US6] Create WalletDemo in examples/basic-react-app/src/components/WalletDemo.tsx
- [ ] T049 [US6] Enhance RendererDemo with additional examples in examples/basic-react-app/src/components/RendererDemo.tsx
- [ ] T050 [US6] Update examples/basic-react-app/src/components/index.ts with Integration exports
- [ ] T051 [US6] Update demoComponents in examples/basic-react-app/src/App.tsx to import US6 demos
- [ ] T052 [US6] Add wallet error handling UI (no wallet, rejected, network mismatch) to WalletDemo

**Checkpoint**: All user stories complete - full feature functional

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories

- [ ] T053 [P] Verify responsive behavior across mobile (320px), tablet (768px), desktop (1024px+) viewports per NFR-001
- [ ] T054 [P] Ensure code examples are copy-ready and consistent across all demos
- [ ] T055 [P] Verify all component variants display per TypeScript props interfaces
- [ ] T056 Perform accessibility audit using browser devtools (Lighthouse); target score ≥90 per SC-004 and NFR-002/NFR-003
- [ ] T057 Run pnpm typecheck and fix any TypeScript errors in examples/basic-react-app/
- [ ] T058 Run pnpm lint and fix any linting issues in examples/basic-react-app/
- [ ] T059 Validate quickstart.md instructions by running demo from scratch

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - US1 + US2 (P1): Can run in parallel after Foundational
  - US3 + US4 (P2): Can run in parallel after Foundational
  - US5 + US6 (P3): Can run in parallel after Foundational
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

| Story | Priority | Dependencies      | Can Parallelize With |
| ----- | -------- | ----------------- | -------------------- |
| US1   | P1       | Foundational only | US2                  |
| US2   | P1       | Foundational only | US1                  |
| US3   | P2       | Foundational only | US4                  |
| US4   | P2       | Foundational only | US3                  |
| US5   | P3       | Foundational only | US6                  |
| US6   | P3       | Foundational only | US5                  |

### Within Each User Story

- Demo components marked [P] can run in parallel
- Index.ts updates after all demos in story are created
- App.tsx update after index.ts update

---

## Parallel Examples

### Phase 3+4 Parallel (P1 Stories)

```bash
# All P1 demos can be created in parallel:
T008 TextareaDemo.tsx     T016 AddressDisplayDemo.tsx
T009 CheckboxDemo.tsx     T017 NetworkDemo.tsx
T010 RadioGroupDemo.tsx   T018 EmptyStateDemo.tsx
                          T019 BannerDemo.tsx
                          T020 ExternalLinkDemo.tsx
                          T021 LoadingButtonDemo.tsx
```

### Phase 5+6 Parallel (P2 Stories)

```bash
# All P2 demos can be created in parallel:
T024 AlertDemo.tsx        T032 FormFieldsDemo.tsx
T025 DialogDemo.tsx       T033 CalendarDemo.tsx
T026 TooltipDemo.tsx      T034 DateRangePickerDemo.tsx
T027 PopoverDemo.tsx
T028 ToastDemo.tsx
```

---

## Implementation Strategy

### MVP First (P1 Stories Only)

1. Complete Phase 1: Setup (3 tasks)
2. Complete Phase 2: Foundational (4 tasks)
3. Complete Phase 3: US1 - Input demos (8 tasks)
4. Complete Phase 4: US2 - Data Display demos (8 tasks)
5. **STOP and VALIDATE**: Run `pnpm dev`, navigate all P1 demos
6. Deploy/demo if ready - core component showcase functional

### Incremental Delivery

| Increment  | Stories     | Tasks     | Cumulative Value      |
| ---------- | ----------- | --------- | --------------------- |
| Foundation | Setup + Nav | T001-T007 | Navigation ready      |
| MVP        | US1 + US2   | T008-T023 | Inputs + Data Display |
| P2 Release | US3 + US4   | T024-T037 | + Feedback + Forms    |
| Full       | US5 + US6   | T038-T052 | + Layout + Wallet     |
| Polish     | Final       | T053-T059 | Production ready      |

---

## Task Summary

| Phase            | Story               | Tasks  | Parallelizable |
| ---------------- | ------------------- | ------ | -------------- |
| 1 - Setup        | -                   | 3      | 0              |
| 2 - Foundational | -                   | 4      | 0              |
| 3 - US1 (P1)     | Component Discovery | 8      | 3              |
| 4 - US2 (P1)     | Data Display        | 8      | 6              |
| 5 - US3 (P2)     | Feedback            | 8      | 5              |
| 6 - US4 (P2)     | Form Fields         | 6      | 3              |
| 7 - US5 (P3)     | Layout              | 7      | 5              |
| 8 - US6 (P3)     | Wallet              | 8      | 2              |
| 9 - Polish       | -                   | 7      | 3              |
| **Total**        |                     | **59** | **27**         |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All demo files follow `*Demo.tsx` naming convention
- Reference contracts-ui-builder/packages/adapter-evm for wallet integration patterns
