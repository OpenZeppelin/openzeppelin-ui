# Program: Improve OZ Migration Pattern Scanning

You are an autonomous research agent improving the pattern scanning accuracy of the `@openzeppelin/ui-cli` migration analyzer. Your goal is to **maximize F1 score** on `(pattern_name, relative_file_path)` tuples across all benchmark fixtures.

## Setup

You are working inside `packages/cli/` of the `openzeppelin-ui` monorepo.

**Evaluation metric:** F1 score on `(pattern_name, relative_file_path)` tuples, computed by `autoresearch/evaluate.ts --capability patterns`. Higher is better.

**Run the evaluation:**
```bash
npx tsx autoresearch/evaluate.ts --capability patterns
```

**Run the safety gate (tests):**
```bash
pnpm test
```

All existing tests MUST pass after every experiment. If tests fail, the experiment is **crashed** — revert and try again.

**Current baseline:** mean_f1 ≈ 0.796. External fixtures are resolved from full real-world repos, exposing pattern misses across many more files. The scanner misses sub-path imports (wagmi/chains, viem/accounts, @wagmi/core) and utility libraries (tailwind-merge, clsx, `@tanstack/react-query`, `react-hook-form`). Run `npx tsx autoresearch/fetch-fixtures.ts` to resolve external fixtures before evaluating.

## Editable Surface

You may ONLY modify these files:

1. `src/analysis/pattern-scanner.ts` — Pattern definitions and scanning logic
2. New JSON pattern definition files in `src/catalog/` (optional)

**You MUST NOT edit:**
- `autoresearch/evaluate.ts` or `autoresearch/capabilities/*`
- `autoresearch/expected/**`
- `autoresearch/fixtures/**`
- Any test files

## Experimentation

Each experiment is one atomic change. Follow this loop:

1. **Analyze** — Look at the current evaluation output to identify which fixtures and pattern families have the worst scores. Focus on the largest misses first.
2. **Hypothesize** — Form a single, clear hypothesis about what change will improve pattern recall or precision. Write it down.
3. **Implement** — Make the smallest possible change that tests the hypothesis. Prefer targeted pattern additions or matching refinements over broad rewrites.
4. **Test** — Run `pnpm test`. If tests fail → mark as **crash**, revert all changes, and try a different approach.
5. **Evaluate** — Run `npx tsx autoresearch/evaluate.ts --capability patterns`. Capture the new mean_f1.
6. **Decision:**
  - If mean_f1 **improved** (even slightly) → **keep** the change.
  - If mean_f1 **stayed the same or got worse** → **discard** the change (revert).

If `autoresearch/results-patterns.tsv` is empty, your first experiment should be the baseline run with no code changes so you have a trustworthy starting score.

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
1	keep	0.800000	Baseline
2	keep	0.812500	Match sub-path wallet imports such as viem/accounts
3	discard	0.812500	Add generic className heuristics with no F1 gain
```

## Logging results

Append each experiment line to `autoresearch/results-patterns.tsv`. The file has no header — just data rows.

Before your first experiment, if `results-patterns.tsv` does not exist, create it empty.

## The experiment loop

```
while True:
    analyze the current weakest fixtures/patterns
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
2. **Smallest possible diff.** Prefer a single focused matcher change over a large refactor.
3. **Precision matters too.** Do not chase recall by adding noisy patterns that create false positives.
4. **Tests are non-negotiable.** A crashed experiment is worse than a discarded one.
5. **Prefer product rules over fixture hacks.** Add broadly correct detection rules, not fixture-shaped exceptions.

## Simplicity criterion

When two approaches yield the same F1 improvement, prefer the simpler one. Complexity is measured by:

- Lines of code changed (fewer is better)
- Number of new pattern rules or regexes (fewer is better)
- Cognitive load of the change (lower is better)

## Known improvement opportunities

1. **Missing Tailwind patterns** — the scanner defines a `tailwind` category but has no patterns for it. Detecting `tailwindcss` imports or `className` usage patterns could be valuable.
2. **Missing React Query/SWR patterns** — data fetching libraries are common and relevant to migration planning.
3. **Sub-path imports** — `from 'viem/chains'` or `from 'wagmi/connectors'` are not detected by the current regex patterns which only match the bare module name.
4. **Namespace and re-export patterns** — detect capabilities that are imported via barrels, aliases, or namespace access without overfitting to one fixture.
5. **Import-family normalization** — related sources like `wagmi`, `@wagmi/core`, and `wagmi/*` should be handled consistently when they represent the same migration concern.

## NEVER STOP

Keep running experiments until you reach mean_f1 = 1.000000 or you have exhausted all reasonable approaches. If stuck, try creative alternatives:

- Re-read the evaluator and current weak fixtures for new clues
- Try narrower regexes that improve precision instead of only adding recall
- Explore AST-assisted or import-aware matching before adding more string heuristics
- Revisit near-miss experiments and combine the best compatible ideas

Once the experiment loop has begun, do NOT pause to ask the human whether you should continue. Do NOT ask "should I keep going?" The human may be away from the computer and expects you to continue autonomously until interrupted.
