# Program: Improve OZ Migration Component Detection

You are an autonomous research agent improving the component detection accuracy of the `@openzeppelin/ui-cli` migration analyzer. Your goal is to **minimize the mean F1 error** (i.e., maximize mean F1 score) across all benchmark fixtures.

## Setup

You are working inside `packages/cli/` of the `openzeppelin-ui` monorepo.

**Evaluation metric:** Mean F1 score across benchmark fixtures, computed by `autoresearch/evaluate.ts`. Higher is better. The evaluation compares detected `(name, ozTarget)` tuples against ground truth in `autoresearch/expected/*.json`.

**Run the evaluation:**
```bash
npx tsx autoresearch/evaluate.ts --capability detection
```
The script prints the mean F1 as a single number to stdout. Per-fixture details go to stderr.

**Run the safety gate (tests):**
```bash
pnpm test
```
All existing tests MUST pass after every experiment. If tests fail, the experiment is **crashed** — revert and try again.

**Current baseline:** mean_f1 ≈ 0.861. External fixtures are resolved from full real-world repos (not curated subsets), exposing gaps in detection coverage for large projects. Run `npx tsx autoresearch/fetch-fixtures.ts` to resolve external fixtures before evaluating.

## Editable Surface

You may ONLY modify these files:

1. `src/catalog/source-libraries/html-elements.json` — HTML element to OZ component mappings
2. `src/catalog/source-libraries/shadcn.json` — shadcn/ui component mappings
3. `src/catalog/source-libraries/radix.json` — Radix Primitives component mappings
4. `src/analysis/component-matcher.ts` — The core detection logic (import extraction, JSX usage counting, HTML element scanning)

**You MUST NOT edit:**
- `autoresearch/evaluate.ts` (the evaluation harness)
- `autoresearch/expected/*.json` (the ground truth)
- `autoresearch/fixtures/**` (the benchmark apps)
- `src/analysis/pattern-scanner.ts`
- `src/analysis/scanner.ts`
- `src/analysis/index.ts`
- `src/catalog/index.ts`
- Any test files

## Experimentation

Each experiment is one atomic change. Follow this loop:

1. **Analyze** — Look at the current evaluation output (stderr) to identify which fixtures and components have the worst scores. Focus on the lowest-hanging fruit first.
2. **Hypothesize** — Form a single, clear hypothesis about what change will improve detection. Write it down.
3. **Implement** — Make the smallest possible change that tests the hypothesis. Prefer modifying JSON mappings before modifying TypeScript code. When modifying TypeScript, prefer adding new functions over changing existing ones.
4. **Test** — Run `pnpm test`. If tests fail → mark as **crashed**, revert all changes, and try a different approach.
5. **Evaluate** — Run `npx tsx autoresearch/evaluate.ts`. Capture the new mean_f1.
6. **Decision:**
   - If mean_f1 **improved** (even slightly) → **keep** the change.
   - If mean_f1 **stayed the same or got worse** → **discard** the change (revert).

## Output format

After each experiment, output exactly one line in this format:
```
<experiment_number>\t<status>\t<mean_f1>\t<description>
```

Where:
- `experiment_number`: sequential integer starting at 1
- `status`: one of `keep`, `discard`, `crash`
- `mean_f1`: the score AFTER the experiment (6 decimal places)
- `description`: brief one-line description of what was tried

Example:
```
1	keep	0.850000	Add namespace import detection for import * as X patterns
2	crash	0.850000	Attempted regex change broke extractImports for named imports
3	discard	0.850000	Added Radix sub-component mappings but no F1 improvement
```

## Logging results

Append each experiment line to `autoresearch/results-detection.tsv`. The file has no header — just data rows.

Before your first experiment, if `results-detection.tsv` does not exist, create it empty.

## The experiment loop

```
while True:
    analyze the current weakest fixture/component
    form hypothesis
    implement smallest change
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
2. **Smallest possible diff.** If you can fix something by adding one regex pattern, don't refactor the whole function.
3. **JSON before TypeScript.** Try adding/fixing JSON mappings before modifying detection code.
4. **Tests are non-negotiable.** A crashed experiment is worse than a discarded one.
5. **Git as memory.** Consider creating experiment branches for complex changes so you can cleanly revert.

## Simplicity criterion

When two approaches yield the same F1 improvement, prefer the simpler one. Complexity is measured by:
- Lines of code changed (fewer is better)
- Number of new regex patterns (fewer is better)
- Cognitive load of the change (lower is better)

## Known improvement opportunities

The biggest remaining gaps are in the **zama-accounts-ui** fixture:
1. **Relative shadcn imports** — components imported via `./ui/button` instead of `@/components/ui/button` are not always detected
2. **Compound sub-component mapping** — `CardContent`, `TabsList`, `AlertTitle` etc. should map to their parent OZ component family
3. **Icon library false positives** — lucide-react icons (e.g., `ExternalLink`) must not generate migration tasks
4. **Radix Primitive naming**: `TabsPrimitive` from `import * as TabsPrimitive from '@radix-ui/react-tabs'` is not mapped to `Tabs`. The analyzer should strip common suffixes like Primitive/Root to resolve the underlying component name.

## NEVER STOP

Keep running experiments until you reach mean_f1 = 1.000000 or you have exhausted all reasonable approaches. If stuck, try creative alternatives:
- Different regex strategies for edge cases
- Mapping file adjustments for unmapped components
- Handling compound component patterns (X.Y notation)
- Handling re-exports and barrel imports
