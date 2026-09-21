---

## name: migrate-to-oz-uikit
description: >-
  Migrate an existing React application to the OpenZeppelin UI Kit using `oz-ui migrate` (init, analyze,
  plan, execute, status, doctor). Use when adopting `@openzeppelin/ui-react`, replacing another UI stack,
  or resuming from `migration-manifest.json`. Not for greenfield apps—use `scaffold-dapp` or `oz-ui create`.
when_to_use: >-
  Existing React repo with package.json; migration manifest present or user wants to run migrate init;
  user asks to move to OZ UI Kit, migrate from MUI/Chakra/shadcn, or continue a migration. Skip for
  empty-folder new projects unless wiring a parent monorepo migration.
compatibility: >-
  Node.js 20+ recommended; npm, pnpm, or yarn; `@openzeppelin/ui-cli` as a dev dependency after init;
  network for installs. Subagent names (migration-analyzer, migration-executor, migration-verifier) assume
  Claude Code–style agents where installed; otherwise run the equivalent CLI commands directly.

# Migrate to OpenZeppelin UI Kit

Orchestrate the full migration lifecycle using CLI commands and, where available, specialized subagents (`migration-analyzer`, `migration-executor`, `migration-verifier`).

## When to Use

- The user has an **existing React app** and wants to adopt the OpenZeppelin UI Kit (`@openzeppelin/ui-react`, OZ providers, Tailwind alignment).
- `**migration-manifest.json` exists** or the user needs `**oz-ui migrate init`** before analyze/plan/execute.
- The user asks to **migrate off** MUI, Chakra, shadcn, another component library, or custom UI toward OZ components.

**Do not use** as the primary path for **brand-new** scaffolding from an empty directory—use `**scaffold-dapp`** (`oz-ui create`) instead.

## Instructions

### Prerequisites

- `@openzeppelin/ui-cli` must be installed as a dev dependency
- The project must be a React application with a `package.json`

> `oz-ui` is a locally-installed binary. Always run it via the project's package manager: `npx oz-ui ...` or `pnpm exec oz-ui ...`. Bare `oz-ui` will fail with "command not found".

### Workflow

#### Ordered pipeline

For a full migration, keep this sequence (each step builds on the last):

1. `**npx oz-ui migrate init**` — when there is no `migration-manifest.json` yet and OpenZeppelin UI packages are not wired (see Step 1).
2. `**npx oz-ui migrate analyze**` — scan the repo; produce `migration-analysis.json`.
3. **Align** with the user on profile, scope, and ambiguous mappings (decisions inform the plan).
4. `**npx oz-ui migrate plan`** — produce `migration-manifest.json` with phased tasks.
5. **Execute** tasks from the manifest in phase order, using `**npx oz-ui migrate execute`** for deterministic work and manual edits only when the CLI returns a manual-review task.
6. **Complete** with `**npx oz-ui migrate status`** and a full `**npx oz-ui migrate doctor**` pass on the manifest.

Use `npx oz-ui migrate status --manifest migration-manifest.json --next` whenever you need the CLI to suggest the next command sequence.

If a manifest already exists, **resume** with status/doctor instead of re-running init.

The **setup phase** must complete before analysis begins on a fresh project. Do not run `npx oz-ui migrate analyze` until `npx oz-ui migrate init` has finished and the provider / asset scaffolding is in place.

#### Step 1: Resume or Initialize

Check if a migration is already in progress:

```bash
ls migration-manifest.json 2>/dev/null
```

**If manifest exists**, resume:

1. Run `npx oz-ui migrate status --manifest migration-manifest.json` to see progress
2. Run `npx oz-ui migrate doctor --manifest migration-manifest.json --json` to verify completed tasks
3. Report the current state to the user and ask whether to continue, fix failures, or restart

**If no manifest exists**, check for OZ packages:

- If `@openzeppelin/ui-react` is in `package.json`, the project is partially set up — skip to analysis
- Otherwise, run initialization:

If no manifest exists, run initialization before you skip to analysis. Ask the user which assistant target(s) to install if they have not already specified an `--agent-profile` value. Valid values are `standard`, `claude`, `legacy-cursor`, `all`, and `none`; there is no default.

```bash
npx oz-ui migrate init --project . --agent-profile <profiles>
```

This installs OZ packages, wires `RuntimeProvider` + `WalletStateProvider`, normalizes Tailwind, and copies agent/skill files.

Tell the user to wrap their app root with `<OzProviders>` from `src/oz/OzProviders.tsx`.

#### Step 2: Analyze

Delegate to the **migration-analyzer** subagent, or run directly:

```bash
npx oz-ui migrate analyze --project . --json --output migration-analysis.json
```

Present a summary to the user:

- Framework, router, state/styling setup, and whether OZ packages are already present
- How many components were found and how many map to OZ equivalents
- Which UI library is in use (shadcn, MUI, Chakra, etc.)
- Whether wallet libraries (wagmi, ethers) are present
- Whether storage patterns were detected
- Whether direct adapter / chain libraries (viem, ethers) were detected
- The estimated effort level (low / medium / high)
- Recommended profile (viewer / transactor / operator)

#### Step 3: User Alignment

Ask the user to confirm:

1. **Profile selection**: "Based on your wallet usage, I recommend the `transactor` profile. Confirm or override?"
2. **Assistant target selection**: "Which agent profile should the manifest use (`standard`, `claude`, `legacy-cursor`, `all`, or `none`)?"
3. **Scope**: "Migrate the entire project or a specific directory?"
4. **Ambiguous components**: For any components where the mapping is unclear, present options and ask the user to decide

Record all decisions — they will be passed to the plan command using `--decision key=value` flags and persisted in the manifest.

#### Step 4: Generate Plan

```bash
npx oz-ui migrate plan --report migration-analysis.json --json --profile <selected> [--scope <dir>] [--decision <key=value>]
```

This creates `migration-manifest.json` with all phased tasks. Show the user the plan summary and get approval before proceeding.

#### Step 5: Execute Tasks

Delegate to the **migration-executor** subagent, or run directly:

```bash
npx oz-ui migrate execute --manifest migration-manifest.json --json
```

For each pending task in the manifest, in phase order:

1. **Read the task** from the manifest
2. **Run `oz-ui migrate execute`**:
  - For deterministic tasks (`install-packages`, `wire-providers`, `tailwind-normalize`, `copy-agents`, `copy-skill`, many direct component / form-field swaps), let the CLI apply the change and update the manifest
  - For `wallet-replacement`, `storage-migration`, `schema-driven-form`, `remove-stale-deps`, and `cleanup-scaffolding`, the CLI returns manual instructions instead of pretending the task is fully automated
3. **For manual tasks**, perform the code refactor:
  - `component-replacement`: Replace imports and JSX usage, and verify the UI component replacement phase remains structurally correct
  - `wallet-replacement`: Replace wagmi/ethers hooks with OZ adapter hooks (`useRuntimeContext`, `useWalletState`)
  - `storage-migration`: Flag the file for manual review, add a TODO comment noting the affected storage keys
  - `schema-driven-form`: Review for `RenderFormSchema` / `TransactionForm` migration and verify the rendered UI
4. **Run verification**: `npx oz-ui migrate doctor --manifest migration-manifest.json --check <task-id> --json`
5. **Update manifest state explicitly for manual tasks**:
  - When verification passes: `npx oz-ui migrate complete --manifest migration-manifest.json --task <task-id>`
  - When blocked: `npx oz-ui migrate fail --manifest migration-manifest.json --task <task-id> --reason "<blocker>"`
6. **Handle failure**: When doctor **fails**, stop, report diagnostics, then **retry** after fixing the issue, or record the blocker with `migrate fail` (do not silently **rollback** committed work without agreement).

For any manual or resumed task, `npx oz-ui migrate status --manifest migration-manifest.json --next` should be treated as the source of truth for the next suggested command.

##### Wallet-Adapter Phase Precondition

**Before executing any `wallet-replacement` task**, verify that the app entry file (`src/main.tsx` or equivalent) imports `RuntimeProvider` and `WalletStateProvider` from `@openzeppelin/ui-react` — **not** from the local stub at `src/oz/runtime-providers`. If the stub is still in use, switch the entry file to use `OzProviders` from `src/oz/OzProviders.tsx` first. Failing to do this will cause a runtime `"useWalletState must be used within a WalletStateProvider"` error because OZ hooks read from a different React context than the one provided by the stub.

#### Step 6: Phase Gate

After completing all tasks in a phase:

1. Run `npx oz-ui migrate doctor --manifest migration-manifest.json --json` to verify all completed tasks
2. Delegate to the **migration-verifier** subagent for a deeper structural review if the host supports it
3. Report the verification results to the user
4. Recommend manual testing:
  - "Please verify the UI renders correctly"
  - "Please test wallet connection if applicable"
5. Only proceed to the next phase after user approval

#### Step 7: Cleanup Phase

After all migration phases are complete, the manifest includes cleanup tasks:

1. **remove-stale-deps**: Remove the source-library packages (e.g., shadcn, Chakra, MUI dependencies) that are no longer used
2. **cleanup-scaffolding**: Remove the runtime-providers stub, update the entry file import to use OzProviders directly, and commit the manifest

These are manual-review tasks. Execute them, validate with doctor, then complete/fail as usual.

#### Step 8: Completion

After all phases including cleanup are complete:

1. Run `npx oz-ui migrate status --manifest migration-manifest.json` to confirm 100% completion
2. Run `npx oz-ui migrate doctor --manifest migration-manifest.json --reconcile` for a full reconciliation pass against the codebase
3. Recommend the user:
  - Run their test suite
  - Do a visual review of the application
  - Commit the `migration-manifest.json` to version control

### Capability Threading

When replacing components that accept capability props:

```tsx
// Before
import { AddressInput } from '@/components/ui/AddressInput';
<AddressInput value={address} onChange={setAddress} />

// After — Phase 2/4a (capability-threaded, works without runtime)
import { AddressField } from '@openzeppelin/ui-components';
<AddressField value={address} onChange={setAddress} />

// After — Phase 5 (full runtime wiring)
import { AddressField } from '@openzeppelin/ui-components';
import { useRuntimeContext } from '@openzeppelin/ui-react';

const { runtime } = useRuntimeContext();
<AddressField value={address} onChange={setAddress} addressing={runtime?.addressing} />
```

Capability props are **optional** — components work without them. Thread them during Phase 5 when the runtime is fully wired.

### Important Rules

- **Never skip the manifest update** — the manifest is the single source of truth for migration state
- **Never proceed past a phase gate without user approval**
- **Commit the manifest** — it is a git artifact, not a temporary file
- **Sequential execution only** — do not run tasks in parallel (v1 constraint)
- **Structural verification only** — the doctor checks structure, not visual correctness; always recommend manual testing
- **Data migration is out of scope** — for storage tasks, replace code patterns only and flag affected storage keys for manual review

