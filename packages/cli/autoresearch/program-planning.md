# Program: Improve OZ Migration Plan Generation

You are an autonomous research agent improving the plan generation quality of the `@openzeppelin/ui-cli` migration planner. Your goal is to **maximize the gated composite score** across all benchmark fixtures.

## Setup

You are working inside `packages/cli/` of the `openzeppelin-ui` monorepo.

**Evaluation metric:** Gated composite score:
- If `forbidden_ratio > 0.1` → total is capped at 0.5
- Otherwise: `Task F1 (70%) + Phase order accuracy (30%)`
- Task F1 is computed on `(task_type, source_component, target_component)` tuples
- Phase order accuracy = fraction of tasks assigned to the correct phase

**Run the evaluation:**
```bash
npx tsx autoresearch/evaluate.ts --capability planning
```

**Run the safety gate (tests):**
```bash
pnpm test
```

**Current baseline:** composite ≈ 0.981. Component task F1 is perfect but wallet task scoring reveals gaps: sub-path pattern tasks (wagmi/chains, viem/accounts) are not generated, and the planner doesn't filter type-only viem imports from wallet migration tasks.

## Editable Surface

You may ONLY modify these files:

1. `src/commands/migrate/plan.ts` — Plan generation command
2. `src/planning/generate.ts` — Core plan generation logic
3. `src/catalog/exclusions.json` — Library/component exclusion list

**You MUST NOT edit:**
- `autoresearch/evaluate.ts` or `autoresearch/capabilities/*`
- `autoresearch/expected/**`
- `autoresearch/fixtures/**`
- Any test files

## Experimentation

Follow the same loop: analyze → hypothesize → implement → test → evaluate → keep/discard.

Append each experiment line to `autoresearch/results-planning.tsv`.

## Source classification rules

Before changing task-generation behavior for any import source, classify what kind of source it is:

1. **Local path aliases** — imports like `@/foo`, `~/foo`, or other aliases that resolve to the fixture's own source tree.
2. **Workspace-local packages** — imports declared via `workspace:*`, monorepo package references, or other local package links. These are part of the migration surface and **must be planned for migration** unless explicitly excluded elsewhere.
3. **External libraries** — third-party dependencies that are not maintained as part of the local workspace.

When the source type is not obvious, inspect the fixture's `package.json`, `tsconfig*.json`, and bundler config (`vite.config.*`, `webpack.config.*`, etc.) before forming a hypothesis.

## Guardrails for exclusions

Do not add fixture-shaped task exclusions such as `source === 'X' && component === 'Y'` unless the rule reflects a real product invariant rather than a benchmark optimization.

Before excluding an import source or component family from planning, verify and document:

1. Whether it is a local alias, workspace-local package, or external library.
2. Why it should be excluded from migration planning as a product rule.
3. Why a broader source-classification rule would not be more correct than a one-off exclusion.

## Known improvement opportunities

1. **Icon library filtering** — The planner currently generates tasks for lucide-react icons. The exclusions.json must be used to filter these during task generation.
2. **React Router filtering** — Route/Link from react-router-dom should not generate component-replacement tasks.
3. **Phase assignment** — Ensure all component replacements go to the correct phase based on the component's category.
4. **Workspace package imports are in scope** — local monorepo packages imported as packages (for example via `workspace:*`) must generate migration tasks when they map to the OZ migration surface.
