/**
 * Capability 7: Orchestration evaluator.
 *
 * Primary: subagent replay (agent-runtime agnostic — Cursor, Claude Code, etc.)
 * Fallback: static checklist analysis of SKILL.md structural properties.
 *
 * The static checklist is always available; subagent replay requires an LLM
 * runtime and is designed for future integration.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  type CapabilityEvaluator,
  type EvaluationResult,
  type FixtureScore,
  EXPECTED_DIR,
  checklistScore,
} from './shared.js';

const __capDir = path.dirname(fileURLToPath(import.meta.url));
const SKILL_PATH = path.resolve(
  __capDir,
  '..', '..', 'src', 'templates', 'skills', 'migrate-to-oz-uikit', 'SKILL.md'
);

interface ChecklistItem {
  id: string;
  description: string;
  check: (content: string) => boolean;
}

const STRUCTURAL_CHECKLIST: ChecklistItem[] = [
  {
    id: 'mentions-init',
    description: 'References oz-ui migrate init command',
    check: (c) => /oz-ui\s+migrate\s+init/i.test(c),
  },
  {
    id: 'mentions-analyze',
    description: 'References oz-ui migrate analyze command',
    check: (c) => /oz-ui\s+migrate\s+analyze/i.test(c),
  },
  {
    id: 'mentions-plan',
    description: 'References oz-ui migrate plan command',
    check: (c) => /oz-ui\s+migrate\s+plan/i.test(c),
  },
  {
    id: 'mentions-doctor',
    description: 'References oz-ui migrate doctor command',
    check: (c) => /oz-ui\s+migrate\s+doctor/i.test(c),
  },
  {
    id: 'phase-gates',
    description: 'Includes phase gate / completion check logic',
    check: (c) => /phase.*gate|gate.*phase|completion.*check|verify.*phase/i.test(c),
  },
  {
    id: 'error-recovery',
    description: 'Includes error recovery instructions',
    check: (c) => /error.*recover|recover.*error|fail.*retry|rollback|revert/i.test(c),
  },
  {
    id: 'resume-support',
    description: 'References resume or partial migration support',
    check: (c) => /resume|partial.*migration|continue.*where|pick.*up/i.test(c),
  },
  {
    id: 'setup-phase',
    description: 'Covers setup phase',
    check: (c) => /setup\s+phase|phase.*setup|init.*step|initialization/i.test(c),
  },
  {
    id: 'component-phase',
    description: 'Covers component replacement phase',
    check: (c) => /component.*replace|replace.*component|ui.*component.*migrat/i.test(c),
  },
  {
    id: 'wallet-phase',
    description: 'Covers wallet adapter phase',
    check: (c) => /wallet.*adapt|adapt.*wallet|wallet.*migrat/i.test(c),
  },
  {
    id: 'manifest-reference',
    description: 'References migration manifest',
    check: (c) => /migration.*manifest|manifest.*json|manifest.*file/i.test(c),
  },
  {
    id: 'capability-threading',
    description: 'Mentions capability threading or prop passing',
    check: (c) => /capabilit.*thread|thread.*capabilit|chainId|provider.*prop/i.test(c),
  },
];

interface ScenarioFixture {
  name: string;
  description: string;
  expectedCommands: string[];
  expectedGates: string[];
}

function discoverScenarios(): ScenarioFixture[] {
  const scenarioDir = path.join(EXPECTED_DIR, 'orchestration');
  if (!fs.existsSync(scenarioDir)) return [];

  const scenarios: ScenarioFixture[] = [];

  for (const entry of fs.readdirSync(scenarioDir, { withFileTypes: true })) {
    if (!entry.name.endsWith('.json')) continue;
    const data = JSON.parse(fs.readFileSync(path.join(scenarioDir, entry.name), 'utf8'));
    scenarios.push(data);
  }

  return scenarios;
}

function evaluateChecklist(): FixtureScore {
  if (!fs.existsSync(SKILL_PATH)) {
    return {
      fixture: 'skill-checklist',
      precision: 0,
      recall: 0,
      f1: 0,
      truePositives: 0,
      falsePositives: 0,
      falseNegatives: STRUCTURAL_CHECKLIST.length,
      details: { matched: [], missed: ['skill-not-found'], extra: [] },
    };
  }

  const content = fs.readFileSync(SKILL_PATH, 'utf8');
  const results = STRUCTURAL_CHECKLIST.map((item) => ({
    id: item.id,
    passed: item.check(content),
  }));

  const matched = results.filter((r) => r.passed).map((r) => r.id);
  const missed = results.filter((r) => !r.passed).map((r) => r.id);
  const score = checklistScore(results.map((r) => r.passed));

  return {
    fixture: 'skill-checklist',
    precision: score,
    recall: score,
    f1: score,
    truePositives: matched.length,
    falsePositives: 0,
    falseNegatives: missed.length,
    details: { matched, missed, extra: [] },
  };
}

export const orchestrationEvaluator: CapabilityEvaluator = {
  name: 'orchestration',

  evaluate(): EvaluationResult {
    const scores: FixtureScore[] = [];

    scores.push(evaluateChecklist());

    const scenarios = discoverScenarios();
    if (scenarios.length > 0) {
      // Subagent replay integration point — future LLM-based evaluation
      // For now, scenario fixtures are discovered but not executed
      // When an LLM runtime is available, each scenario would:
      // 1. Send SKILL.md + scenario context to the LLM
      // 2. Parse the response for command sequences
      // 3. Score against expectedCommands and expectedGates
    }

    const aggregate =
      scores.length > 0 ? scores.reduce((sum, s) => sum + s.f1, 0) / scores.length : 0;

    return {
      capability: 'orchestration',
      scores,
      aggregate,
    };
  },
};
