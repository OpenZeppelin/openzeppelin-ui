# Program: Improve OZ Migration Orchestration (SKILL.md)

You are an autonomous research agent improving the SKILL.md orchestration protocol. Your goal is to **maximize the structural checklist score** — ensuring SKILL.md correctly guides agents through the full migration workflow.

## Setup

You are working inside `packages/cli/` of the `openzeppelin-ui` monorepo.

**Evaluation metric:** Structural checklist + sequence accuracy
- Static checklist: fraction of required properties present in SKILL.md
  - References all CLI commands (init, analyze, plan, doctor)
  - Includes phase gate logic
  - Includes error recovery instructions
  - References resume/partial-migration
  - Covers all migration phases
- Sequence accuracy (future): subagent replay comparing command sequences against scenarios

**Run the evaluation:**
```bash
npx tsx autoresearch/evaluate.ts --capability orchestration
```

**Run the safety gate (tests):**
```bash
pnpm test
```

**Current baseline:** checklist ≈ 0.917. The SKILL.md references all commands and phases but lacks explicit error recovery instructions.

## Editable Surface

You may ONLY modify:

1. `src/templates/skills/migrate-to-oz-uikit/SKILL.md` — The orchestration skill

**You MUST NOT edit:**
- `autoresearch/evaluate.ts` or `autoresearch/capabilities/*`
- `autoresearch/expected/**`
- Any test files

## Experimentation

Each experiment is one atomic change. Follow this loop:

1. **Analyze** — Look at the current evaluation output to identify which structural checklist items or workflow sequence requirements are missing.
2. **Hypothesize** — Form a single, clear hypothesis about what SKILL.md change will improve the checklist score. Write it down.
3. **Implement** — Make the smallest possible change that tests the hypothesis. Prefer focused protocol additions over broad rewrites.
4. **Test** — Run `pnpm test`. If tests fail → mark as **crash**, revert all changes, and try a different approach.
5. **Evaluate** — Run `npx tsx autoresearch/evaluate.ts --capability orchestration`. Capture the new structural score.
6. **Decision:**
  - If the score **improved** (even slightly) → **keep** the change.
  - If the score **stayed the same or got worse** → **discard** the change (revert).

If `autoresearch/results-orchestration.tsv` is empty, your first experiment should be the baseline run with no code changes so you have a trustworthy starting score.

## Output format

After each experiment, output exactly one line in this format:

```
<experiment_number>\t<status>\t<score>\t<description>
```

Where:

- `experiment_number`: sequential integer starting at 1
- `status`: one of `keep`, `discard`, `crash`
- `score`: the structural score AFTER the experiment (6 decimal places)
- `description`: brief one-line description of what was tried

Example:

```
1	keep	0.917000	Baseline
2	keep	1.000000	Add explicit error recovery and rollback instructions
3	discard	1.000000	Reformat phase sections with no checklist gain
```

## Logging results

Append each experiment line to `autoresearch/results-orchestration.tsv`. The file has no header — just data rows.

Before your first experiment, if `results-orchestration.tsv` does not exist, create it empty.

## The experiment loop

```
while True:
    analyze the current missing protocol requirements
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
2. **Optimize for agent behavior, not prose aesthetics.** Clear executable guidance matters more than stylistic polish.
3. **Preserve workflow coherence.** New instructions must fit into the end-to-end migration sequence without contradictions.
4. **Tests are non-negotiable.** A crashed experiment is worse than a discarded one.
5. **Prefer explicit recovery guidance.** Agents need concrete failure handling, completion criteria, and resume instructions.

## Simplicity criterion

When two approaches yield the same score improvement, prefer the simpler one. Complexity is measured by:

- Lines of text changed (fewer is better)
- Number of new sections or branching instructions added (fewer is better)
- Cognitive load of the change (lower is better)

## Known improvement opportunities

1. **Error recovery** — SKILL.md should include explicit instructions for error recovery and rollback scenarios.
2. **Phase gate completeness** — Every migration phase should have clear completion criteria before proceeding.
3. **Resume support** — Include instructions for detecting and resuming partial migrations.

## NEVER STOP

Keep running experiments until you reach score = 1.000000 or you have exhausted all reasonable approaches. If stuck, try creative alternatives:

- Re-read the evaluator to identify exactly which protocol properties are still missing
- Compare the current skill against other high-discipline agent protocols in this repo
- Tighten sequence and recovery instructions before adding more descriptive prose
- Revisit near-miss experiments and combine the best compatible ideas

Once the experiment loop has begun, do NOT pause to ask the human whether you should continue. Do NOT ask "should I keep going?" The human may be away from the computer and expects you to continue autonomously until interrupted.
