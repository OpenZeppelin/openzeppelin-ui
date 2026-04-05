# Program: Improve OZ Migration Component Detection

You are an autonomous research agent improving the component detection accuracy of the `@openzeppelin/ui-cli` migration analyzer. Your goal is to **maximize mean F1 score** across all benchmark fixtures **while maintaining structural quality invariants** that ensure the solution generalizes to real-world projects beyond the benchmark set.

## Setup

You are working inside `packages/cli/` of the `openzeppelin-ui` monorepo.

**Evaluation metric:** Mean F1 score across benchmark fixtures, computed by `autoresearch/evaluate.ts`. Higher is better. The evaluation compares detected `(name, ozTarget)` tuples against ground truth in `autoresearch/expected/*.json`.

**Run the evaluation:**

```bash
npx tsx autoresearch/evaluate.ts --capability detection
```

The script prints the mean F1 as a single number to stdout. Per-fixture details go to stderr.

**Run the safety gate (tests + structural lint):**

```bash
pnpm test && npx tsx autoresearch/lint-detection.ts
```

Both commands MUST pass after every experiment. If either fails, the experiment is **crashed** — revert and try again.

The structural lint gate (`lint-detection.ts`) automatically extracts fixture-specific identifiers (package names, workspace specifiers, fixture names) from the benchmark apps and verifies they do not appear as hardcoded strings in the editable TypeScript surface. This gate is self-updating — adding a new fixture automatically extends the lint coverage.

**Run the adversarial generalization check:**

```bash
npx tsx autoresearch/generate-adversarial-fixture.ts && npx tsx autoresearch/evaluate.ts --capability detection
```

After each accepted experiment, regenerate the adversarial fixture and re-evaluate. If the adversarial fixture score drops significantly (below 0.8 F1), treat the experiment as **suspect** — the change may be overfitting to benchmark naming conventions.

**Current baseline:** mean_f1 ≈ 0.996. External fixtures are resolved from full real-world repos (not curated subsets), exposing gaps in detection coverage for large projects. Run `npx tsx autoresearch/fetch-fixtures.ts` to resolve external fixtures before evaluating.

## Structural Quality Invariants

These invariants are as important as the F1 score. An experiment that improves F1 but violates an invariant MUST be reworked to satisfy both.

1. **No fixture-specific identifiers in detection code.** Package names, workspace specifiers, and fixture names extracted from the benchmark set must not appear as string literals in the editable TypeScript files. The lint gate enforces this automatically. All component mappings belong in JSON catalog files.

2. **Detection strategies must be structurally generic.** Every detection strategy (external library matching, workspace DS inference, local wrapper resolution, HTML fallback, compound inference) must work based on structural properties of the import graph — not on specific library names or component identifiers. Ask: "Would this strategy detect correctly if the user's project used `@mycompany/design-kit` instead of any known fixture package?"

3. **Catalog data drives component knowledge, code drives structural logic.** The TypeScript code should implement generic algorithms (import classification, module resolution, compound family inference). All ecosystem-specific knowledge (which components map to what, which import patterns indicate shadcn vs Radix vs antd) must live in the JSON catalog files under `src/catalog/source-libraries/`.

4. **Changes must be testable on synthetic inputs.** If a new detection strategy cannot be unit-tested with a simple synthetic fixture (a few mock files with mock imports), it is likely too coupled to a specific benchmark.

5. **Compound and family inference must derive from catalog data.** The set of known component families should be built from the catalog at runtime, not maintained as a separate hardcoded list. If a new component family is needed, add it to a catalog JSON — do not add string literals to TypeScript.

## Editable Surface

You may ONLY modify these files:

1. `src/catalog/source-libraries/html-elements.json` — HTML element to OZ component mappings
2. `src/catalog/source-libraries/shadcn.json` — shadcn/ui component mappings
3. `src/catalog/source-libraries/radix.json` — Radix Primitives component mappings
4. `src/catalog/source-libraries/*.json` — Any new source library catalog files
5. `src/analysis/component-matcher.ts` — The core detection orchestration
6. `src/analysis/import-classifier.ts` — Import source classification
7. `src/analysis/import-resolver.ts` — Module resolution and workspace discovery

**You MUST NOT edit:**

- `autoresearch/evaluate.ts` (the evaluation harness)
- `autoresearch/lint-detection.ts` (the structural lint gate)
- `autoresearch/generate-adversarial-fixture.ts` (the adversarial fixture generator)
- `autoresearch/expected/*.json` (the ground truth)
- `autoresearch/fixtures/`** (the benchmark apps)
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
4. **Safety gate** — Run `pnpm test && npx tsx autoresearch/lint-detection.ts`. If either fails → mark as **crashed**, revert all changes, and try a different approach.
5. **Evaluate** — Run `npx tsx autoresearch/evaluate.ts`. Capture the new mean_f1.
6. **Adversarial check** — Run `npx tsx autoresearch/generate-adversarial-fixture.ts && npx tsx autoresearch/evaluate.ts`. Check the adversarial fixture score.
7. **Decision:**
   - If mean_f1 **improved** AND lint passes AND adversarial score ≥ 0.8 → **keep** the change.
   - If mean_f1 **stayed the same or got worse** → **discard** the change (revert).
   - If mean_f1 improved but lint fails → **rework** — the approach is correct but the implementation is too coupled to fixtures. Refactor to use catalog JSON or structural inference.
   - If mean_f1 improved but adversarial score dropped → **suspect** — the change may be overfitting. Verify generalizability before keeping.

## Output format

After each experiment, output exactly one line in this format:

```
<experiment_number>\t<status>\t<mean_f1>\t<adversarial_f1>\t<why>\t<description>
```

Where:

- `experiment_number`: sequential integer starting at 1
- `status`: one of `keep`, `discard`, `crash`, `rework`
- `mean_f1`: the benchmark score AFTER the experiment (6 decimal places)
- `adversarial_f1`: the adversarial fixture score AFTER the experiment (6 decimal places), or `n/a` if not run
- `why`: which structural invariant this change satisfies and why it generalizes (one sentence)
- `description`: brief one-line description of what was tried

Example:

```
1	keep	0.920000	0.850000	Compound inference derives families from catalog data at runtime, works for any library	Add compound suffix inference using catalogFamilies set built from all source library mappings
2	crash	0.920000	n/a	n/a	Attempted regex change broke extractImports for named imports
3	rework	0.940000	0.650000	n/a — lint violation: hardcoded @oz/ui in matcher	Tried direct package name check for workspace detection
4	keep	0.940000	0.900000	Workspace detection uses package.json discovery, no package name assumptions	Replaced package name check with generic workspace package discovery
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
    if tests fail OR lint fails:
        log crash, revert
        continue
    evaluate F1
    run adversarial check
    if improved AND generalizes:
        log keep (with why)
    elif improved but lint violation:
        log rework, refactor to satisfy invariants
    elif improved but adversarial drops:
        log suspect, verify generalizability
    else:
        log discard, revert
```

**Key principles:**

1. **One change at a time.** Never bundle multiple hypotheses into a single experiment.
2. **Smallest possible diff.** If you can fix something by adding one regex pattern, don't refactor the whole function.
3. **JSON before TypeScript.** Try adding/fixing JSON mappings before modifying detection code.
4. **Tests and lint are non-negotiable.** A crashed experiment is worse than a discarded one.
5. **Git as memory.** Consider creating experiment branches for complex changes so you can cleanly revert.
6. **Generalization over score.** A change that improves F1 by 0.01 but only works for one fixture's naming convention is worse than a change that improves F1 by 0.005 but works for any project structure.
7. **Explain why.** Every kept experiment must document which structural invariant it satisfies and why the approach generalizes to projects the benchmark doesn't cover.

## Source classification rules

Before changing detection behavior for any import source, classify what kind of source it is:

1. **Local path aliases** — imports like `@/foo`, `~/foo`, or other aliases that resolve to the fixture's own source tree.
2. **Workspace-local packages** — imports declared via `workspace:`*, monorepo package references, or other local package links. These are part of the migration surface and **must be analyzed and migrated** unless explicitly excluded elsewhere.
3. **External libraries** — third-party dependencies that are not maintained as part of the local workspace.

When the source type is not obvious, inspect the fixture's `package.json`, `tsconfig*.json`, and bundler config (`vite.config.*`, `webpack.config.*`, etc.) before forming a hypothesis.

## Guardrails for suppressions

Do not add fixture-shaped suppressions such as `source === 'X' && specifier === 'Y'` unless the rule reflects a real product invariant rather than a benchmark optimization.

Before ignoring an import source or component family, verify and document:

1. Whether it is a local alias, workspace-local package, or external library.
2. Why it should be excluded from migration analysis as a product rule.
3. Why a broader source-classification rule would not be more correct than a one-off suppression.

## Simplicity criterion

When two approaches yield the same F1 improvement, prefer the simpler one. Complexity is measured by:

- Lines of code changed (fewer is better)
- Number of new regex patterns (fewer is better)
- Cognitive load of the change (lower is better)
- Number of string literals added to TypeScript (fewer is better; zero is ideal)

## Known improvement opportunities

1. **Relative shadcn imports** — components imported via `./ui/button` instead of `@/components/ui/button` are not always detected
2. **Compound sub-component mapping** — `CardContent`, `TabsList`, `AlertTitle` etc. should map to their parent OZ component family
3. **Icon library false positives** — lucide-react icons (e.g., `ExternalLink`) must not generate migration tasks
4. **Radix Primitive naming**: `TabsPrimitive` from `import * as TabsPrimitive from '@radix-ui/react-tabs'` is not mapped to `Tabs`. The analyzer should strip common suffixes like Primitive/Root to resolve the underlying component name.
5. **Workspace package imports are in scope** — local monorepo packages imported as packages (for example via `workspace:`*) must be treated as analyzable migration sources, not ignored as if they were remote third-party packages.

## NEVER STOP

Keep running experiments until you reach mean_f1 = 1.000000 or you have exhausted all reasonable approaches. If stuck, try creative alternatives:

- Different regex strategies for edge cases
- Mapping file adjustments for unmapped components
- Handling compound component patterns (X.Y notation)
- Handling re-exports and barrel imports
