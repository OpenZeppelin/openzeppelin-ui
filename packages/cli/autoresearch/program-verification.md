# Program: Improve OZ Migration Verification (Doctor)

You are an autonomous research agent improving the `oz-ui migrate doctor` verification checker. Your goal is to **maximize the composite score** (classification accuracy + diagnostic precision) across all verification fixtures.

## Setup

You are working inside `packages/cli/` of the `openzeppelin-ui` monorepo.

**Evaluation metric:** `(classification_accuracy * 0.6) + (diagnostic_precision * 0.4)`
- Classification accuracy: fraction of fixtures correctly classified as pass/fail
- Diagnostic precision: for broken fixtures, fuzzy keyword match on diagnostics

**Run the evaluation:**
```bash
npx tsx autoresearch/evaluate.ts --capability verification
```

**Run the safety gate (tests):**
```bash
pnpm test
```

**Current baseline:** mean_score ≈ 0.619. The checker correctly handles basic cases but misclassifies: aliased old imports (mixed-import-sources), wrong OZ package (ui-react vs ui-components), and stale raw HTML elements alongside OZ components.

## Editable Surface

You may ONLY modify:

1. `src/verification/checker.ts` — The core verification logic

**You MUST NOT edit:**
- `autoresearch/evaluate.ts` or `autoresearch/capabilities/*`
- `autoresearch/expected/**`
- Any test files

## Experimentation

Follow the same loop: analyze → hypothesize → implement → test → evaluate → keep/discard.

Append each experiment line to `autoresearch/results-verification.tsv`.

## Source classification rules

Before changing verification behavior for any import source, classify what kind of source it is:

1. **Local path aliases** — imports like `@/foo`, `~/foo`, or other aliases that resolve to the fixture's own source tree.
2. **Workspace-local packages** — imports declared via `workspace:*`, monorepo package references, or other local package links. These are part of the migration surface and **must be verified as migratable sources** unless explicitly excluded elsewhere.
3. **External libraries** — third-party dependencies that are not maintained as part of the local workspace.

When the source type is not obvious, inspect the fixture's `package.json`, `tsconfig*.json`, and bundler config (`vite.config.*`, `webpack.config.*`, etc.) before forming a hypothesis.

## Guardrails for exclusions

Do not add fixture-shaped exclusions such as `source === 'X' && component === 'Y'` unless the rule reflects a real product invariant rather than a benchmark optimization.

Before excluding an import source or component family from verification, verify and document:

1. Whether it is a local alias, workspace-local package, or external library.
2. Why it should be excluded from verification as a product rule.
3. Why a broader source-classification rule would not be more correct than a one-off exclusion.

## Known improvement opportunities

1. **Orphaned import detection** — The checker should detect when old (non-OZ) imports of a component still exist alongside the new OZ import.
2. **Diagnostic specificity** — Error messages should name the specific component and what's wrong.
3. **Provider hierarchy validation** — Check that providers are nested in the correct order.
4. **Workspace package imports are in scope** — local monorepo packages imported as packages (for example via `workspace:*`) must be validated as migration sources, not treated like remote third-party packages by default.
