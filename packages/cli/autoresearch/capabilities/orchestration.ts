/**
 * Capability 7: Orchestration evaluator.
 *
 * Scores the migration skill in two ways:
 * 1. Structural checklist coverage
 * 2. Scenario sequence coverage for fresh-start and resume flows
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
  {
    id: 'cleanup-phase',
    description: 'Covers cleanup phase (stale deps removal, scaffolding cleanup)',
    check: (c) => /cleanup\s+phase|remove.stale|cleanup.scaffolding|remove.*stale.*dep/i.test(c),
  },
  {
    id: 'reconciliation',
    description: 'Mentions reconciliation or --reconcile for resume flows',
    check: (c) => /reconcil|--reconcile/i.test(c),
  },
];

interface ScenarioFixture {
  name: string;
  description: string;
  expectedCommands: string[];
  expectedGates: string[];
}

function normalizedContent(content: string): string {
  return content.toLowerCase();
}

function includesOrderedSequence(content: string, expectedCommands: string[]): boolean {
  let lastIndex = -1;
  const lower = normalizedContent(content);

  for (const command of expectedCommands) {
    const currentIndex = lower.indexOf(command.toLowerCase(), lastIndex + 1);
    if (currentIndex === -1) return false;
    lastIndex = currentIndex;
  }

  return true;
}

function gatePattern(gate: string): RegExp {
  switch (gate) {
    case 'init-complete-before-analyze':
      return /if no manifest exists[\s\S]*migrate init[\s\S]*skip to analysis|run initialization[\s\S]*skip to analysis/i;
    case 'analyze-complete-before-plan':
      return /step 2: analyze[\s\S]*step 3: user alignment[\s\S]*step 4: generate plan/i;
    case 'check-status-before-continuing':
      return /if manifest exists[\s\S]*migrate status[\s\S]*migrate doctor/i;
    case 'verify-phase-before-next':
      return /phase gate|only proceed to the next phase after user approval/i;
    case 'phase-gate-before-next-phase':
      return /phase gate|only proceed to the next phase/i;
    case 'cleanup-tasks-after-all-phases':
      return /cleanup|remove.stale|scaffolding/i;
    case 'reconcile-codebase-against-manifest':
      return /reconcil|--reconcile|codebase.*state.*against.*manifest/i;
    case 'failed-task-recovery-via-in_progress':
      return /failed.*in_progress|retry|recover.*fail/i;
    default:
      return new RegExp(gate, 'i');
  }
}

function evaluateScenario(content: string, scenario: ScenarioFixture): FixtureScore {
  const checks: { id: string; passed: boolean }[] = [];

  for (const command of scenario.expectedCommands) {
    checks.push({
      id: `command:${command}`,
      passed: new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(content),
    });
  }

  if (scenario.expectedCommands.length > 1) {
    checks.push({
      id: 'command-order',
      passed: includesOrderedSequence(content, scenario.expectedCommands),
    });
  }

  for (const gate of scenario.expectedGates) {
    checks.push({
      id: `gate:${gate}`,
      passed: gatePattern(gate).test(content),
    });
  }

  const matched = checks.filter((check) => check.passed).map((check) => check.id);
  const missed = checks.filter((check) => !check.passed).map((check) => check.id);
  const score = checklistScore(checks.map((check) => check.passed));

  return {
    fixture: scenario.name,
    precision: score,
    recall: score,
    f1: score,
    truePositives: matched.length,
    falsePositives: 0,
    falseNegatives: missed.length,
    details: { matched, missed, extra: [] },
  };
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
    const content = fs.existsSync(SKILL_PATH) ? fs.readFileSync(SKILL_PATH, 'utf8') : '';

    scores.push(evaluateChecklist());

    const scenarios = discoverScenarios();
    scores.push(...scenarios.map((scenario) => evaluateScenario(content, scenario)));

    const aggregate =
      scores.length > 0 ? scores.reduce((sum, s) => sum + s.f1, 0) / scores.length : 0;

    return {
      capability: 'orchestration',
      scores,
      aggregate,
    };
  },
};
