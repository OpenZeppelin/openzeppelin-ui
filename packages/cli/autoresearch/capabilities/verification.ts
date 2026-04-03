/**
 * Capability 6: Verification (Doctor) evaluator.
 *
 * Tests whether the checker correctly classifies migrations as pass/fail
 * and produces accurate diagnostic messages.
 * Metric: (classification_accuracy * 0.6) + (diagnostic_precision * 0.4)
 */

import fs from 'node:fs';
import path from 'node:path';

import { checkTask, type TaskCheckResult } from '../../src/verification/checker.js';
import type { MigrationTask } from '../../src/manifest/schema.js';

import {
  type CapabilityEvaluator,
  type EvaluationResult,
  type FixtureScore,
  EXPECTED_DIR,
  loadJsonFile,
} from './shared.js';

interface VerificationFixture {
  name: string;
  dir: string;
  expectedStatus: 'pass' | 'fail';
  diagnosticKeywords: string[];
  task: MigrationTask;
}

function discoverVerificationFixtures(): VerificationFixture[] {
  const baseDir = path.join(EXPECTED_DIR, 'verification');
  if (!fs.existsSync(baseDir)) return [];

  const fixtures: VerificationFixture[] = [];

  function scanDir(dir: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (entry.name === 'project') continue;
        scanDir(path.join(dir, entry.name));
        continue;
      }

      if (!entry.name.endsWith('.json')) continue;

      const filePath = path.join(dir, entry.name);
      const data = loadJsonFile<{
        fixture: string;
        expectedStatus: 'pass' | 'fail';
        diagnosticKeywords?: string[];
        task: MigrationTask;
        projectDir?: string;
      }>(filePath);

      const name = path.relative(baseDir, filePath).replace(/\.json$/, '').replace(/[/\\]/g, '/');

      fixtures.push({
        name,
        dir: data.projectDir
          ? path.resolve(baseDir, data.projectDir)
          : path.join(baseDir, path.dirname(path.relative(baseDir, filePath)), 'project'),
        expectedStatus: data.expectedStatus,
        diagnosticKeywords: data.diagnosticKeywords ?? [],
        task: data.task,
      });
    }
  }

  scanDir(baseDir);
  return fixtures.sort((a, b) => a.name.localeCompare(b.name));
}

const CLASSIFICATION_WEIGHT = 0.6;
const DIAGNOSTIC_WEIGHT = 0.4;

function evaluateFixture(fixture: VerificationFixture): FixtureScore {
  let result: TaskCheckResult;

  try {
    result = checkTask(fixture.task, fixture.dir);
  } catch {
    return {
      fixture: fixture.name,
      precision: 0,
      recall: 0,
      f1: 0,
      truePositives: 0,
      falsePositives: 0,
      falseNegatives: 1,
      details: { matched: [], missed: ['checker-threw'], extra: [] },
    };
  }

  const actualPassed = result.passed;
  const expectedPassed = fixture.expectedStatus === 'pass';
  const classificationCorrect = actualPassed === expectedPassed;

  let diagnosticScore = 1;
  if (!expectedPassed && fixture.diagnosticKeywords.length > 0) {
    const allDiagnostics = result.diagnostics.join(' ').toLowerCase();
    let keywordMatches = 0;

    for (const keyword of fixture.diagnosticKeywords) {
      if (allDiagnostics.includes(keyword.toLowerCase())) keywordMatches++;
    }

    diagnosticScore = keywordMatches / fixture.diagnosticKeywords.length;
  }

  const score =
    CLASSIFICATION_WEIGHT * (classificationCorrect ? 1 : 0) +
    DIAGNOSTIC_WEIGHT * diagnosticScore;

  const matched: string[] = [];
  const missed: string[] = [];

  if (classificationCorrect) matched.push('classification');
  else missed.push(`classification:expected=${fixture.expectedStatus},got=${actualPassed ? 'pass' : 'fail'}`);

  if (diagnosticScore === 1) matched.push('diagnostics');
  else if (diagnosticScore > 0) matched.push(`diagnostics:partial(${diagnosticScore.toFixed(2)})`);
  else missed.push('diagnostics:no-keywords-matched');

  return {
    fixture: fixture.name,
    precision: score,
    recall: score,
    f1: score,
    truePositives: matched.length,
    falsePositives: 0,
    falseNegatives: missed.length,
    details: { matched, missed, extra: [] },
  };
}

export const verificationEvaluator: CapabilityEvaluator = {
  name: 'verification',

  evaluate(): EvaluationResult {
    const fixtures = discoverVerificationFixtures();
    const scores = fixtures.map(evaluateFixture);

    const aggregate =
      scores.length > 0 ? scores.reduce((sum, s) => sum + s.f1, 0) / scores.length : 0;

    return {
      capability: 'verification',
      scores,
      aggregate,
    };
  },
};
