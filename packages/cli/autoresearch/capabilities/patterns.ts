/**
 * Capability 2: Pattern Scanning evaluator.
 *
 * Measures F1 on (pattern_name, relative_file_path) tuples — how accurately
 * does the scanner detect wallet/storage/OZ patterns per file?
 */

import { scanPatterns } from '../../src/analysis/pattern-scanner.js';
import { scanProjectFiles } from '../../src/analysis/scanner.js';

import {
  type CapabilityEvaluator,
  type EvaluationResult,
  type FixtureScore,
  computeF1FromSets,
  discoverFixtures,
  fixtureHasExpected,
  getFixturePath,
  loadExpectedFile,
  meanScore,
} from './shared.js';

interface ExpectedPattern {
  name: string;
  files: string[];
}

interface ExpectedPatterns {
  fixture: string;
  patterns: ExpectedPattern[];
}

function evaluateFixture(fixtureName: string): FixtureScore {
  const fixtureDir = getFixturePath(fixtureName);
  const expected = loadExpectedFile<ExpectedPatterns>(fixtureName, 'patterns');

  const files = scanProjectFiles(fixtureDir);
  const actual = scanPatterns(files);

  const expectedSet = new Set<string>();
  for (const p of expected.patterns) {
    for (const f of p.files) {
      expectedSet.add(`${p.name}::${f}`);
    }
  }

  const actualSet = new Set<string>();
  for (const p of actual) {
    for (const f of p.files) {
      actualSet.add(`${p.pattern}::${f}`);
    }
  }

  const result = computeF1FromSets(expectedSet, actualSet);
  return { fixture: fixtureName, ...result };
}

export const patternsEvaluator: CapabilityEvaluator = {
  name: 'patterns',

  evaluate(): EvaluationResult {
    const fixtures = discoverFixtures().filter((f) => fixtureHasExpected(f, 'patterns'));
    const scores = fixtures.map(evaluateFixture);

    return {
      capability: 'patterns',
      scores,
      aggregate: meanScore(scores),
    };
  },
};
