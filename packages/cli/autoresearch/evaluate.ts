/**
 * Unified autoresearch evaluation harness.
 *
 * Runs one or all capability evaluators and reports results.
 * Fixed infrastructure: the autoresearch agent MUST NOT edit this file.
 *
 * Usage:
 *   npx tsx autoresearch/evaluate.ts                          # detection (default)
 *   npx tsx autoresearch/evaluate.ts --capability detection   # explicit
 *   npx tsx autoresearch/evaluate.ts --capability patterns
 *   npx tsx autoresearch/evaluate.ts --capability all         # run every capability
 *   npx tsx autoresearch/evaluate.ts --json                   # JSON output
 *   npx tsx autoresearch/evaluate.ts --capability all --json  # all + JSON
 */

import { detectionEvaluator } from './capabilities/detection.js';
import { executionEvaluator } from './capabilities/execution.js';
import { initEvaluator } from './capabilities/init.js';
import { orchestrationEvaluator } from './capabilities/orchestration.js';
import { patternsEvaluator } from './capabilities/patterns.js';
import { planningEvaluator } from './capabilities/planning.js';
import type { CapabilityEvaluator, EvaluationResult } from './capabilities/shared.js';
import { verificationEvaluator } from './capabilities/verification.js';

const EVALUATORS: Record<string, CapabilityEvaluator> = {
  detection: detectionEvaluator,
  patterns: patternsEvaluator,
  planning: planningEvaluator,
  init: initEvaluator,
  execution: executionEvaluator,
  verification: verificationEvaluator,
  orchestration: orchestrationEvaluator,
};

function parseCapabilityArg(): string {
  const idx = process.argv.indexOf('--capability');
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return 'detection';
}

function runCapability(name: string): EvaluationResult {
  const evaluator = EVALUATORS[name];
  if (!evaluator) {
    throw new Error(`Unknown capability: ${name}. Available: ${Object.keys(EVALUATORS).join(', ')}`);
  }
  return evaluator.evaluate();
}

function runAll(): EvaluationResult[] {
  return Object.values(EVALUATORS).map((ev) => ev.evaluate());
}

function main(): void {
  const jsonMode = process.argv.includes('--json');
  const capabilityArg = parseCapabilityArg();

  const results: EvaluationResult[] =
    capabilityArg === 'all' ? runAll() : [runCapability(capabilityArg)];

  if (jsonMode) {
    if (results.length === 1) {
      const r = results[0];
      const jsonFixtures = r.scores.map((s) => ({
        fixture: s.fixture,
        precision: s.precision,
        recall: s.recall,
        f1: s.f1,
        tp: s.truePositives,
        fp: s.falsePositives,
        fn: s.falseNegatives,
        matched: s.details.matched,
        missed: s.details.missed,
        extra: s.details.extra,
      }));
      console.log(JSON.stringify({
        capability: r.capability,
        fixtures: jsonFixtures,
        meanF1: r.aggregate,
      }));
    } else {
      const summary = results.map((r) => ({
        capability: r.capability,
        aggregate: r.aggregate,
        fixtureCount: r.scores.length,
        fixtures: r.scores.map((s) => ({
          fixture: s.fixture,
          f1: s.f1,
          tp: s.truePositives,
          fp: s.falsePositives,
          fn: s.falseNegatives,
        })),
      }));
      const overallMean =
        results.length > 0
          ? results.reduce((sum, r) => sum + r.aggregate, 0) / results.length
          : 0;
      console.log(JSON.stringify({ capabilities: summary, overallMean }));
    }
    return;
  }

  for (const r of results) {
    console.error(`\n=== ${r.capability.toUpperCase()} ===`);

    if (r.scores.length === 0) {
      console.error('  No fixtures found.');
      continue;
    }

    for (const score of r.scores) {
      console.error(`--- ${score.fixture} ---`);
      console.error(
        `  F1=${score.f1.toFixed(4)}  P=${score.precision.toFixed(4)}  R=${score.recall.toFixed(4)}  TP=${score.truePositives} FP=${score.falsePositives} FN=${score.falseNegatives}`
      );
      if (score.details.missed.length > 0) {
        console.error(`  missed: ${score.details.missed.join(', ')}`);
      }
      if (score.details.extra.length > 0) {
        console.error(`  extra:  ${score.details.extra.join(', ')}`);
      }
    }

    console.error(`  aggregate=${r.aggregate.toFixed(4)}  (${r.scores.length} fixtures)`);
  }

  if (results.length === 1) {
    console.log(results[0].aggregate.toFixed(6));
  } else {
    const overallMean =
      results.reduce((sum, r) => sum + r.aggregate, 0) / results.length;
    console.error(`\n=== OVERALL ===`);
    console.error(`mean=${overallMean.toFixed(4)}  (${results.length} capabilities)`);
    console.log(overallMean.toFixed(6));
  }
}

main();
