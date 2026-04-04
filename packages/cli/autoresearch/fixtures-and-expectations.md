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

Add a `{ "name": "<fixture>", "split": "train" | "holdout" | "validation", "tags": [...] }` entry when that fixture should participate in that capability’s scoring.

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

## Using an LLM to draft expectations (safely)

Creating a rigorous ground truth file by hand across hundreds of files is exhausting. Using an LLM to generate it is highly recommended—**if you use the LLM correctly**.

We have compiled a collection of prompt templates for the different capabilities in the **[LLM Prompts Collection](./llm-prompts-collection.md)**.

These prompts use the **"Data Labeler" vs "Solver"** workflow, which ensures that the LLM deeply scans the codebase using semantic understanding to produce an *aspirational* ground truth, rather than just letting the CLI grade its own homework.

**Read the [LLM Prompts Collection](./llm-prompts-collection.md) to understand the workflow and copy the specific prompt for the capability you are targeting (Patterns, Detection, etc.).**

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

## See also


| Doc                                            | Purpose                                                    |
| ---------------------------------------------- | ---------------------------------------------------------- |
| [README.md](./README.md)                       | Autoresearch overview, `fetch-fixtures`, evaluate commands |
| [program-patterns.md](./program-patterns.md)   | Agent loop for improving pattern scanning                  |
| [program-detection.md](./program-detection.md) | Agent loop for component detection                         |
| Per-capability `program-*.md`                  | Editable surface and protocols for other capabilities      |


