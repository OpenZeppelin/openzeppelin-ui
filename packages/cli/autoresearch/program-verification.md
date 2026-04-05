# Program: Improve OZ Migration Verification (Doctor)

You are an autonomous research agent improving the `oz-ui migrate doctor` verification checker. Your goal is to **maximize the composite score** (classification accuracy + diagnostic precision) across all verification fixtures **while maintaining structural quality invariants** that ensure the solution generalizes to real-world projects beyond the benchmark set.

## Setup

You are working inside `packages/cli/` of the `openzeppelin-ui` monorepo.

**Evaluation metric:** `(classification_accuracy * 0.6) + (diagnostic_precision * 0.4)`
- Classification accuracy: fraction of fixtures correctly classified as pass/fail
- Diagnostic precision: for broken fixtures, fuzzy keyword match on diagnostics

**Run the evaluation:**
```bash
npx tsx autoresearch/evaluate.ts --capability verification
```

**Run the safety gate (tests + structural lint):**
```bash
pnpm test && npx tsx autoresearch/lint-verification.ts
```

Both commands MUST pass after every experiment. If either fails, the experiment is **crashed** — revert and try again.

The structural lint gate (`lint-verification.ts`) automatically extracts fixture-specific identifiers (package names, workspace specifiers, fixture names) from the benchmark apps and verifies they do not appear as hardcoded strings in the editable TypeScript surface. This gate is self-updating — adding a new fixture automatically extends the lint coverage.

**Current baseline:** mean_score ≈ 0.619. The checker correctly handles basic cases but misclassifies: aliased old imports (mixed-import-sources), wrong OZ package (ui-react vs ui-components), and stale raw HTML elements alongside OZ components.

## Structural Quality Invariants

These invariants are as important as the composite score. An experiment that improves the score but violates an invariant MUST be reworked to satisfy both.

1. **No fixture-specific identifiers in checker code.** Package names, workspace specifiers, and fixture names extracted from the benchmark set must not appear as string literals in the editable TypeScript files. The lint gate enforces this automatically. All component mappings and library identifiers belong in JSON catalog files.

2. **Checks must classify based on structural properties.** Every verification check (orphaned import detection, wrong package prefix, provider hierarchy) must work based on structural signals in the code — import graph shape, package naming conventions, AST patterns — not on specific component or library identifiers. Ask: "Would this check correctly classify a migration using `@mycompany/design-kit` instead of any known fixture library?"

3. **Diagnostic messages must be template-driven, not fixture-specific.** Error messages should reference the specific component/import that triggered them using runtime values, not hardcoded strings. Templates like `"Found orphaned import of {component} from {source}"` are preferred over fixture-shaped messages.

4. **New checks must be testable with synthetic fixture projects.** If a new verification check cannot be validated with a simple synthetic project directory (a few files with mock imports), it is likely too coupled to a specific benchmark.

## Editable Surface

You may ONLY modify:

1. `src/verification/checker.ts` — The core verification logic

**You MUST NOT edit:**
- `autoresearch/evaluate.ts` or `autoresearch/capabilities/*`
- `autoresearch/lint-verification.ts` (the structural lint gate)
- `autoresearch/expected/**`
- Any test files

## Experimentation

Each experiment is one atomic change. Follow this loop:

1. **Analyze** — Look at the current evaluation output to identify which fixtures are misclassified or which diagnostics are too vague.
2. **Hypothesize** — Form a single, clear hypothesis about what verification change will improve the composite score. Write it down.
3. **Implement** — Make the smallest possible change that tests the hypothesis. Prefer focused checker improvements over broad rewrites.
4. **Safety gate** — Run `pnpm test && npx tsx autoresearch/lint-verification.ts`. If either fails → mark as **crashed**, revert all changes, and try a different approach.
5. **Evaluate** — Run `npx tsx autoresearch/evaluate.ts --capability verification`. Capture the new composite score.
6. **Decision:**
   - If the score **improved** AND lint passes → **keep** the change.
   - If the score **stayed the same or got worse** → **discard** the change (revert).
   - If the score improved but lint fails → **rework** — the approach is correct but the implementation is too coupled to fixtures. Refactor to use structural checks or catalog-driven logic.

If `autoresearch/results-verification.tsv` is empty, your first experiment should be the baseline run with no code changes so you have a trustworthy starting score.

## Output format

After each experiment, output exactly one line in this format:

```
<experiment_number>\t<status>\t<score>\t<adversarial_score>\t<why>\t<description>
```

Where:

- `experiment_number`: sequential integer starting at 1
- `status`: one of `keep`, `discard`, `crash`, `rework`
- `score`: the composite score AFTER the experiment (6 decimal places)
- `adversarial_score`: `n/a` (verification does not currently have an adversarial fixture)
- `why`: which structural invariant this change satisfies and why it generalizes (one sentence)
- `description`: brief one-line description of what was tried

Example:

```
1	keep	0.619000	n/a	Baseline measurement, no code changes	Baseline
2	keep	0.702000	n/a	Orphaned import detection uses AST import analysis — works for any source library	Detect stale aliased old imports alongside OZ imports
3	discard	0.702000	n/a	n/a	Add broad provider warnings with no precision gain
4	rework	0.750000	n/a	n/a — lint violation: hardcoded component name in checker conditional	Tried special-casing specific component for wrong-package check
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
2. **Prefer precise diagnostics.** A correct failure with a useful message is better than a noisy generic warning.
3. **Avoid benchmark-shaped special cases.** Fix general verification behavior, not fixture-specific conditions.
4. **Tests and lint are non-negotiable.** A crashed experiment is worse than a discarded one.
5. **Respect source classification.** Verification must align with real migration scope, especially for workspace-local packages.
6. **Generalization over score.** A change that improves the composite by 0.01 but only works for one fixture's naming convention is worse than a change that improves by 0.005 but works for any project structure.
7. **Explain why.** Every kept experiment must document which structural invariant it satisfies and why the approach generalizes to projects the benchmark doesn't cover.

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
- Number of string literals added to TypeScript (fewer is better; zero is ideal)

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
