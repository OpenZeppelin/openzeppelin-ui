/**
 * Capability 1: Component Detection evaluator.
 *
 * Measures F1 on (name, ozTarget) tuples — how accurately does the analyzer
 * identify UI components and map them to OZ equivalents?
 */

import { analyzeProject } from '../../src/analysis/index.js';

import { getExternalFixtureDefinition } from './fixture-resolver.js';
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

interface ExpectedComponent {
  name: string;
  ozTarget: string;
  sourceLibrary: string;
}

interface ExpectedResult {
  fixture: string;
  description?: string;
  components: ExpectedComponent[];
}

function evaluateFixture(fixtureName: string): FixtureScore {
  const fixtureDir = getFixturePath(fixtureName);
  const expected = loadExpectedFile<ExpectedResult>(fixtureName);
  const ext = getExternalFixtureDefinition(fixtureName);

  const report = analyzeProject(fixtureDir, undefined, ext?.tailwindCssPath);

  const expectedSet = new Set(
    expected.components.map((c) => `${c.name}::${c.ozTarget}`)
  );

  const actualSet = new Set(
    report.components
      .filter((c) => c.ozTarget !== null)
      .map((c) => `${c.name}::${c.ozTarget}`)
  );

  const result = computeF1FromSets(expectedSet, actualSet);
  return { fixture: fixtureName, ...result };
}

export const detectionEvaluator: CapabilityEvaluator = {
  name: 'detection',

  evaluate(): EvaluationResult {
    const fixtures = discoverFixtures().filter((f) => fixtureHasExpected(f));
    const scores = fixtures.map(evaluateFixture);

    return {
      capability: 'detection',
      scores,
      aggregate: meanScore(scores),
    };
  },
};
