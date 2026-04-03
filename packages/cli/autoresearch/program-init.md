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

Follow the same loop: analyze → hypothesize → implement → test → evaluate → keep/discard.

Append each experiment line to `autoresearch/results-init.tsv`.

## Known improvement opportunities

1. **Template content** — Ensure RuntimeProvider template imports the correct packages.
2. **resolve-runtime template** — Must contain the proper adapter resolution logic.
3. **Tailwind normalization** — Ensure Tailwind config is updated if present.
