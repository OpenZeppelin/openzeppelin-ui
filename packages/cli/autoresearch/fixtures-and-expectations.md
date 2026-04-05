# Fixtures and expectations

This document explains **how to add a benchmark fixture** and, critically, **how to author the matching expectation files**. Dropping only source code under `fixtures/` without ground truth leaves the autoresearch harness blind: scores are meaningless, and regressions go unnoticed.

For the high-level autoresearch overview, see [README.md](./README.md).

---

## What “expectations” are for

Each capability compares **what the CLI does** on a fixture against **frozen ground truth** you commit under `expected/`.

- **Detection** — F1 on `(component name, ozTarget)` tuples vs `expected/<fixture>.json`.
- **Patterns** — F1 on `(pattern name, relative file path)` tuples vs `expected/patterns/<fixture>.json`.
- **Planning, init, execution, verification, orchestration** — each has its own files under `expected/<subdir>/` when that fixture participates in that capability.

Expectations are **the definition of correct** for those fixtures. They are not automatic truth: if you set expected output equal to whatever the scanner currently prints, the metric will read **1.0** but you will only have proven **agreement with today’s implementation**, not that the product is right for real migrations. Good practice is to encode **what migrators should care about** (and document edge cases), then change the implementation—or deliberately revise expectations—when they disagree.

---

## Adding a fixture: full checklist

### 1. Choose synthetic vs external


| Kind          | Where it lives                                                           | When to use                                                             |
| ------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| **Synthetic** | `autoresearch/fixtures/<name>/` (committed)                              | Small, controlled scenarios (negative controls, one library at a time). |
| **External**  | Resolved into `fixtures/<name>/` via `_external.json` (often gitignored) | Real apps, monorepo slices, production-like trees.                      |


### 2. Register the fixture source

**External**

1. Add an entry to `[fixtures/_external.json](./fixtures/_external.json)` (repo, pinned commit, optional `subPath`, `sparsePaths`, etc.).
2. Add the fixture directory name to `[fixtures/.gitignore](./fixtures/.gitignore)` if the resolved tree must not be committed.
3. Run `npx tsx autoresearch/fetch-fixtures.ts` and verify with `--status`.

**Synthetic**

1. Create `autoresearch/fixtures/<name>/` with a minimal app (e.g. `src/`, `package.json` if needed).
2. Commit the tree.

### 3. Register metadata (per capability)

Evaluators that care about train/holdout/validation read small config files:

- `[config/detection-fixtures.json](./config/detection-fixtures.json)` — detection splits/tags.
- `[config/pattern-fixtures.json](./config/pattern-fixtures.json)` — patterns splits/tags.

Add a `{ "name": "<fixture>", "split": "train" | "holdout" | "validation", "tags": [...] }` entry when that fixture should participate in that capability’s scoring. The `adversarial` split is **included in the primary mean F1 aggregate** — the agent cannot reach 1.0 without also passing the adversarial fixture.

### 4. Add **all** expectation artifacts the fixture needs

A fixture is only picked up by an evaluator if the corresponding expected file **exists**. Use this map:


| Capability    | Expected path (typical)            | Notes                                                    |
| ------------- | ---------------------------------- | -------------------------------------------------------- |
| Detection     | `expected/<fixture>.json`          | Component ground truth; see existing fixtures for shape. |
| Patterns      | `expected/patterns/<fixture>.json` | Pattern × file list; see below.                          |
| Planning      | `expected/planning/...`            | See `program-planning.md` and existing frozen reports.   |
| Init          | `expected/init/...`                | Checklist expectations per `program-init.md`.            |
| Execution     | `expected/execution/...`           | Before/task/after triples per `program-execution.md`.    |
| Verification  | `expected/verification/...`        | Correct/broken projects per `program-verification.md`.   |
| Orchestration | `expected/orchestration/...`       | Per `program-orchestration.md`.                          |


**Rule of thumb:** if you add a fixture name to a capability config, you should add the matching `expected/` files for that capability, or evaluation will skip or fail for that combination.

### 5. Verify

```bash
pnpm --filter @openzeppelin/ui-cli evaluate:all
# or targeted:
npx tsx autoresearch/evaluate.ts --capability patterns
npx tsx autoresearch/evaluate.ts --capability detection
```

---

## Pattern expectations format

File: `expected/patterns/<fixture>.json`

```json
{
  "fixture": "my-app",
  "patterns": [
    {
      "name": "viem",
      "files": [
        "src/hooks/useClients.ts",
        "src/services/ExampleService.ts"
      ]
    },
    {
      "name": "localStorage",
      "files": ["src/App.tsx"]
    }
  ]
}
```

- `**name**` — Must match the **display name** the pattern catalog/scanner emits (e.g. `wagmi`, `viem`, `oz-ui-components`). If the catalog gains separate rules for subpaths (e.g. `wagmi/chains`), those names must match exactly.
- `**files`** — Paths **relative to the fixture root** (same as `scanPatterns` output). Sorting is optional; evaluation uses set equality.

---

## Planning expectation checklist

Planning expectations are especially easy to under-label because the evaluator uses a
**frozen analysis report** as input, while authors naturally reason from the richer
live fixture source. Use this checklist when creating or reviewing
`expected/planning/<fixture>.json`.

### Goal

Capture what a **good planner should emit from the frozen input**, while using the
fixture source to identify false positives and to validate whether a detected item is
actually a meaningful migration surface.

### Checklist

1. Start from the frozen report, not from the current planner output.
  The frozen report defines the planner's observable input. Do not copy today's
   planner behavior into the expected file.
2. Use the fixture source to validate meaning, not to invent unsupported positives.
  If the live source suggests an important migration task but the frozen report never
   exposes the signal, do not add it as a positive expectation in this fixture.
3. Label both positives and negatives.
  A good planning fixture should penalize both under-generation and over-generation.
4. Add `forbiddenTasks` aggressively for non-migratable component detections.
  Common cases: routing primitives, icons, app/page components, local feature
   wrappers, context providers, controllers, and helper-only components.
5. Classify wallet-pattern files before labeling them.
  For each wallet-pattern file in the frozen report, decide whether it is:
  - real wallet/provider/client migration work
  - a type-only import
  - an encoding or ABI utility
  - a chain registry or network metadata file
  - a formatting/validation/helper file
   Only the first category belongs in `expectedWalletTasks`.
6. Avoid impossible expectations.
  Do not add `(pattern, file)` pairs or component tasks that the frozen report could
   never produce.
7. Review every wallet-pattern file exactly once.
  Every file surfaced by a wallet pattern in the frozen report should usually end up
   either in `expectedWalletTasks` or `forbiddenWalletFiles`. Leaving many files
   unlabeled is often a sign of under-specification.
8. Pressure-test the fixture before accepting it.
  Ask:
  - Would a bad planner that emits tasks for `Route`, local wrappers, or providers
  get penalized?
  - Would a bad planner that skips genuine wallet/provider migration files get
  penalized?
  - Would this fixture still be informative if the current planner already scores
  `1.0`?

### Healthy signs

- A `1.0` score means the planner matched a non-trivial set of positives and avoided
meaningful negatives.
- The expected file explains why false positives are false positives.
- Positive wallet tasks correspond to real adapter/provider/client migration work, not
generic `viem` utility usage.

### Red flags

- The expected file looks like a paraphrase of the current planner output.
- There are many wallet-pattern files in the frozen report, but only a handful are
classified as expected or forbidden.
- `forbiddenTasks` only lists one obvious routing component even though the fixture
contains many local app-level detections.
- The fixture scores `1.0`, but a clearly over-generating planner would also score
`1.0`.

---

## Using an LLM to draft expectations (safely)

Creating a rigorous ground truth file by hand across hundreds of files is exhausting. Using an LLM to generate it is highly recommended—**if you use the LLM correctly**.

We have compiled a collection of prompt templates for the different capabilities in the **[LLM Prompts Collection](./llm-prompts-collection.md)**.

These prompts use the **"Data Labeler" vs "Solver"** workflow, which ensures that the LLM deeply scans the codebase using semantic understanding to produce an *aspirational* ground truth, rather than just letting the CLI grade its own homework.

**Read the [LLM Prompts Collection](./llm-prompts-collection.md) to understand the workflow and copy the specific prompt for the capability you are targeting (Patterns, Detection, etc.).**

> **Shortcut:** The autoresearch dashboard exposes a **"Label fixture"** button on every page. It presents the same prompt templates with a capability selector and fixture-name input, ready to copy into an agent chat.

---

## Adversarial fixtures

Multiple capabilities include auto-generated **adversarial fixtures** that stress-test generalization by randomizing names, paths, and structural context on each run.

### Detection adversarial fixture

Uses real OZ component names but randomized package scopes, path aliases, and directory layouts.

- **Generate/regenerate:** `npx tsx autoresearch/generate-adversarial-fixture.ts`
- **Scored under the `adversarial` split** — included in the primary mean F1 aggregate, so the agent cannot declare victory without solving it.
- Regenerated after each accepted detection experiment.

### Execution adversarial fixtures

Generates synthetic `before.tsx` / `task.json` / `after.tsx` triples with fully randomized component names, import paths, and prop names.

- **Generate/regenerate:** `npx tsx autoresearch/generate-adversarial-execution.ts`
- Output placed at `expected/execution/adversarial/` — discovered automatically by the evaluator.
- Tests that the rewriter operates from `MigrationTask` properties, not hardcoded component names.

### Verification adversarial fixtures

Generates synthetic verification scenarios (pass/fail) with randomized component names and import sources.

- **Generate/regenerate:** `npx tsx autoresearch/generate-adversarial-verification.ts`
- Output placed at `expected/verification/adversarial/` — discovered automatically by the evaluator.
- Creates 4 scenarios: correct migration (pass), orphaned old import (fail), wrong OZ package (fail), missing OZ import (fail).

## Structural lint gates

Five capabilities have hard lint gates that automatically prevent fixture-specific hardcoding in their editable TypeScript surfaces. All share infrastructure from `lint-shared.ts`.


| Capability   | Lint command                                | Editable surface checked                                             |
| ------------ | ------------------------------------------- | -------------------------------------------------------------------- |
| Detection    | `npx tsx autoresearch/lint-detection.ts`    | `component-matcher.ts`, `import-classifier.ts`, `import-resolver.ts` |
| Patterns     | `npx tsx autoresearch/lint-patterns.ts`     | `pattern-scanner.ts`                                                 |
| Planning     | `npx tsx autoresearch/lint-planning.ts`     | `plan.ts`, `generate.ts`, `exclusions.json`                          |
| Execution    | `npx tsx autoresearch/lint-execution.ts`    | `rewriteFile.ts`                                                     |
| Verification | `npx tsx autoresearch/lint-verification.ts` | `checker.ts`                                                         |


Each lint gate:

- Extracts fixture names, workspace package specifiers, and external manifest identifiers at runtime from whatever fixtures exist on disk.
- Checks the capability's editable files for string literal references to those identifiers.
- Self-updating: adding a new fixture automatically extends the lint coverage.
- Adds capability-specific checks (e.g., detection checks for inline component allowlists; planning checks `exclusions.json` for fixture-shaped entries).

---

## Anti-patterns

- **Fixture without expectations** — Breaks or skips evaluation; defeats autoresearch.
- **Expectations = copy-paste of current scanner output** — Inflates F1 without validating behavior.
- **Mismatched pattern names** — Typos or wishful names (`wagmi/chains` when the scanner only reports `wagmi`) cause false misses until catalog or expectations align by design.
- **Wrong relative paths** — Paths must be relative to the fixture root as resolved on disk, not the monorepo root.

---

## Related tools

- **Detection scaffold:** `npx tsx autoresearch/scaffold-expected.ts <fixture-name>` (from `packages/cli`) generates `expected/<fixture>.scaffold.json` from current detection output. The [LLM Prompts Collection](./llm-prompts-collection.md) detection prompt tells the agent to run this as step 1, then refine into `expected/<fixture>.json`. See comments in `scaffold-expected.ts`.

---

- **Adversarial generators** (run from `packages/cli`):
  - `npx tsx autoresearch/generate-adversarial-fixture.ts` — detection adversarial fixture
  - `npx tsx autoresearch/generate-adversarial-execution.ts` — execution adversarial fixtures
  - `npx tsx autoresearch/generate-adversarial-verification.ts` — verification adversarial fixtures
- **Structural lint gates** (run from `packages/cli`):
  - `npx tsx autoresearch/lint-detection.ts` — detection lint
  - `npx tsx autoresearch/lint-patterns.ts` — patterns lint
  - `npx tsx autoresearch/lint-planning.ts` — planning lint
  - `npx tsx autoresearch/lint-execution.ts` — execution lint
  - `npx tsx autoresearch/lint-verification.ts` — verification lint

---

## See also


| Doc                                            | Purpose                                                    |
| ---------------------------------------------- | ---------------------------------------------------------- |
| [README.md](./README.md)                       | Autoresearch overview, `fetch-fixtures`, evaluate commands |
| [program-patterns.md](./program-patterns.md)   | Agent loop for improving pattern scanning                  |
| [program-detection.md](./program-detection.md) | Agent loop for component detection                         |
| Per-capability `program-*.md`                  | Editable surface and protocols for other capabilities      |


