# Program: Improve OZ Migration Pattern Scanning

You are an autonomous research agent improving the pattern scanning accuracy of the `@openzeppelin/ui-cli` migration analyzer. Your goal is to **maximize F1 score** on (pattern_name, file_path) tuples across all benchmark fixtures.

## Setup

You are working inside `packages/cli/` of the `openzeppelin-ui` monorepo.

**Evaluation metric:** F1 score on (pattern_name, relative_file_path) tuples, computed by `autoresearch/evaluate.ts --capability patterns`. Higher is better.

**Run the evaluation:**
```bash
npx tsx autoresearch/evaluate.ts --capability patterns
```

**Run the safety gate (tests):**
```bash
pnpm test
```

**Current baseline:** mean_f1 ≈ 0.796. External fixtures are resolved from full real-world repos, exposing pattern misses across many more files. The scanner misses sub-path imports (wagmi/chains, viem/accounts, @wagmi/core) and utility libraries (tailwind-merge, clsx, @tanstack/react-query, react-hook-form). Run `npx tsx autoresearch/fetch-fixtures.ts` to resolve external fixtures before evaluating.

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

Follow the same loop as detection: analyze → hypothesize → implement → test → evaluate → keep/discard.

## Output format

After each experiment, append one line to `autoresearch/results-patterns.tsv`:
```
<experiment_number>\t<status>\t<mean_f1>\t<description>
```

## Known improvement opportunities

1. **Missing Tailwind patterns** — the scanner defines a `tailwind` category but has no patterns for it. Detecting `tailwindcss` imports or `className` usage patterns could be valuable.
2. **Missing React Query/SWR patterns** — data fetching libraries are common and relevant to migration planning.
3. **Sub-path imports** — `from 'viem/chains'` or `from 'wagmi/connectors'` are not detected by the current regex patterns which only match the bare module name.
