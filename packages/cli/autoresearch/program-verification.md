# Program: Improve OZ Migration Verification (Doctor)

You are an autonomous research agent improving the `oz-ui migrate doctor` verification checker. Your goal is to **maximize the composite score** (classification accuracy + diagnostic precision) across all verification fixtures.

## Setup

You are working inside `packages/cli/` of the `openzeppelin-ui` monorepo.

**Evaluation metric:** `(classification_accuracy * 0.6) + (diagnostic_precision * 0.4)`
- Classification accuracy: fraction of fixtures correctly classified as pass/fail
- Diagnostic precision: for broken fixtures, fuzzy keyword match on diagnostics

**Run the evaluation:**
```bash
npx tsx autoresearch/evaluate.ts --capability verification
```

**Run the safety gate (tests):**
```bash
pnpm test
```

**Current baseline:** mean_score ≈ 0.619. The checker correctly handles basic cases but misclassifies: aliased old imports (mixed-import-sources), wrong OZ package (ui-react vs ui-components), and stale raw HTML elements alongside OZ components.

## Editable Surface

You may ONLY modify:

1. `src/verification/checker.ts` — The core verification logic

**You MUST NOT edit:**
- `autoresearch/evaluate.ts` or `autoresearch/capabilities/*`
- `autoresearch/expected/**`
- Any test files

## Experimentation

Each experiment is one atomic change. Follow this loop:

1. **Analyze** — Look at the current evaluation output to identify which fixtures are misclassified or which diagnostics are too vague.
2. **Hypothesize** — Form a single, clear hypothesis about what verification change will improve the composite score. Write it down.
3. **Implement** — Make the smallest possible change that tests the hypothesis. Prefer focused checker improvements over broad rewrites.
4. **Test** — Run `pnpm test`. If tests fail → mark as **crash**, revert all changes, and try a different approach.
5. **Evaluate** — Run `npx tsx autoresearch/evaluate.ts --capability verification`. Capture the new composite score.
6. **Decision:**
  - If the score **improved** (even slightly) → **keep** the change.
  - If the score **stayed the same or got worse** → **discard** the change (revert).

If `autoresearch/results-verification.tsv` is empty, your first experiment should be the baseline run with no code changes so you have a trustworthy starting score.

## Output format

After each experiment, output exactly one line in this format:

```
<experiment_number>\t<status>\t<score>\t<description>
```

Where:

- `experiment_number`: sequential integer starting at 1
- `status`: one of `keep`, `discard`, `crash`
- `score`: the composite score AFTER the experiment (6 decimal places)
- `description`: brief one-line description of what was tried

Example:

```
1	keep	0.619000	Baseline
2	keep	0.702000	Detect stale aliased old imports alongside OZ imports
3	discard	0.702000	Add broad provider warnings with no precision gain
```

## Logging results

Append each experiment line to `autoresearch/results-verification.tsv`. The file has no header — just data rows.

Before your first experiment, if `results-verification.tsv` does not exist, create it empty.

## The experiment loop

```
while True:
    analyze the current weakest verification outcomes
    form one hypothesis
    implement the smallest change
    if tests fail:
        log crash, revert
        continue
    evaluate
    if improved:
        log keep
    else:
        log discard, revert
```

**Key principles:**

1. **One change at a time.** Never bundle multiple hypotheses into a single experiment.
2. **Prefer precise diagnostics.** A correct failure with a useful message is better than a noisy generic warning.
3. **Avoid benchmark-shaped special cases.** Fix general verification behavior, not fixture-specific conditions.
4. **Tests are non-negotiable.** A crashed experiment is worse than a discarded one.
5. **Respect source classification.** Verification must align with real migration scope, especially for workspace-local packages.

## Source classification rules

Before changing verification behavior for any import source, classify what kind of source it is:

1. **Local path aliases** — imports like `@/foo`, `~/foo`, or other aliases that resolve to the fixture's own source tree.
2. **Workspace-local packages** — imports declared via `workspace:*`, monorepo package references, or other local package links. These are part of the migration surface and **must be verified as migratable sources** unless explicitly excluded elsewhere.
3. **External libraries** — third-party dependencies that are not maintained as part of the local workspace.

When the source type is not obvious, inspect the fixture's `package.json`, `tsconfig*.json`, and bundler config (`vite.config.*`, `webpack.config.*`, etc.) before forming a hypothesis.

## Guardrails for exclusions

Do not add fixture-shaped exclusions such as `source === 'X' && component === 'Y'` unless the rule reflects a real product invariant rather than a benchmark optimization.

Before excluding an import source or component family from verification, verify and document:

1. Whether it is a local alias, workspace-local package, or external library.
2. Why it should be excluded from verification as a product rule.
3. Why a broader source-classification rule would not be more correct than a one-off exclusion.

## Simplicity criterion

When two approaches yield the same score improvement, prefer the simpler one. Complexity is measured by:

- Lines of code changed (fewer is better)
- Number of new diagnostic branches or heuristics (fewer is better)
- Cognitive load of the change (lower is better)

## Known improvement opportunities

1. **Orphaned import detection** — The checker should detect when old (non-OZ) imports of a component still exist alongside the new OZ import.
2. **Diagnostic specificity** — Error messages should name the specific component and what's wrong.
3. **Provider hierarchy validation** — Check that providers are nested in the correct order.
4. **Workspace package imports are in scope** — local monorepo packages imported as packages (for example via `workspace:*`) must be validated as migration sources, not treated like remote third-party packages by default.

## NEVER STOP

Keep running experiments until you reach score = 1.000000 or you have exhausted all reasonable approaches. If stuck, try creative alternatives:

- Re-read the evaluator output to separate misclassification failures from diagnostic-quality failures
- Tighten existing checks before adding brand new diagnostic families
- Compare pass and fail fixtures to isolate the minimum signal needed for a correct verdict
- Revisit near-miss experiments and combine the best compatible ideas

Once the experiment loop has begun, do NOT pause to ask the human whether you should continue. Do NOT ask "should I keep going?" The human may be away from the computer and expects you to continue autonomously until interrupted.
