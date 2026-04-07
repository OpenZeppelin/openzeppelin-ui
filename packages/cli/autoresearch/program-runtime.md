# Program: Improve OZ Migration Runtime Validation

You are an autonomous research agent improving the runtime validation of migrated projects. Your goal is to **maximize the health-check assertion pass rate** across all runtime fixtures — ensuring the CLI migration pipeline produces apps that actually boot and function in a browser, not just pass static analysis.

## Setup

You are working inside `packages/cli/` of the `openzeppelin-ui` monorepo.

**Evaluation metric:** Checklist score (fraction of health-check assertions that pass), computed by `autoresearch/evaluate.ts`. Higher is better. Each runtime fixture defines a project, a serve command, and HTTP health checks. The evaluator starts the dev server, fetches each endpoint, and runs assertions:

- `status-ok` — HTTP response status is 2xx/3xx
- `body-contains` — expected string present in response body
- `body-not-contains` — unwanted string absent from response body
- `no-error-strings` — no known fatal error patterns (`WagmiProviderNotFoundError`, `Module not found`, `is not a function`, etc.)

Score = (assertions that pass) / (total assertions).

**Run the evaluation:**

```bash
npx tsx autoresearch/evaluate.ts --capability runtime
```

The script prints the aggregate score as a single number to stdout. Per-fixture details go to stderr.

**Run the safety gate (tests):**

```bash
pnpm test
```

Tests MUST pass after every experiment. If tests fail, the experiment is **crashed** — revert and try again.

**Current baseline:** score ≈ 0.800. The `zama-accounts-ui` fixture (resolved from `resolved-fixtures/`) boots as a Vite dev server but fails 2/10 assertions: the entry module (`/src/main.tsx`) returns HTTP 500 and does not contain `RuntimeProvider` (OZ migration wiring is absent from the pre-migration snapshot).

## Editable Surface

You may ONLY modify these files:

1. `src/migration/` — Migration execution logic (how code transforms are applied)
2. `src/templates/` — Init templates (provider wiring, config generation)
3. `src/init/` — Adapter integration (how adapters are configured)
4. `src/rewriter/rewriteFile.ts` — Code rewriting logic
5. `src/catalog/source-libraries/*.json` — Component and prop mappings

**You MUST NOT edit:**

- `autoresearch/evaluate.ts` (the evaluation harness)
- `autoresearch/capabilities/`* (capability evaluators)
- `autoresearch/expected/`** (the ground truth)
- `autoresearch/fixtures/` (the benchmark apps)
- Any test files

## Experimentation

Each experiment is one atomic change. Follow this loop:

1. **Analyze** — Look at the current evaluation output (stderr) to identify which fixtures and assertions are failing. Focus on the `missed` array — it tells you exactly what went wrong.
2. **Hypothesize** — Form a single, clear hypothesis about what CLI change will fix the runtime failure. Write it down. Common failure classes:
  - **Provider not found:** The migrated app's entry point doesn't wrap with the right providers.
  - **Config not loaded:** Adapter config (e.g., RainbowKit wagmi params) not wired before provider mounts.
  - **Missing imports:** Migration execution replaced imports but left broken references.
  - **Build failure:** Transformed code has syntax/type errors that prevent compilation.
  - **Server startup failure:** package.json scripts missing or dependencies not installed.
3. **Implement** — Make the smallest possible change that tests the hypothesis. Prefer fixing init templates and migration execution over adding workarounds.
4. **Safety gate** — Run `pnpm test`. If tests fail → mark as **crashed**, revert all changes, and try a different approach.
5. **Evaluate** — Run `npx tsx autoresearch/evaluate.ts --capability runtime`. Capture the new score.
6. **Decision:**
  - If the score **improved** (even slightly) → **keep** the change.
  - If the score **stayed the same or got worse** → **discard** the change (revert).

If `autoresearch/results-runtime.tsv` is empty, your first experiment should be the baseline run with no code changes so you have a trustworthy starting score.

## Output format

After each experiment, output exactly one line in this format:

```
<experiment_number>	<status>	<score>	<description>
```

Where:

- `experiment_number`: sequential integer starting at 1
- `status`: one of `keep`, `discard`, `crash`
- `score`: the aggregate score AFTER the experiment (6 decimal places)
- `description`: brief one-line description of what was tried

Example:

```
1	keep	0.800000	Baseline
2	keep	0.900000	Fix init template to wire RuntimeProvider in main.tsx entry point
3	crash	0.900000	Attempted adapter config change broke unit tests
4	keep	1.000000	Fix Vite module serving by adding correct OZ package to optimizeDeps
```

## Logging results

Append each experiment line to `autoresearch/results-runtime.tsv`. The file has no header — just data rows.

Before your first experiment, if `results-runtime.tsv` does not exist, create it empty.

## The experiment loop

```
while True:
    analyze the current failing assertions (missed array)
    form one hypothesis about the root cause
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
2. **Fix the CLI, not the fixture.** Do NOT modify runtime fixture expectations to make them pass — fix the migration pipeline.
3. **Generic solutions only.** Do NOT add workarounds that only work for one fixture — solutions must work for any project the CLI migrates.
4. **Tests are non-negotiable.** A crashed experiment is worse than a discarded one.
5. **Trace from symptom to root cause.** A failing `body-contains` assertion means the server responded but the content is wrong. A failing `status-ok` means the server returned an error. A `server-not-ready` means the app couldn't even start. Diagnose accordingly.
6. **Init templates before execution logic.** Many runtime failures stem from incorrect provider wiring in the generated entry point. Check init templates first.
7. **Preserve static capability scores.** Runtime fixes must not regress detection, patterns, planning, execution, verification, or orchestration.

## Simplicity criterion

When two approaches yield the same score improvement, prefer the simpler one. Complexity is measured by:

- Lines of code changed (fewer is better)
- Number of new template branches or heuristics added (fewer is better)
- Cognitive load of the change (lower is better)

## Known improvement opportunities

1. **RuntimeProvider wiring** — The init template should generate a `main.tsx` that wraps the app with `RuntimeProvider` and `WalletStateProvider` in the correct order.
2. **Adapter config timing** — RainbowKit/wagmi config must be loaded and passed to the runtime *before* providers mount. Config-order bugs cause `WagmiProviderNotFoundError`.
3. **Dependency installation** — The migration should ensure `@openzeppelin/ui-react`, `@openzeppelin/adapter-evm`, and related packages are added to `package.json`.
4. **Vite compatibility** — Migrated entry modules must be serveable by the project's bundler (Vite, webpack, etc.) without import resolution errors.

## NEVER STOP

Keep running experiments until you reach score = 1.000000 or you have exhausted all reasonable approaches. If stuck, try creative alternatives:

- Re-read the evaluator output to trace exactly which HTTP endpoint and assertion is failing
- Inspect the fixture project's `main.tsx`, `package.json`, and config files to understand what the migration produced
- Compare the migrated output against a known-working OZ app entry point
- Check whether the Vite dev server logs reveal import resolution or compilation errors
- Revisit near-miss experiments and combine the best compatible ideas

Once the experiment loop has begun, do NOT pause to ask the human whether you should continue. Do NOT ask "should I keep going?" The human may be away from the computer and expects you to continue autonomously until interrupted.