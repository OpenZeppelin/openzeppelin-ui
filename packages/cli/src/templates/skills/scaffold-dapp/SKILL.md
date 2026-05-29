---
name: scaffold-dapp
description: >-
  Bootstrap a new React + Vite + TypeScript dApp wired to the OpenZeppelin UI Kit using `oz-ui create`
  (discovery, `--yes --json`, post-scaffold steps). Use when the user wants a greenfield OZ UI project,
  a new app directory, or to run the create flow headlessly. Not for migrating an existing app—use
  `migrate-to-oz-uikit`.
when_to_use: >-
  Empty or new project directory; user asks to scaffold, create, or start a new OpenZeppelin UI /
  oz-ui dApp; agent should run `oz-ui create` with JSON output. Decline or hand off if `package.json`
  already represents a non-greenfield app without explicit empty target and `--force`.
compatibility: >-
  Node.js 20+ recommended; npm, pnpm, or yarn; network for dependency install; optional WalletConnect
  project ID for full wallet flows.
---

# Scaffold dApp

Orchestrate the `oz-ui create` CLI: discover cwd, ask decision-oriented questions, invoke the CLI with `--yes --json`, then guide first post-scaffold edits.

## When to Use

- The user wants a **new** React + Vite + TypeScript app with `@openzeppelin/ui-*` wiring.
- The workspace is **empty**, lacks `package.json`, or the user accepts creating a **new subdirectory** for the project.
- The user needs a **repeatable agent flow** for `oz-ui create` (not the interactive TTY wizard alone).

**Do not use** when the user already has a React app to adopt OZ UI Kit on—point them to **`migrate-to-oz-uikit`** (or `oz-ui migrate init`).

## Instructions

### Prerequisites

- `@openzeppelin/ui-cli` must be invocable. Either install it globally (`npm i -g @openzeppelin/ui-cli`, then run `oz-ui ...`) or use `npx @openzeppelin/ui-cli ...` for one-off invocations. Inside an already-scaffolded project, `npx oz-ui ...` works because the CLI is pinned as a devDep.
- The user should be in a workspace directory where they intend to create a new project (typically a parent like `~/projects`). The new project will be created as a subdirectory.

### Workflow

1. **Discover** the user's cwd state (Step 1).
2. **Ask** decision-oriented questions to resolve preset, wallet, and optional features (Step 2).
3. **Confirm and invoke** `oz-ui create … --yes --json` (Step 3).
4. **Guide** through the first post-scaffold edits (Step 4).
5. **Suggest** follow-up skills (Step 5).

#### Step 1: Discovery

Check the user's cwd before asking anything:

```bash
ls package.json 2>/dev/null && grep -E '"name"|"@openzeppelin/' package.json
```

**Case A — empty directory or no `package.json`**: new-project flow. Proceed to Step 2.

**Case B — `package.json` exists with `@openzeppelin/ui-react` or `@openzeppelin/ui-components`**: the user is already on the OZ UI Kit. Ask whether they want to scaffold a *separate* new project (offer to `cd ..` first), or whether they meant to add capabilities to the existing project — in which case suggest `oz-ui add` or the `wallet-integration` / `integrate-adapter` skills.

**Case C — `package.json` exists, no OZ packages**: existing React app without OZ wiring. Reply with a plain-language explanation that `oz-ui create` is for new projects only and would clobber existing files, then suggest the user start a new session with the `migrate-to-oz-uikit` skill (or run `npx oz-ui migrate init` directly).

If the user insists on scaffolding into a non-empty directory, they can re-run `oz-ui create … --force`, but only after explicit confirmation.

Tooling context that affects flag selection:

- `pnpm-workspace.yaml` in cwd or any parent → suggest `--package-manager pnpm`
- `package.json` in a parent (monorepo) → ask whether to scaffold inside or outside the workspace
- `.npmrc` → respect any registry pinning the user has configured

#### Step 2: Targeted Questions

Ask **decision-oriented** questions, not flag-by-flag. The decision tree is exhaustive:

```
Q1: New project or adding to an existing one?
  - new      → continue to Q2
  - existing → reply with explanation + suggest migrate-to-oz-uikit (Case C)

Q2: One main page or many?
  - one page, just want to prove the wiring works   → --preset minimal
  - standard dApp dashboard (recommended default)   → --preset dapp
  - multiple routes / sidebar / app shell           → --preset app-shell
  - guided multi-step flow (RWA-style)              → --preset wizard

Q3: Wallet kit?  (skipped for --preset minimal unless the user opts in)
  - standard EVM users (RainbowKit + wagmi)         → --wallet rainbowkit
  - custom kit / multi-chain later / DIY            → --wallet custom
  - read-only or no wallet at all                   → --wallet none
```

**Never ask about features the preset already implies.** `dapp` includes `wallet`, `theme`, `toasts`, `tooltips`, and `status-panel`. Only surface optional toggles (`--with sidebar`, `--without status-panel`) when the user mentions related needs.

If the user describes their app vaguely, map intent to flags inline:

- "wizard", "multi-step", "guided flow" → `--preset wizard`
- "dashboard", "main app screen" → `--preset dapp`
- "admin console", "multiple sections", "sidebar" → `--preset app-shell` (sidebar implied)
- "just trying it out", "minimum viable wiring" → `--preset minimal`
- Non-EVM ecosystem (Stellar, Polkadot, Solana, Midnight) → flag the v1 EVM-only limitation and ask whether to proceed with EVM scaffolding now and swap adapters later.

#### Step 3: Confirmation and Invocation

Summarize the resolved flag set in plain language (e.g. "preset: dapp · wallet: rainbowkit · in directory `my-dapp/`") and get explicit user confirmation. Then run the CLI in headless mode:

```bash
oz-ui create my-dapp --preset dapp --wallet rainbowkit --yes --json
# or, without a global install:
npx @openzeppelin/ui-cli create my-dapp --preset dapp --wallet rainbowkit --yes --json
```

Always pass `--yes --json` for agent-driven runs; the interactive form expects a TTY.

Validate the JSON envelope before continuing:

- `ok: true` — proceed.
- `ok: false` — surface the `error` field verbatim and stop. Do not retry automatically; the user may need to fix flag values, free up the target directory, or pass `--force`.
- `schemaVersion` — refuse to operate on a payload whose major version is newer than the one this skill was authored against (`1.x`).
- `cli: { name, version }` — surface the version in the success message.

Surface to the user in plain language (not a raw JSON dump):

- **Files written** — count plus the most relevant paths (`src/main.tsx`, `src/App.tsx`, `src/oz/OzProviders.tsx` when wallet is enabled). From `filesWritten`.
- **Implied features** — e.g. "router was added because you chose sidebar". From `impliedFeatures`.
- **Install status** — whether `installRan` succeeded; if not, surface the `installCommand` for manual run.
- **Next steps** — verbatim from `nextSteps`.

#### Step 4: Post-Scaffold Guidance

Walk the user through the first real edits, in priority order. Skip steps that don't apply (e.g. step 1 when `--wallet none` was selected).

1. **Replace the WalletConnect placeholder** in `public/app.config.json`:
   - Look for `"projectId": "YOUR_WALLETCONNECT_PROJECT_ID_HERE"`.
   - Replace with a real project ID from [https://cloud.walletconnect.com/](https://cloud.walletconnect.com/), or set `VITE_APP_CFG_GLOBAL_SERVICE_CONFIGS_WALLETCONNECT_PROJECT_ID` in `.env.local`.
2. **Pick the runtime profile** in `src/oz/runtime.ts`:
   - Default is `composer` (read + write + sign).
   - Use `viewer` for read-only apps (skips wallet UI), `transactor` for sends-only apps (skips read-display paths).
3. **Run the dev server**:
   ```bash
   cd <project-name>
   <package-manager> run dev
   ```
   The localhost URL printed by Vite is the success signal.
4. **Add a contract interaction**:
   - For `RenderFormSchema` / `TransactionForm`-driven flows, suggest the `form-schema-builder` skill.
   - For hand-rolled `useReadContract` / `useWriteContract`, point at `@openzeppelin/ui-react` examples.

#### Step 5: Suggest Follow-ups

Once the dev server boots and WalletConnect is wired, the scaffold flow is complete. Optionally suggest:

- **`migrate-to-oz-uikit`** — if the user has *another* React app to migrate onto the OZ UI Kit.
- **`oz-ui add adapter <ecosystem>`** — for adding a chain adapter later.
- **`oz-ui doctor`** — for validating the project's wiring after manual edits.

### Important Rules

- **Always run `oz-ui create` with `--yes --json`** when invoking from this skill. Never simulate the interactive prompts.
- **Validate `schemaVersion` and `cli.version`** on every JSON envelope. Refuse newer major schema versions.
- **Never delegate to or invoke another skill silently.** Skill-to-skill handoff is always a recommendation; let the user start a new session.
- **Never scaffold into a non-empty directory without `--force` and explicit user confirmation.** The CLI rejects this by default; respect that default.
- **The decision tree is exhaustive.** If you're asking outside Q1/Q2/Q3 or producing an undocumented flag combination, stop and re-read this file.
- **Do not modify the generated project's wiring during the skill's run.** The CLI owns `src/oz/`, `src/main.tsx`, `src/App.tsx`, and the Tailwind setup. Re-run the CLI with different flags rather than hand-editing.
