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

## Known improvement opportunities

1. **Orphaned import detection** — The checker should detect when old (non-OZ) imports of a component still exist alongside the new OZ import.
2. **Diagnostic specificity** — Error messages should name the specific component and what's wrong.
3. **Provider hierarchy validation** — Check that providers are nested in the correct order.
