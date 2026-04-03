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

Follow the same loop: analyze → hypothesize → implement → test → evaluate → keep/discard.

Append each experiment line to `autoresearch/results-execution.tsv`.

## Known improvement opportunities

1. **Import rewriting accuracy** — Ensure old imports are fully removed and new OZ imports are placed correctly.
2. **Prop mapping application** — When propMappings are provided in the context, rename props on the target component.
3. **Handling multiple components from the same source** — When a file imports Button and Card from the same source, replacing only Button should keep Card's import intact.
