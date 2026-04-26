# @openzeppelin/ui-cli

Consumer CLI for scaffolding, migrating, and managing OpenZeppelin UI applications.

## Installation

`oz-ui` is the binary from this package. Use **either** a global install **or** a project dev dependency, depending on how you run commands.

- **Global** (keeps `oz-ui` on your `PATH`):
  ```bash
  npm install -g @openzeppelin/ui-cli
  ```
  Then run: `oz-ui migrate init --project .`, `oz-ui --version`, etc.
- **Local to a repo** (typical for CI and the migration workflow):
  ```bash
  npm install -D @openzeppelin/ui-cli
  ```
  Then run the binary via your package manager: `npx oz-ui …`, `pnpm exec oz-ui …`, or a script that invokes `oz-ui`.

`pnpm add -D` / `yarn add -D` work the same way. The LLM migration doc assumes a local dev dependency by default, but a global install is valid and does not require `npx`/`pnpm exec`.

## Commands

The `oz-ui` binary is organized by **command group** (e.g. `oz-ui <group> …`). This README documents the groups that are available today; **additional groups will be added here** as they ship.


| Group     | Description                                                                         |
| --------- | ----------------------------------------------------------------------------------- |
| `migrate` | Move an existing React app onto the OpenZeppelin UI Kit (manifest-driven workflow). |


### `migrate`

> **Experimental** — Migration features are under active development. Do not expect perfect automation on every project. The workflow uses deterministic `oz-ui migrate` commands and has been exercised on small- to medium-sized apps; it should still beat a fully manual migration. For the full disclaimer and an **LLM-assisted** flow (prompts, manifest workflow, skills), see the [LLM-led migration reference](./docs/LLM_MIGRATION_REFERENCE.md) ([on GitHub](https://github.com/OpenZeppelin/openzeppelin-ui/blob/main/packages/cli/docs/LLM_MIGRATION_REFERENCE.md)).

All `oz-ui migrate `* subcommands support `--json` and return machine-readable payloads with an `action` field plus command-specific data. Invoke each row as `oz-ui migrate <subcommand>` (or `npx` / `pnpm exec` as needed).


| Subcommand | Description                                                                                                                                                                                                                                                                              |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `init`     | Initialize migration scaffolding: OZ packages, provider templates, Tailwind, and assistant assets. Requires `--agent-profile` to choose where skills/agents are copied (for example `standard,claude` → `.agents/skills` + `.claude/skills`, with agents under `.cursor` and `.claude`). |
| `analyze`  | Scan the project for UI components from third-party libraries (shadcn/ui, Radix, MUI, Chakra, Ant Design) and raw HTML elements, then map them to OpenZeppelin UI Kit equivalents.                                                                                                       |
| `plan`     | Generate a step-by-step migration plan based on the analysis report. Requires `--agent-profile` to match `migrate init`; it is stored in `migration-manifest.json` so `execute` / `doctor` validate the same install layout.                                                             |
| `execute`  | Execute the next dependency-safe migration task. Deterministic setup and component tasks are applied automatically; manual-review tasks return structured instructions instead of silently editing the manifest.                                                                         |
| `complete` | Mark a manually executed task as completed. By default this validates the task first with the same structural checks used by `migrate doctor`.                                                                                                                                           |
| `fail`     | Mark a task as failed and record a blocker reason in the manifest so work can be resumed cleanly later.                                                                                                                                                                                  |
| `doctor`   | Verify codebase state against the manifest, including setup wiring, component swaps, and manual-review task structure.                                                                                                                                                                   |
| `status`   | Display the current state of the migration manifest. `status --next` shows the next actionable task plus the suggested follow-up commands, such as `migrate execute`, `migrate doctor`, `migrate complete`, or `migrate fail`.                                                           |


#### End-to-end example

```bash
oz-ui migrate init --project . --agent-profile standard,claude
# Only shared .agents/skills + Cursor agents: --agent-profile standard
# Add legacy Cursor skill path: --agent-profile standard,claude,legacy-cursor
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
```

