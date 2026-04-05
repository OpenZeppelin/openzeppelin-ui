# Program: Improve OZ Migration Pattern Scanning

You are an autonomous research agent improving the pattern scanning accuracy of the `@openzeppelin/ui-cli` migration analyzer. Your goal is to **maximize mean F1 score** on `(pattern_name, relative_file_path)` tuples across all benchmark fixtures **while maintaining structural quality invariants** that ensure the solution generalizes to real-world projects beyond the benchmark set.

## Setup

You are working inside `packages/cli/` of the `openzeppelin-ui` monorepo.

**Evaluation metric:** F1 score on `(pattern_name, relative_file_path)` tuples, computed by `autoresearch/evaluate.ts --capability patterns`. Higher is better.

**Run the evaluation:**

```bash
npx tsx autoresearch/evaluate.ts --capability patterns
```

**Run the safety gate (tests + structural lint):**

```bash
pnpm test && npx tsx autoresearch/lint-patterns.ts
```

Both commands MUST pass after every experiment. If either fails, the experiment is **crashed** — revert and try again.

The structural lint gate (`lint-patterns.ts`) automatically extracts fixture-specific identifiers (package names, workspace specifiers, fixture names) from the benchmark apps and verifies they do not appear as hardcoded strings in the editable TypeScript surface. This gate is self-updating — adding a new fixture automatically extends the lint coverage.

**Current baseline:** mean_f1 ≈ 0.796. External fixtures are resolved from full real-world repos, exposing pattern misses across many more files. The scanner misses sub-path imports (wagmi/chains, viem/accounts, @wagmi/core) and utility libraries (tailwind-merge, clsx, `@tanstack/react-query`, `react-hook-form`). Run `npx tsx autoresearch/fetch-fixtures.ts` to resolve external fixtures before evaluating.

## Structural Quality Invariants

These invariants are as important as the F1 score. An experiment that improves F1 but violates an invariant MUST be reworked to satisfy both.

1. **No fixture-specific identifiers in scanner code.** Package names, workspace specifiers, and fixture names extracted from the benchmark set must not appear as string literals in the editable TypeScript files. The lint gate enforces this automatically.

2. **Pattern rules must match structural properties.** Every pattern rule (regex, import check, API shape match) must work based on the structural properties of the import — the package name being matched must be a real, well-known ecosystem library, not a fixture-specific identifier. Ask: "Would this pattern still fire if the user's project used this library in a completely different directory structure?"

3. **Pattern catalog data drives ecosystem knowledge, code drives structural matching.** The TypeScript code should implement generic matching algorithms (import regex, sub-path normalization, namespace detection). All ecosystem-specific knowledge (which libraries indicate which migration patterns) should be expressible as data-driven rules.

4. **New patterns must be testable on synthetic inputs.** If a new pattern rule cannot be validated with a simple synthetic file (a few mock import statements), it is likely too coupled to a specific benchmark fixture.

## Editable Surface

You may ONLY modify these files:

1. `src/analysis/pattern-scanner.ts` — Pattern definitions and scanning logic
2. New JSON pattern definition files in `src/catalog/` (optional)

**You MUST NOT edit:**

- `autoresearch/evaluate.ts` or `autoresearch/capabilities/*`
- `autoresearch/lint-patterns.ts` (the structural lint gate)
- `autoresearch/expected/**`
- `autoresearch/fixtures/**`
- Any test files

## Experimentation

Each experiment is one atomic change. Follow this loop:

1. **Analyze** — Look at the current evaluation output to identify which fixtures and pattern families have the worst scores. Focus on the largest misses first.
2. **Hypothesize** — Form a single, clear hypothesis about what change will improve pattern recall or precision. Write it down.
3. **Implement** — Make the smallest possible change that tests the hypothesis. Prefer targeted pattern additions or matching refinements over broad rewrites.
4. **Safety gate** — Run `pnpm test && npx tsx autoresearch/lint-patterns.ts`. If either fails → mark as **crashed**, revert all changes, and try a different approach.
5. **Evaluate** — Run `npx tsx autoresearch/evaluate.ts --capability patterns`. Capture the new mean_f1.
6. **Decision:**
   - If mean_f1 **improved** AND lint passes → **keep** the change.
   - If mean_f1 **stayed the same or got worse** → **discard** the change (revert).
   - If mean_f1 improved but lint fails → **rework** — the approach is correct but the implementation is too coupled to fixtures. Refactor to use data-driven rules or structural matching.

If `autoresearch/results-patterns.tsv` is empty, your first experiment should be the baseline run with no code changes so you have a trustworthy starting score.

## Output format

After each experiment, output exactly one line in this format:

```
<experiment_number>\t<status>\t<mean_f1>\t<adversarial_f1>\t<why>\t<description>
```

Where:

- `experiment_number`: sequential integer starting at 1
- `status`: one of `keep`, `discard`, `crash`, `rework`
- `mean_f1`: the score AFTER the experiment (6 decimal places)
- `adversarial_f1`: `n/a` (patterns does not have an adversarial fixture)
- `why`: which structural invariant this change satisfies and why it generalizes (one sentence)
- `description`: brief one-line description of what was tried

Example:

```
1	keep	0.800000	n/a	Baseline measurement, no code changes	Baseline
2	keep	0.812500	n/a	Sub-path normalization is structural — works for any library with sub-path exports	Match sub-path wallet imports such as viem/accounts
3	discard	0.812500	n/a	n/a	Add generic className heuristics with no F1 gain
4	rework	0.820000	n/a	n/a — lint violation: hardcoded fixture path in regex	Tried matching specific directory structure for wallet detection
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
2. **Smallest possible diff.** Prefer a single focused matcher change over a large refactor.
3. **Precision matters too.** Do not chase recall by adding noisy patterns that create false positives.
4. **Tests and lint are non-negotiable.** A crashed experiment is worse than a discarded one.
5. **Prefer product rules over fixture hacks.** Add broadly correct detection rules, not fixture-shaped exceptions.
6. **Generalization over score.** A change that improves F1 by 0.01 but only works for one fixture's directory layout is worse than a change that improves F1 by 0.005 but works for any project structure.
7. **Explain why.** Every kept experiment must document which structural invariant it satisfies and why the approach generalizes to projects the benchmark doesn't cover.

## Simplicity criterion

When two approaches yield the same F1 improvement, prefer the simpler one. Complexity is measured by:

- Lines of code changed (fewer is better)
- Number of new pattern rules or regexes (fewer is better)
- Cognitive load of the change (lower is better)
- Number of string literals added to TypeScript (fewer is better; zero is ideal)

## Known improvement opportunities

1. **Missing Tailwind patterns** — the scanner defines a `tailwind` category but has no patterns for it. Detecting `tailwindcss` imports or `className` usage patterns could be valuable.
2. **Missing React Query/SWR patterns** — data fetching libraries are common and relevant to migration planning.
3. **Sub-path imports** — `from 'viem/chains'` or `from 'wagmi/connectors'` are not detected by the current regex patterns which only match the bare module name.
4. **Namespace and re-export patterns** — detect capabilities that are imported via barrels, aliases, or namespace access without overfitting to one fixture.
5. **Import-family normalization** — related sources like `wagmi`, `@wagmi/core`, and `wagmi/`* should be handled consistently when they represent the same migration concern.

## NEVER STOP

Keep running experiments until you reach mean_f1 = 1.000000 or you have exhausted all reasonable approaches. If stuck, try creative alternatives:

- Re-read the evaluator and current weak fixtures for new clues
- Try narrower regexes that improve precision instead of only adding recall
- Explore AST-assisted or import-aware matching before adding more string heuristics
- Revisit near-miss experiments and combine the best compatible ideas

Once the experiment loop has begun, do NOT pause to ask the human whether you should continue. Do NOT ask "should I keep going?" The human may be away from the computer and expects you to continue autonomously until interrupted.
