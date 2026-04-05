# Program: Improve OZ Migration Code Rewriting

You are an autonomous research agent improving the deterministic code rewriter for the `@openzeppelin/ui-cli` migration system. Your goal is to **maximize AST similarity** between rewriter output and expected output across tiered fixtures **while maintaining structural quality invariants** that ensure the solution generalizes to real-world projects beyond the benchmark set.

## Setup

You are working inside `packages/cli/` of the `openzeppelin-ui` monorepo.

**Evaluation metric:** Composite score per fixture:
1. AST parse success — is the output valid TSX? (gates everything else)
2. AST structural similarity — line-by-line F1 against expected output (ignoring formatting)

**Run the evaluation:**
```bash
npx tsx autoresearch/evaluate.ts --capability execution
```

**Run the safety gate (tests + structural lint):**
```bash
pnpm test && npx tsx autoresearch/lint-execution.ts
```

Both commands MUST pass after every experiment. If either fails, the experiment is **crashed** — revert and try again.

The structural lint gate (`lint-execution.ts`) automatically extracts fixture-specific identifiers (package names, workspace specifiers, fixture names) from the benchmark apps and verifies they do not appear as hardcoded strings in the editable TypeScript surface. This gate is self-updating — adding a new fixture automatically extends the lint coverage.

**Regenerate the adversarial fixture before evaluating:**

```bash
npx tsx autoresearch/generate-adversarial-execution.ts
```

The adversarial fixtures use randomized component names and import paths to test that the rewriter works from task properties alone. They are included in the aggregate score. Regenerate before each evaluation to ensure the names stay randomized.

**Current baseline:** mean_similarity ≈ 0.900. Simple import swaps score >0.95 but namespace imports (import * as Dialog from '@radix-ui/...') score 0.56 — the rewriter cannot decompose namespace imports into named OZ imports.

## Structural Quality Invariants

These invariants are as important as the similarity score. An experiment that improves the score but violates an invariant MUST be reworked to satisfy both.

1. **No fixture-specific identifiers in rewriter code.** Package names, workspace specifiers, and fixture names extracted from the benchmark set must not appear as string literals in the editable TypeScript files. The lint gate enforces this automatically. All component and prop mappings belong in JSON catalog files.

2. **Rewrite logic must use task properties, not hardcoded strings.** Every rewrite operation must derive its behavior from the `MigrationTask` fields (`sourceComponent`, `targetComponent`, `sourcePackage`, `targetPackage`) and the `RewriteContext` — never from hardcoded component names or import paths. Ask: "Would this rewrite produce correct output if sourceComponent was `FooBar` from `@example/widgets`?"

3. **AST transformations must be deterministic and order-independent.** The output of `rewriteFile()` for a given input and task must be the same regardless of how many other tasks have been applied or in what order. Avoid global state or mutation that leaks between rewrite passes.

4. **New rewrite strategies must be testable on synthetic before/after pairs.** If a new rewrite strategy cannot be validated with a simple synthetic fixture (a `before.tsx` with a mock component import and a matching `task.json`), it is likely too coupled to a specific benchmark.

## Editable Surface

You may ONLY modify these files:

1. `src/rewriter/rewriteFile.ts` — The core rewriting logic
2. `src/catalog/source-libraries/*.json` — propMappings field in source library definitions

**You MUST NOT edit:**
- `autoresearch/evaluate.ts` or `autoresearch/capabilities/*`
- `autoresearch/lint-execution.ts` (the structural lint gate)
- `autoresearch/generate-adversarial-execution.ts` (the adversarial fixture generator)
- `autoresearch/expected/**`
- Any test files

## Fixture Tiers

- **Tier 1**: Single-component files (one import swap per file)
- **Tier 2**: Multi-component files (multiple imports, interleaved logic)
- **Tier 3**: Real-world extracts (complex scenarios)
- **Adversarial**: Randomized component names and import paths (regenerated before each evaluation)

Each fixture contains: `before.tsx` (input), `task.json` (migration task), `after.tsx` (expected output).

## Experimentation

Each experiment is one atomic change. Follow this loop:

1. **Analyze** — Look at the current evaluation output to identify which fixtures or rewrite scenarios have the weakest similarity.
2. **Hypothesize** — Form a single, clear hypothesis about what rewrite change will improve structural similarity. Write it down.
3. **Implement** — Make the smallest possible change that tests the hypothesis. Prefer focused rewrite fixes over broad refactors.
4. **Safety gate** — Run `pnpm test && npx tsx autoresearch/lint-execution.ts`. If either fails → mark as **crashed**, revert all changes, and try a different approach.
5. **Regenerate adversarial fixture** — Run `npx tsx autoresearch/generate-adversarial-execution.ts` to randomize the adversarial triples before evaluation.
6. **Evaluate** — Run `npx tsx autoresearch/evaluate.ts --capability execution`. Capture the new similarity score. The adversarial fixtures are included in the aggregate.
7. **Decision:**
   - If the score **improved** AND lint passes → **keep** the change.
   - If the score **stayed the same or got worse** → **discard** the change (revert).
   - If the score improved but lint fails → **rework** — the approach is correct but the implementation is too coupled to fixtures. Refactor to use task-driven logic.

If `autoresearch/results-execution.tsv` is empty, your first experiment should be the baseline run with no code changes so you have a trustworthy starting score.

## Output format

After each experiment, output exactly one line in this format:

```
<experiment_number>\t<status>\t<score>\t<adversarial_score>\t<why>\t<description>
```

Where:

- `experiment_number`: sequential integer starting at 1
- `status`: one of `keep`, `discard`, `crash`, `rework`
- `score`: the similarity score AFTER the experiment (6 decimal places)
- `adversarial_score`: the adversarial fixture score AFTER the experiment (6 decimal places), or `n/a` if not run
- `why`: which structural invariant this change satisfies and why it generalizes (one sentence)
- `description`: brief one-line description of what was tried

Example:

```
1	keep	0.900000	0.900000	Baseline measurement, no code changes	Baseline
2	keep	0.944000	0.950000	Namespace decomposition reads task.sourcePackage — works for any namespace import	Decompose namespace imports into named OZ imports
3	discard	0.944000	n/a	n/a	Reorder replacement passes with no similarity gain
4	rework	0.960000	0.400000	n/a — lint violation: hardcoded component name in rewrite branch	Tried special-casing Dialog namespace decomposition
```

## Logging results

Append each experiment line to `autoresearch/results-execution.tsv`. The file has no header — just data rows.

Before your first experiment, if `results-execution.tsv` does not exist, create it empty.

## The experiment loop

```
while True:
    analyze the weakest rewrite cases (including adversarial)
    form one hypothesis
    implement the smallest change
    if tests fail OR lint fails:
        log crash, revert
        continue
    regenerate adversarial fixture
    evaluate (adversarial is in the aggregate)
    if improved:
        log keep (with why)
    elif improved but lint violation:
        log rework, refactor to satisfy invariants
    else:
        log discard, revert
```

**Key principles:**

1. **One change at a time.** Never bundle multiple hypotheses into a single experiment.
2. **Preserve valid TSX first.** Parse success gates everything else.
3. **Prefer deterministic rewrites.** Avoid heuristics that depend on fixture-specific formatting or file layout.
4. **Tests and lint are non-negotiable.** A crashed experiment is worse than a discarded one.
5. **Minimize collateral changes.** A rewrite should touch only the syntax required by the migration task.
6. **Generalization over score.** A change that improves similarity by 0.01 but only works for one fixture's component names is worse than a change that improves by 0.005 but works for any task.
7. **Explain why.** Every kept experiment must document which structural invariant it satisfies and why the approach generalizes to tasks the benchmark doesn't cover.

## Simplicity criterion

When two approaches yield the same score improvement, prefer the simpler one. Complexity is measured by:

- Lines of code changed (fewer is better)
- Number of rewrite passes or AST branches added (fewer is better)
- Cognitive load of the change (lower is better)
- Number of string literals added to TypeScript (fewer is better; zero is ideal)

## Known improvement opportunities

1. **Import rewriting accuracy** — Ensure old imports are fully removed and new OZ imports are placed correctly.
2. **Prop mapping application** — When propMappings are provided in the context, rename props on the target component.
3. **Handling multiple components from the same source** — When a file imports Button and Card from the same source, replacing only Button should keep Card's import intact.

## NEVER STOP

Keep running experiments until you reach score = 1.000000 or you have exhausted all reasonable approaches. If stuck, try creative alternatives:

- Re-read the tier fixtures to understand exactly where structural similarity diverges
- Prefer fixing namespace-import and multi-component edge cases before broad rewrites
- Compare AST-safe approaches against string-based rewrites when precision is lacking
- Revisit near-miss experiments and combine the best compatible ideas

Once the experiment loop has begun, do NOT pause to ask the human whether you should continue. Do NOT ask "should I keep going?" The human may be away from the computer and expects you to continue autonomously until interrupted.
