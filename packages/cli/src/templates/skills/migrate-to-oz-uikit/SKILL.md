# migrate-to-oz-uikit

Migrate an existing React application to the OpenZeppelin UI Kit. This skill orchestrates the full migration lifecycle using CLI commands and specialized subagents.

## Prerequisites

- `@openzeppelin/ui-cli` (`oz-ui`) must be installed globally or locally
- The project must be a React application with a `package.json`

## Workflow

### Ordered pipeline

For a full migration, keep this sequence (each step builds on the last):

1. **`oz-ui migrate init`** — when there is no `migration-manifest.json` yet and OpenZeppelin UI packages are not wired (see Step 1).
2. **`oz-ui migrate analyze`** — scan the repo; produce `migration-analysis.json`.
3. **Align** with the user on profile, scope, and ambiguous mappings (decisions inform the plan).
4. **`oz-ui migrate plan`** — produce `migration-manifest.json` with phased tasks.
5. **Execute** tasks from the manifest in phase order (code edits), using **`oz-ui migrate doctor`** after each task or batch to verify structure before continuing.
6. **Complete** with **`oz-ui migrate status`** and a full **`oz-ui migrate doctor`** pass on the manifest.

If a manifest already exists, **resume** with status/doctor instead of re-running init.

### Step 1: Resume or Initialize

Check if a migration is already in progress:

```bash
ls migration-manifest.json 2>/dev/null
```

**If manifest exists**, resume:
1. Run `oz-ui migrate status --manifest migration-manifest.json` to see progress
2. Run `oz-ui migrate doctor --manifest migration-manifest.json --json` to verify completed tasks
3. Report the current state to the user and ask whether to continue, fix failures, or restart

**If no manifest exists**, check for OZ packages:
- If `@openzeppelin/ui-react` is in `package.json`, the project is partially set up — skip to analysis
- Otherwise, run initialization:

```bash
oz-ui migrate init --project .
```

This installs OZ packages, wires `RuntimeProvider` + `WalletStateProvider`, normalizes Tailwind, and copies agent/skill files.

Tell the user to wrap their app root with `<OzProviders>` from `src/oz/OzProviders.tsx`.

### Step 2: Analyze

Delegate to the **migration-analyzer** subagent, or run directly:

```bash
oz-ui migrate analyze --project . --json --output migration-analysis.json
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

### Step 3: User Alignment

Ask the user to confirm:
1. **Profile selection**: "Based on your wallet usage, I recommend the `transactor` profile. Confirm or override?"
2. **Scope**: "Migrate the entire project or a specific directory?"
3. **Ambiguous components**: For any components where the mapping is unclear, present options and ask the user to decide

Record all decisions — they will be passed to the plan command using `--decision key=value` flags and persisted in the manifest.

### Step 4: Generate Plan

```bash
oz-ui migrate plan --report migration-analysis.json --json --profile <selected> [--scope <dir>] [--decision <key=value>]
```

This creates `migration-manifest.json` with all phased tasks. Show the user the plan summary and get approval before proceeding.

### Step 5: Execute Tasks

For each pending task in the manifest, in phase order:

1. **Read the task** from the manifest
2. **Execute the migration** — this is the actual code refactoring:
   - For `component-replacement`: Replace imports and JSX usage, translate props, thread capability props from `useRuntimeContext()`
   - For `form-field-replacement`: Replace form field imports, connect `addressing` / `typeMapping` capabilities as optional props
   - For `wallet-replacement`: Replace wagmi/ethers hooks with OZ adapter hooks (`useRuntimeContext`, `useWalletState`)
   - For `storage-migration`: Flag the file for manual review, add a TODO comment noting the affected storage keys
3. **Update the manifest**: Mark the task as `completed` or `failed`
4. **Run verification**: `oz-ui migrate doctor --manifest migration-manifest.json --check <task-id> --json`
5. **Handle failure**: When doctor **fails**, stop, report diagnostics, then **retry** after fixing the issue, or skip / fix manually with explicit user consent (do not silently **rollback** committed work without agreement).

### Step 6: Phase Gate

After completing all tasks in a phase:

1. Delegate to the **migration-verifier** subagent for a deeper structural review
2. Report the verification results to the user
3. Recommend manual testing:
   - "Please verify the UI renders correctly"
   - "Please test wallet connection if applicable"
4. Only proceed to the next phase after user approval

### Step 7: Completion

After all phases are complete:
1. Run `oz-ui migrate status --manifest migration-manifest.json` or `oz-ui migrate status --manifest migration-manifest.json --next` for the next actionable task
2. Run `oz-ui migrate doctor --manifest migration-manifest.json` for a full verification pass
3. Recommend the user:
   - Run their test suite
   - Do a visual review of the application
   - Commit the `migration-manifest.json` to version control

## Capability Threading

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

## Important Rules

- **Never skip the manifest update** — the manifest is the single source of truth for migration state
- **Never proceed past a phase gate without user approval**
- **Commit the manifest** — it is a git artifact, not a temporary file
- **Sequential execution only** — do not run tasks in parallel (v1 constraint)
- **Structural verification only** — the doctor checks structure, not visual correctness; always recommend manual testing
- **Data migration is out of scope** — for storage tasks, replace code patterns only and flag affected storage keys for manual review
