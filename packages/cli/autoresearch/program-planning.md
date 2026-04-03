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

## Known improvement opportunities

1. **Icon library filtering** — The planner currently generates tasks for lucide-react icons. The exclusions.json must be used to filter these during task generation.
2. **React Router filtering** — Route/Link from react-router-dom should not generate component-replacement tasks.
3. **Phase assignment** — Ensure all component replacements go to the correct phase based on the component's category.
