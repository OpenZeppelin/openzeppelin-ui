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
| `create`  | Scaffold a Vite + React + TypeScript app with selectable OpenZeppelin UI wiring.    |
| `migrate` | Move an existing React app onto the OpenZeppelin UI Kit (manifest-driven workflow). |


### `create`

`oz-ui create` generates a Vite + React + TypeScript app with OpenZeppelin UI styles and optional runtime, wallet, routing, sidebar, and wizard wiring. Human mode uses a guided prompt flow; agents and CI should pass flags plus `--yes --json`.

The create internals use normalized layout/content recipes so feature combinations such as `--preset wizard --with sidebar` keep the wizard as the primary content while changing only the surrounding shell. See the [create recipes architecture](./docs/CREATE_RECIPES.md).


| Preset      | Description                                                                                                       |
| ----------- | ----------------------------------------------------------------------------------------------------------------- |
| `minimal`   | Vite + React + TypeScript, Tailwind v4, OZ styles/components, small landing page, no wallet/runtime/router.       |
| `dapp`      | Default. Adds `RuntimeProvider`, `WalletStateProvider`, EVM runtime, custom wallet UI, app config, and status UI. |
| `app-shell` | Adds React Router, sidebar/header/footer shell, and placeholder routes. Sidebar implies router.                   |
| `wizard`    | Adds a generic multi-step wizard shell for guided workflows.                                                      |


Key options:


| Option                 | Description                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| `--preset <name>`      | `minimal`, `dapp`, `app-shell`, or `wizard`. Defaults to `dapp`.                              |
| `--wallet <kit>`       | `custom`, `rainbowkit`, or `none`. Defaults to `custom` except for `minimal`.                 |
| `--ecosystem <name>`   | Target ecosystem. V1 supports `evm`.                                                          |
| `--routing <mode>`     | `none` or `react-router`. `app-shell` / `sidebar` scaffolds require `react-router`.           |
| `--with <features>`    | Comma-separated features to include, such as `router,sidebar,theme,toasts,status-panel`.      |
| `--without <features>` | Comma-separated features to exclude, such as `wallet` or `toasts`. Contradictions are errors. |
| `--skip-install`       | Generate files without running the package manager install command.                           |
| `--force`              | Overwrite generated files in a non-empty target directory.                                    |
| `--yes`                | Use resolved defaults and skip interactive prompts.                                           |
| `--json`               | Emit a machine-readable payload with `action: "create"`.                                      |


Examples:

```bash
oz-ui create my-app
oz-ui create my-app --preset minimal
oz-ui create my-app --preset app-shell
oz-ui create my-app --wallet rainbowkit
oz-ui create my-app --preset dapp --ecosystem evm --wallet custom --json --yes --skip-install
```

Generated apps keep OpenZeppelin-specific integration code in `src/oz/` so it is easy to inspect and extend:

- `src/oz/OzProviders.tsx` wires `RuntimeProvider` and `WalletStateProvider`
- `src/oz/runtime.ts` owns adapter/runtime and network resolution
- `src/oz/config.ts` initializes `appConfigService`
- `public/app.config.json` stores runtime service defaults

Create documentation:

- [Create generation matrix](./docs/CREATE_MATRIX.md) - User-facing matrix of presets, options, features, generated files, and combinations.
- [Create recipes architecture](./docs/CREATE_RECIPES.md) - How `oz-ui create` resolves presets, layouts, content, and feature combinations.

### `migrate`

> **Experimental** — Migration features are under active development. Do not expect perfect automation on every project. The workflow uses deterministic `oz-ui migrate` commands and has been exercised on small- to medium-sized apps; it should still beat a fully manual migration. For the full disclaimer and an **LLM-assisted** flow (prompts, manifest workflow, skills), see the [LLM-led migration reference](./docs/LLM_MIGRATION_REFERENCE.md) ([on GitHub](https://github.com/OpenZeppelin/openzeppelin-ui/blob/main/packages/cli/docs/LLM_MIGRATION_REFERENCE.md)).

All `oz-ui migrate` * subcommands support `--json` and return machine-readable payloads with an `action` field plus command-specific data. Invoke each row as `oz-ui migrate <subcommand>` (or `npx` / `pnpm exec` as needed).


| Subcommand | Description                                                                                                                                                                                                                                                                              |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `init`     | Initialize migration scaffolding: OZ packages, provider templates, Tailwind, and assistant assets. Requires `--agent-profile` to choose where skills/agents are copied (for example `standard,claude` → `.agents/skills` + `.claude/skills`, with agents under `.cursor` and `.claude`). |
| `analyze`  | Scan the project for UI components from third-party libraries (shadcn/ui, Radix, MUI, Chakra, Ant Design) and raw HTML elements, then map them to OpenZeppelin UI Kit equivalents.                                                                                                       |
| `plan`     | Generate a step-by-step migration plan based on the analysis report. Uses the same assistant profiles as the initial `migrate init` (read from the manifest; no `--agent-profile` flag).                                                                                                 |
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

## JSON output envelope

Every `oz-ui --json` payload (success **and** error) ships with a stable envelope so agents and CI can detect drift without parsing command-specific fields:


| Field               | Description                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| `schemaVersion`     | Semantic version of the JSON envelope contract. Bumped on breaking changes to the agent-facing payloads. |
| `cli.name`          | Always `@openzeppelin/ui-cli`.                                                                           |
| `cli.version`       | Version of the binary that produced the output.                                                          |
| `ok`                | `true` for successful runs, `false` for errors.                                                          |
| `action`            | Command identifier such as `create`, `migrate-init`, `migrate-analyze`. Absent on error payloads.        |


Example success payload (truncated):

```json
{
  "schemaVersion": "1.0.0",
  "cli": { "name": "@openzeppelin/ui-cli", "version": "0.1.0" },
  "ok": true,
  "action": "create",
  "preset": "dapp",
  "filesWritten": ["package.json", "src/main.tsx", "src/App.tsx"]
}
```

Example error payload:

```json
{
  "schemaVersion": "1.0.0",
  "cli": { "name": "@openzeppelin/ui-cli", "version": "0.1.0" },
  "ok": false,
  "error": "Project name is required."
}
```

Agent guidance: read `schemaVersion` once at startup and refuse to operate when the major version is newer than supported, mirroring the `migration-manifest.json` versioning model.

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm --filter @openzeppelin/ui-cli build

# Run tests
pnpm --filter @openzeppelin/ui-cli test
```

