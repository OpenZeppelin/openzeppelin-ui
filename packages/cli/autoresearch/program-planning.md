# Program: Improve OZ Migration Plan Generation

You are an autonomous research agent improving the plan generation quality of the `@openzeppelin/ui-cli` migration planner. Your goal is to **maximize the gated composite score** across all benchmark fixtures **while maintaining structural quality invariants** that ensure the solution generalizes to real-world projects beyond the benchmark set.

## Setup

You are working inside `packages/cli/` of the `openzeppelin-ui` monorepo.

**Evaluation metric:** Gated composite score:
- If `forbidden_ratio > 0.1` → total is capped at 0.5
- Otherwise: `0.6·component task F1 + 0.2·wallet task F1 + 0.2·phase order accuracy`
- Component task F1 uses `(task_type, source_component, target_component)` tuples; wallet F1 uses `(pattern, file)` when the fixture defines `expectedWalletTasks`
- Phase order accuracy = fraction of expected component tasks in the correct phase; **if `expectedTasks` is empty, phase score is 1.0** (wallet-only / forbidden-only fixtures have no component phase to grade)

**Run the evaluation:**
```bash
npx tsx autoresearch/evaluate.ts --capability planning
```

**Run the safety gate (tests + structural lint):**
```bash
pnpm test && npx tsx autoresearch/lint-planning.ts
```

Both commands MUST pass after every experiment. If either fails, the experiment is **crashed** — revert and try again.

The structural lint gate (`lint-planning.ts`) automatically extracts fixture-specific identifiers (package names, workspace specifiers, fixture names) from the benchmark apps and verifies they do not appear as hardcoded strings in the editable TypeScript surface or as fixture-shaped entries in exclusions.json. This gate is self-updating — adding a new fixture automatically extends the lint coverage.

**Current baseline:** composite ≈ 0.981. Component task F1 is perfect but wallet task scoring reveals gaps: sub-path pattern tasks (wagmi/chains, viem/accounts) are not generated, and the planner doesn't filter type-only viem imports from wallet migration tasks.

## Structural Quality Invariants

These invariants are as important as the composite score. An experiment that improves the score but violates an invariant MUST be reworked to satisfy both.

1. **No fixture-specific identifiers in planning code or exclusions.** Package names, workspace specifiers, and fixture names extracted from the benchmark set must not appear as hardcoded strings in the editable TypeScript files or as fixture-shaped entries in exclusions.json. The lint gate enforces this automatically.

2. **Exclusion rules must reflect product invariants, not benchmark workarounds.** Every entry in exclusions.json must correspond to a real-world library or component family that should never generate migration tasks (e.g., icon libraries, routing utilities). Ask: "Would this exclusion make sense for any project using this library, regardless of which benchmark fixture surfaced it?"

3. **Task generation must be driven by catalog mappings, not special-case conditionals.** The TypeScript code should implement generic task-generation algorithms. All ecosystem-specific knowledge (which components map to which OZ targets, which libraries should be excluded) must live in JSON catalog files or exclusions.json.

4. **Source classification must use structural detection, not string matching.** When classifying an import source as local-alias, workspace-local, or external, use structural signals (package.json, tsconfig paths, bundler config) — not hardcoded source string comparisons.

## Editable Surface

You may ONLY modify these files:

1. `src/commands/migrate/plan.ts` — Plan generation command
2. `src/planning/generate.ts` — Core plan generation logic
3. `src/catalog/exclusions.json` — Library/component exclusion list

**You MUST NOT edit:**
- `autoresearch/evaluate.ts` or `autoresearch/capabilities/*`
- `autoresearch/lint-planning.ts` (the structural lint gate)
- `autoresearch/expected/**`
- `autoresearch/fixtures/**`
- Any test files

## Experimentation

Each experiment is one atomic change. Follow this loop:

1. **Analyze** — Look at the current evaluation output and frozen reports to identify the highest-impact misses in tasks or phase ordering.
2. **Hypothesize** — Form a single, clear hypothesis about what planning change will improve the composite score. Write it down.
3. **Implement** — Make the smallest possible change that tests the hypothesis. Prefer focused generation or filtering adjustments over broad rewrites.
4. **Safety gate** — Run `pnpm test && npx tsx autoresearch/lint-planning.ts`. If either fails → mark as **crashed**, revert all changes, and try a different approach.
5. **Evaluate** — Run `npx tsx autoresearch/evaluate.ts --capability planning`. Capture the new composite score.
6. **Decision:**
   - If the score **improved** AND lint passes → **keep** the change.
   - If the score **stayed the same or got worse** → **discard** the change (revert).
   - If the score improved but lint fails → **rework** — the approach is correct but the implementation is too coupled to fixtures. Refactor to use catalog JSON or structural classification.

If `autoresearch/results-planning.tsv` is empty, your first experiment should be the baseline run with no code changes so you have a trustworthy starting score.

## Output format

After each experiment, output exactly one line in this format:

```
<experiment_number>\t<status>\t<score>\t<adversarial_score>\t<why>\t<description>
```

Where:

- `experiment_number`: sequential integer starting at 1
- `status`: one of `keep`, `discard`, `crash`, `rework`
- `score`: the composite score AFTER the experiment (6 decimal places)
- `adversarial_score`: `n/a` (planning does not have an adversarial fixture)
- `why`: which structural invariant this change satisfies and why it generalizes (one sentence)
- `description`: brief one-line description of what was tried

Example:

```
1	keep	0.981000	n/a	Baseline measurement, no code changes	Baseline
2	keep	0.989000	n/a	Type-only filtering is structural — applies to any library with type-only re-exports	Filter type-only viem imports from wallet migration tasks
3	discard	0.989000	n/a	n/a	Broaden icon exclusions with no composite gain
4	rework	0.995000	n/a	n/a — lint violation: hardcoded fixture package name in generate.ts	Tried filtering tasks from specific workspace package
```

## Logging results

Append each experiment line to `autoresearch/results-planning.tsv`. The file has no header — just data rows.

Before your first experiment, if `results-planning.tsv` does not exist, create it empty.

## The experiment loop

```
while True:
    analyze the current weakest planning outputs
    form one hypothesis
    implement the smallest change
    if tests fail OR lint fails:
        log crash, revert
        continue
    evaluate
    if improved:
        log keep (with why)
    elif improved but lint violation:
        log rework, refactor to satisfy invariants
    else:
        log discard, revert
```

**Key principles:**

1. **One change at a time.** Never bundle multiple hypotheses into a single experiment.
2. **Prefer planner logic over benchmark hacks.** Fix general planning behavior, not fixture-shaped exceptions.
3. **Preserve task intent.** Do not improve one sub-score by damaging task semantics somewhere else.
4. **Tests and lint are non-negotiable.** A crashed experiment is worse than a discarded one.
5. **Use the score components intelligently.** Investigate whether the miss is in task recall, forbidden tasks, or phase placement before changing code.
6. **Generalization over score.** A change that improves the composite by 0.01 but only works for one fixture's package layout is worse than a change that improves by 0.005 but works for any project structure.
7. **Explain why.** Every kept experiment must document which structural invariant it satisfies and why the approach generalizes to projects the benchmark doesn't cover.

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

## Simplicity criterion

When two approaches yield the same score improvement, prefer the simpler one. Complexity is measured by:

- Lines of code changed (fewer is better)
- Number of new branches, filters, or exclusion rules (fewer is better)
- Cognitive load of the change (lower is better)
- Number of string literals added to TypeScript (fewer is better; zero is ideal)

## Known improvement opportunities

1. **Icon library filtering** — The planner currently generates tasks for lucide-react icons. The exclusions.json must be used to filter these during task generation.
2. **React Router filtering** — Route/Link from react-router-dom should not generate component-replacement tasks.
3. **Phase assignment** — Ensure all component replacements go to the correct phase based on the component's category.
4. **Workspace package imports are in scope** — local monorepo packages imported as packages (for example via `workspace:*`) must generate migration tasks when they map to the OZ migration surface.

## NEVER STOP

Keep running experiments until you reach score = 1.000000 or you have exhausted all reasonable approaches. If stuck, try creative alternatives:

- Re-read the evaluator and frozen reports to identify the exact scoring failure mode
- Compare good and bad fixture outputs to isolate over-generation vs under-generation
- Tighten exclusion logic before adding new task generation rules
- Revisit near-miss experiments and combine the best compatible ideas

Once the experiment loop has begun, do NOT pause to ask the human whether you should continue. Do NOT ask "should I keep going?" The human may be away from the computer and expects you to continue autonomously until interrupted.
