/**
 * Capability 3: Plan Generation evaluator.
 *
 * Uses frozen analysis reports so plan quality is measured independently of
 * detection quality. Metric is a gated composite:
 *   - If forbidden_ratio > 0.1 → cap total at 0.5
 *   - Otherwise: Task F1 (70%) + Phase order accuracy (30%)
 */

import path from 'node:path';

import { generatePlanTasks } from '../../src/planning/generate.js';
import { loadExclusions } from '../../src/catalog/exclusions.js';

import {
  type CapabilityEvaluator,
  type EvaluationResult,
  type FixtureScore,
  EXPECTED_DIR,
  computeF1FromSets,
  discoverFixtures,
  fixtureHasExpected,
  loadExpectedFile,
  loadJsonFile,
} from './shared.js';

import type { AnalysisReport } from '../../src/analysis/index.js';

interface ExpectedTask {
  type: string;
  sourceComponent: string;
  targetComponent: string;
  phase: string;
}

interface ForbiddenTask {
  sourceComponent: string;
  reason: string;
}

interface ExpectedWalletTask {
  pattern: string;
  file: string;
}

interface ForbiddenWalletFile {
  file: string;
  reason: string;
}

interface ExpectedPlanning {
  fixture: string;
  analysisReport: string;
  expectedTasks: ExpectedTask[];
  forbiddenTasks: ForbiddenTask[];
  expectedWalletTasks?: ExpectedWalletTask[];
  forbiddenWalletFiles?: ForbiddenWalletFile[];
}

const FORBIDDEN_GATE_THRESHOLD = 0.1;
const FORBIDDEN_CAP = 0.5;
const COMPONENT_WEIGHT = 0.6;
const WALLET_WEIGHT = 0.2;
const PHASE_ORDER_WEIGHT = 0.2;

function taskKey(type: string, source: string, target: string): string {
  return `${type}::${source}::${target}`;
}

function walletTaskKey(pattern: string, file: string): string {
  return `wallet::${pattern}::${file}`;
}

function evaluateFixture(fixtureName: string): FixtureScore {
  const expected = loadExpectedFile<ExpectedPlanning>(fixtureName, 'planning');

  const frozenReportPath = path.join(EXPECTED_DIR, 'planning', expected.analysisReport);
  const frozenReport = loadJsonFile<AnalysisReport>(frozenReportPath);

  const exclusions = loadExclusions();
  const actualTasks = generatePlanTasks(frozenReport);

  // --- Component task scoring ---
  const expectedSet = new Set(
    expected.expectedTasks.map((t) => taskKey(t.type, t.sourceComponent, t.targetComponent))
  );

  const forbiddenSources = new Set(expected.forbiddenTasks.map((t) => t.sourceComponent));

  const componentTasks = actualTasks.filter(
    (t) => t.type === 'component-replacement' || t.type === 'form-field-replacement'
  );

  const actualSet = new Set<string>();
  let forbiddenCount = 0;

  for (const t of componentTasks) {
    if (!t.sourceComponent || !t.targetComponent) continue;

    const isExcluded = exclusions.excludedLibraries.some((lib) =>
      t.description?.toLowerCase().includes(lib.toLowerCase())
    );
    if (isExcluded) continue;

    if (forbiddenSources.has(t.sourceComponent)) {
      forbiddenCount++;
      continue;
    }

    const key = taskKey(t.type, t.sourceComponent, t.targetComponent);
    actualSet.add(key);
  }

  const componentF1Result = computeF1FromSets(expectedSet, actualSet);

  // --- Wallet task scoring ---
  let walletScore = 1;
  if (expected.expectedWalletTasks && expected.expectedWalletTasks.length > 0) {
    const walletTasks = actualTasks.filter((t) => t.type === 'wallet-replacement');
    const forbiddenWalletFileSet = new Set(
      (expected.forbiddenWalletFiles ?? []).map((f) => f.file)
    );

    const expectedWalletSet = new Set(
      expected.expectedWalletTasks.map((t) => walletTaskKey(t.pattern, t.file))
    );

    const actualWalletSet = new Set<string>();
    for (const t of walletTasks) {
      if (!t.file) continue;
      if (forbiddenWalletFileSet.has(t.file)) continue;
      const patternName = t.description?.match(/Replace (\S+) usage/)?.[1] ?? 'unknown';
      actualWalletSet.add(walletTaskKey(patternName, t.file));
    }

    const walletF1Result = computeF1FromSets(expectedWalletSet, actualWalletSet);
    walletScore = walletF1Result.f1;
  }

  // --- Phase order scoring ---
  let phaseOrderScore = 0;
  if (expected.expectedTasks.length > 0) {
    let correctPhase = 0;
    for (const et of expected.expectedTasks) {
      const matching = componentTasks.find(
        (t) => t.sourceComponent === et.sourceComponent && t.targetComponent === et.targetComponent
      );
      if (matching && matching.phase === et.phase) correctPhase++;
    }
    phaseOrderScore = correctPhase / expected.expectedTasks.length;
  }

  const forbiddenRatio =
    componentTasks.length > 0 ? forbiddenCount / componentTasks.length : 0;

  let composite =
    COMPONENT_WEIGHT * componentF1Result.f1 +
    WALLET_WEIGHT * walletScore +
    PHASE_ORDER_WEIGHT * phaseOrderScore;

  if (forbiddenRatio > FORBIDDEN_GATE_THRESHOLD) {
    composite = Math.min(composite, FORBIDDEN_CAP);
  }

  return {
    fixture: fixtureName,
    ...componentF1Result,
    f1: composite,
  };
}

export const planningEvaluator: CapabilityEvaluator = {
  name: 'planning',

  evaluate(): EvaluationResult {
    const fixtures = discoverFixtures().filter((f) => fixtureHasExpected(f, 'planning'));
    const scores = fixtures.map(evaluateFixture);

    const aggregate =
      scores.length > 0 ? scores.reduce((sum, s) => sum + s.f1, 0) / scores.length : 0;

    return {
      capability: 'planning',
      scores,
      aggregate,
    };
  },
};
