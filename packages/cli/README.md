# @openzeppelin/ui-cli

Consumer CLI for scaffolding, migrating, and managing OpenZeppelin UI applications.

## Installation

```bash
npm install -g @openzeppelin/ui-cli
```

## Commands

The `oz-ui` binary is organized by **command group** (e.g. `oz-ui <group> …`). This README documents the groups that are available today; **additional groups will be added here** as they ship.


| Group     | Description                                                                         |
| --------- | ----------------------------------------------------------------------------------- |
| `migrate` | Move an existing React app onto the OpenZeppelin UI Kit (manifest-driven workflow). |


### `migrate`

> **Experimental** — Migration features are under active development. Do not expect perfect automation on every project. The workflow uses deterministic `oz-ui migrate` commands and has been exercised on small- to medium-sized apps; it should still beat a fully manual migration. For the full disclaimer and an **LLM-assisted** flow (prompts, manifest workflow, skills), see the [LLM-led migration reference](./docs/LLM_MIGRATION_REFERENCE.md) ([on GitHub](https://github.com/OpenZeppelin/openzeppelin-ui/blob/main/packages/cli/docs/LLM_MIGRATION_REFERENCE.md)).

All `oz-ui migrate `* subcommands support `--json` and return machine-readable payloads with an `action` field plus command-specific data. Invoke each row as `oz-ui migrate <subcommand>` (or `npx` / `pnpm exec` as needed).


| Subcommand | Description                                                                                                                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `init`     | Initialize a migration manifest for the current project. Detects framework, package manager, and existing dependencies.                                                                                                        |
| `analyze`  | Scan the project for UI components from third-party libraries (shadcn/ui, Radix, MUI, Chakra, Ant Design) and raw HTML elements, then map them to OpenZeppelin UI Kit equivalents.                                             |
| `plan`     | Generate a step-by-step migration plan based on the analysis report.                                                                                                                                                           |
| `execute`  | Execute the next dependency-safe migration task. Deterministic setup and component tasks are applied automatically; manual-review tasks return structured instructions instead of silently editing the manifest.               |
| `complete` | Mark a manually executed task as completed. By default this validates the task first with the same structural checks used by `migrate doctor`.                                                                                 |
| `fail`     | Mark a task as failed and record a blocker reason in the manifest so work can be resumed cleanly later.                                                                                                                        |
| `doctor`   | Verify codebase state against the manifest, including setup wiring, component swaps, and manual-review task structure.                                                                                                         |
| `status`   | Display the current state of the migration manifest. `status --next` shows the next actionable task plus the suggested follow-up commands, such as `migrate execute`, `migrate doctor`, `migrate complete`, or `migrate fail`. |


#### End-to-end example

```bash
oz-ui migrate init --project .
oz-ui migrate analyze --project . --json --output migration-analysis.json
oz-ui migrate plan --report migration-analysis.json --json
oz-ui migrate status --manifest migration-manifest.json --next
oz-ui migrate execute --manifest migration-manifest.json
```

For manual-review tasks:

```bash
oz-ui migrate doctor --manifest migration-manifest.json --check <task-id> --json
oz-ui migrate complete --manifest migration-manifest.json --task <task-id>
# or, if blocked
oz-ui migrate fail --manifest migration-manifest.json --task <task-id> --reason "<blocker>"
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm --filter @openzeppelin/ui-cli build

# Run tests
pnpm --filter @openzeppelin/ui-cli test

# Run evaluation harness
pnpm --filter @openzeppelin/ui-cli evaluate

# Start autoresearch dashboard
pnpm --filter @openzeppelin/ui-cli dashboard
```

## Autoresearch

The CLI includes an autonomous experiment loop for improving component detection accuracy. An AI agent iteratively modifies detection logic, evaluates against benchmark fixtures, and keeps only changes that improve the F1 score — with a real-time dashboard for monitoring.

See [autoresearch/README.md](autoresearch/README.md) for the full workflow and documentation.