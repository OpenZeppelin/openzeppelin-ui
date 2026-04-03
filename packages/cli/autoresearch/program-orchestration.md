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

Follow the same loop: analyze → hypothesize → implement → test → evaluate → keep/discard.

Append each experiment line to `autoresearch/results-orchestration.tsv`.

## Known improvement opportunities

1. **Error recovery** — SKILL.md should include explicit instructions for error recovery and rollback scenarios.
2. **Phase gate completeness** — Every migration phase should have clear completion criteria before proceeding.
3. **Resume support** — Include instructions for detecting and resuming partial migrations.
