# Program: Improve OZ Migration Init / Setup

You are an autonomous research agent improving the `oz-ui migrate init` command. Your goal is to **maximize the checklist score** — ensuring init creates all expected files with correct content.

## Setup

You are working inside `packages/cli/` of the `openzeppelin-ui` monorepo.

**Evaluation metric:** Weighted checklist score:
- File existence checks (did init create the expected files?)
- Content checks (do template files contain expected patterns?)

Each fixture is copied to a temp directory, init runs with `--skip-install`, results are checked, temp dir is cleaned up.

**Run the evaluation:**
```bash
npx tsx autoresearch/evaluate.ts --capability init
```

**Run the safety gate (tests):**
```bash
pnpm test
```

**Current baseline:** checklist ≈ 0.875. The setup correctly writes provider templates, agent files, and skill files, but does not generate a tailwind.config.ts with OZ content paths for projects without existing Tailwind setup.

## Editable Surface

You may ONLY modify these files:

1. `src/commands/migrate/init.ts` — Init command logic
2. `src/init/setup.ts` — Extracted setup logic
3. `src/templates/**` — Template files written by init

**You MUST NOT edit:**
- `autoresearch/evaluate.ts` or `autoresearch/capabilities/*`
- `autoresearch/expected/**`
- Any test files

## Experimentation

Each experiment is one atomic change. Follow this loop:

1. **Analyze** — Look at the current evaluation output to identify which checklist items are missing or incorrect.
2. **Hypothesize** — Form a single, clear hypothesis about what init/setup change will improve the checklist score. Write it down.
3. **Implement** — Make the smallest possible change that tests the hypothesis. Prefer focused template or setup fixes over broad refactors.
4. **Test** — Run `pnpm test`. If tests fail → mark as **crash**, revert all changes, and try a different approach.
5. **Evaluate** — Run `npx tsx autoresearch/evaluate.ts --capability init`. Capture the new checklist score.
6. **Decision:**
  - If the score **improved** (even slightly) → **keep** the change.
  - If the score **stayed the same or got worse** → **discard** the change (revert).

If `autoresearch/results-init.tsv` is empty, your first experiment should be the baseline run with no code changes so you have a trustworthy starting score.

## Output format

After each experiment, output exactly one line in this format:

```
<experiment_number>\t<status>\t<score>\t<description>
```

Where:

- `experiment_number`: sequential integer starting at 1
- `status`: one of `keep`, `discard`, `crash`
- `score`: the checklist score AFTER the experiment (6 decimal places)
- `description`: brief one-line description of what was tried

Example:

```
1	keep	0.875000	Baseline
2	keep	0.937500	Add OZ-aware tailwind.config.ts generation for projects without Tailwind
3	discard	0.937500	Refactor template path handling with no checklist gain
```

## Logging results

Append each experiment line to `autoresearch/results-init.tsv`. The file has no header — just data rows.

Before your first experiment, if `results-init.tsv` does not exist, create it empty.

## The experiment loop

```
while True:
    analyze the current failed checklist items
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
2. **Prefer minimal template fixes.** If a missing file or content fragment fixes the score, do that before refactoring init flow.
3. **Preserve existing user projects.** Avoid changes that would overwrite or corrupt real project files beyond the intended init contract.
4. **Tests are non-negotiable.** A crashed experiment is worse than a discarded one.
5. **Checklist semantics matter.** Improve the generated output, not just the presence of files.

## Simplicity criterion

When two approaches yield the same score improvement, prefer the simpler one. Complexity is measured by:

- Lines of code changed (fewer is better)
- Number of templates or setup branches added (fewer is better)
- Cognitive load of the change (lower is better)

## Known improvement opportunities

1. **Template content** — Ensure RuntimeProvider template imports the correct packages.
2. **resolve-runtime template** — Must contain the proper adapter resolution logic.
3. **Tailwind normalization** — Ensure Tailwind config is updated if present.

## NEVER STOP

Keep running experiments until you reach score = 1.000000 or you have exhausted all reasonable approaches. If stuck, try creative alternatives:

- Re-read the evaluator to understand which file or content check is still failing
- Compare generated files against high-scoring fixtures and expected outputs
- Fix the narrowest template or setup branch that can satisfy the checklist
- Revisit near-miss experiments and combine the best compatible ideas

Once the experiment loop has begun, do NOT pause to ask the human whether you should continue. Do NOT ask "should I keep going?" The human may be away from the computer and expects you to continue autonomously until interrupted.
