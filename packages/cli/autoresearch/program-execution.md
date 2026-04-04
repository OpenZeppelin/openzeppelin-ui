# Program: Improve OZ Migration Code Rewriting

You are an autonomous research agent improving the deterministic code rewriter for the `@openzeppelin/ui-cli` migration system. Your goal is to **maximize AST similarity** between rewriter output and expected output across tiered fixtures.

## Setup

You are working inside `packages/cli/` of the `openzeppelin-ui` monorepo.

**Evaluation metric:** Composite score per fixture:
1. AST parse success — is the output valid TSX? (gates everything else)
2. AST structural similarity — line-by-line F1 against expected output (ignoring formatting)

**Run the evaluation:**
```bash
npx tsx autoresearch/evaluate.ts --capability execution
```

**Run the safety gate (tests):**
```bash
pnpm test
```

**Current baseline:** mean_similarity ≈ 0.900. Simple import swaps score >0.95 but namespace imports (import * as Dialog from '@radix-ui/...') score 0.56 — the rewriter cannot decompose namespace imports into named OZ imports.

## Editable Surface

You may ONLY modify these files:

1. `src/rewriter/rewriteFile.ts` — The core rewriting logic
2. `src/catalog/source-libraries/*.json` — propMappings field in source library definitions

**You MUST NOT edit:**
- `autoresearch/evaluate.ts` or `autoresearch/capabilities/*`
- `autoresearch/expected/**`
- Any test files

## Fixture Tiers

- **Tier 1**: Single-component files (one import swap per file)
- **Tier 2**: Multi-component files (multiple imports, interleaved logic)
- **Tier 3**: Real-world extracts (complex scenarios)

Each fixture contains: `before.tsx` (input), `task.json` (migration task), `after.tsx` (expected output).

## Experimentation

Each experiment is one atomic change. Follow this loop:

1. **Analyze** — Look at the current evaluation output to identify which fixtures or rewrite scenarios have the weakest similarity.
2. **Hypothesize** — Form a single, clear hypothesis about what rewrite change will improve structural similarity. Write it down.
3. **Implement** — Make the smallest possible change that tests the hypothesis. Prefer focused rewrite fixes over broad refactors.
4. **Test** — Run `pnpm test`. If tests fail → mark as **crash**, revert all changes, and try a different approach.
5. **Evaluate** — Run `npx tsx autoresearch/evaluate.ts --capability execution`. Capture the new similarity score.
6. **Decision:**
  - If the score **improved** (even slightly) → **keep** the change.
  - If the score **stayed the same or got worse** → **discard** the change (revert).

If `autoresearch/results-execution.tsv` is empty, your first experiment should be the baseline run with no code changes so you have a trustworthy starting score.

## Output format

After each experiment, output exactly one line in this format:

```
<experiment_number>\t<status>\t<score>\t<description>
```

Where:

- `experiment_number`: sequential integer starting at 1
- `status`: one of `keep`, `discard`, `crash`
- `score`: the similarity score AFTER the experiment (6 decimal places)
- `description`: brief one-line description of what was tried

Example:

```
1	keep	0.900000	Baseline
2	keep	0.944000	Decompose namespace imports into named OZ imports
3	discard	0.944000	Reorder replacement passes with no similarity gain
```

## Logging results

Append each experiment line to `autoresearch/results-execution.tsv`. The file has no header — just data rows.

Before your first experiment, if `results-execution.tsv` does not exist, create it empty.

## The experiment loop

```
while True:
    analyze the weakest rewrite cases
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
2. **Preserve valid TSX first.** Parse success gates everything else.
3. **Prefer deterministic rewrites.** Avoid heuristics that depend on fixture-specific formatting or file layout.
4. **Tests are non-negotiable.** A crashed experiment is worse than a discarded one.
5. **Minimize collateral changes.** A rewrite should touch only the syntax required by the migration task.

## Simplicity criterion

When two approaches yield the same score improvement, prefer the simpler one. Complexity is measured by:

- Lines of code changed (fewer is better)
- Number of rewrite passes or AST branches added (fewer is better)
- Cognitive load of the change (lower is better)

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
