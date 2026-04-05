/**
 * Capability 1: Component Detection evaluator.
 *
 * Measures F1 on (name, ozTarget) tuples — how accurately does the analyzer
 * identify UI components and map them to OZ equivalents?
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeProject } from '../../src/analysis/index.js';
import { loadCatalog, type ComponentEntry } from '../../src/catalog/index.js';

import { getExternalFixtureDefinition } from './fixture-resolver.js';
import {
  type CapabilityEvaluator,
  type EvaluationResult,
  type FixtureScore,
  computeF1FromSets,
  discoverFixtures,
  fixtureHasExpected,
  getFixturePath,
  loadJsonFile,
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

type DetectionFixtureSplit = 'train' | 'validation' | 'holdout' | 'adversarial';

interface DetectionFixtureMetadata {
  name: string;
  split: DetectionFixtureSplit;
  tags: string[];
}

interface DetectionFixtureMetadataFile {
  version: string;
  defaultSplit: DetectionFixtureSplit;
  fixtures: DetectionFixtureMetadata[];
}

interface LoadedDetectionFixtureMetadata {
  defaultSplit: DetectionFixtureSplit;
  fixtures: Map<string, DetectionFixtureMetadata>;
}

interface DetectionMetricSummary {
  name: string;
  precision: number;
  recall: number;
  f1: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
}

interface FixtureEvaluationData {
  score: FixtureScore;
  expectedSet: Set<string>;
  actualSet: Set<string>;
  expectedComponents: ExpectedComponent[];
  actualComponents: Array<{
    name: string;
    ozTarget: string;
    sourceLibrary: string | null;
    category: string;
    detectorKinds: string[];
  }>;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const detectionFixtureConfigPath = path.join(
  __dirname,
  '..',
  'config',
  'detection-fixtures.json'
);

function loadDetectionFixtureMetadata(): LoadedDetectionFixtureMetadata {
  const config = loadJsonFile<DetectionFixtureMetadataFile>(detectionFixtureConfigPath);
  const fixtures = new Map<string, DetectionFixtureMetadata>();

  for (const fixture of config.fixtures) {
    fixtures.set(fixture.name, fixture);
  }

  return {
    defaultSplit: config.defaultSplit,
    fixtures,
  };
}

function summarizeMetric(
  name: string,
  expectedSet: Set<string>,
  actualSet: Set<string>
): DetectionMetricSummary {
  const summary = computeF1FromSets(expectedSet, actualSet);

  return {
    name,
    precision: summary.precision,
    recall: summary.recall,
    f1: summary.f1,
    truePositives: summary.truePositives,
    falsePositives: summary.falsePositives,
    falseNegatives: summary.falseNegatives,
  };
}

function resolveExpectedCategory(
  ozTarget: string,
  componentCatalog: Record<string, ComponentEntry>
): string {
  return componentCatalog[ozTarget]?.category ?? 'unknown';
}

function evaluateFixture(
  fixtureName: string,
  fixtureMetadata: LoadedDetectionFixtureMetadata,
  componentCatalog: Record<string, ComponentEntry>
): FixtureEvaluationData {
  const fixtureDir = getFixturePath(fixtureName);
  const expected = loadExpectedFile<ExpectedResult>(fixtureName);
  const ext = getExternalFixtureDefinition(fixtureName);
  const metadata = fixtureMetadata.fixtures.get(fixtureName);

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
  return {
    score: {
      fixture: fixtureName,
      split: metadata?.split ?? fixtureMetadata.defaultSplit,
      tags: metadata?.tags,
      ...result,
      metadata: {
        expectedTupleCount: expectedSet.size,
        actualTupleCount: actualSet.size,
      },
    },
    expectedSet,
    actualSet,
    expectedComponents: expected.components,
    actualComponents: report.components
      .filter((component) => component.ozTarget !== null)
      .map((component) => ({
        name: component.name,
        ozTarget: component.ozTarget!,
        sourceLibrary: component.sourceLibrary,
        category: resolveExpectedCategory(component.ozTarget!, componentCatalog),
        detectorKinds: component.detectorKinds,
      })),
  };
}

export const detectionEvaluator: CapabilityEvaluator = {
  name: 'detection',

  evaluate(): EvaluationResult {
    const fixtureMetadata = loadDetectionFixtureMetadata();
    const catalog = loadCatalog().components;
    const fixtures = discoverFixtures().filter((f) => fixtureHasExpected(f));
    const fixtureResults = fixtures.map((fixture) =>
      evaluateFixture(fixture, fixtureMetadata, catalog)
    );
    const scores = fixtureResults.map((result) => result.score);

    // Primary aggregate excludes adversarial-split fixtures — those are
    // tracked separately as a generalization metric.
    const primaryScores = scores.filter((s) => s.split !== 'adversarial');
    const adversarialScores = scores.filter((s) => s.split === 'adversarial');

    const splitScores = new Map<DetectionFixtureSplit, FixtureScore[]>();
    const perSourceLibraryExpected = new Map<string, Set<string>>();
    const perSourceLibraryActual = new Map<string, Set<string>>();
    const perTargetExpected = new Map<string, Set<string>>();
    const perTargetActual = new Map<string, Set<string>>();
    const perCategoryExpected = new Map<string, Set<string>>();
    const perCategoryActual = new Map<string, Set<string>>();
    const detectorKindCounts = new Map<string, number>();

    for (const result of fixtureResults) {
      const split = result.score.split ?? fixtureMetadata.defaultSplit;
      const scoresForSplit = splitScores.get(split) ?? [];
      scoresForSplit.push(result.score);
      splitScores.set(split, scoresForSplit);

      for (const component of result.expectedComponents) {
        const key = `${result.score.fixture}::${component.name}::${component.ozTarget}`;
        const expectedSourceLibrarySet =
          perSourceLibraryExpected.get(component.sourceLibrary) ?? new Set<string>();
        expectedSourceLibrarySet.add(key);
        perSourceLibraryExpected.set(component.sourceLibrary, expectedSourceLibrarySet);

        const expectedTargetSet =
          perTargetExpected.get(component.ozTarget) ?? new Set<string>();
        expectedTargetSet.add(key);
        perTargetExpected.set(component.ozTarget, expectedTargetSet);

        const category = resolveExpectedCategory(component.ozTarget, catalog);
        const expectedCategorySet =
          perCategoryExpected.get(category) ?? new Set<string>();
        expectedCategorySet.add(key);
        perCategoryExpected.set(category, expectedCategorySet);
      }

      for (const component of result.actualComponents) {
        const key = `${result.score.fixture}::${component.name}::${component.ozTarget}`;
        const sourceLibrary = component.sourceLibrary ?? 'unknown';

        const actualSourceLibrarySet =
          perSourceLibraryActual.get(sourceLibrary) ?? new Set<string>();
        actualSourceLibrarySet.add(key);
        perSourceLibraryActual.set(sourceLibrary, actualSourceLibrarySet);

        const actualTargetSet =
          perTargetActual.get(component.ozTarget) ?? new Set<string>();
        actualTargetSet.add(key);
        perTargetActual.set(component.ozTarget, actualTargetSet);

        const actualCategorySet =
          perCategoryActual.get(component.category) ?? new Set<string>();
        actualCategorySet.add(key);
        perCategoryActual.set(component.category, actualCategorySet);

        for (const detectorKind of component.detectorKinds) {
          detectorKindCounts.set(
            detectorKind,
            (detectorKindCounts.get(detectorKind) ?? 0) + 1
          );
        }
      }
    }

    const splitAggregate = Object.fromEntries(
      [...splitScores.entries()].map(([split, splitFixtureScores]) => [
        split,
        meanScore(splitFixtureScores),
      ])
    );

    const perSourceLibrary = [
      ...new Set([
        ...perSourceLibraryExpected.keys(),
        ...perSourceLibraryActual.keys(),
      ]),
    ]
      .sort((a, b) => a.localeCompare(b))
      .map((sourceLibrary) =>
        summarizeMetric(
          sourceLibrary,
          perSourceLibraryExpected.get(sourceLibrary) ?? new Set<string>(),
          perSourceLibraryActual.get(sourceLibrary) ?? new Set<string>()
        )
      );

    const perTarget = [...new Set([...perTargetExpected.keys(), ...perTargetActual.keys()])]
      .sort((a, b) => a.localeCompare(b))
      .map((target) =>
        summarizeMetric(
          target,
          perTargetExpected.get(target) ?? new Set<string>(),
          perTargetActual.get(target) ?? new Set<string>()
        )
      );

    const perCategory = [
      ...new Set([...perCategoryExpected.keys(), ...perCategoryActual.keys()]),
    ]
      .sort((a, b) => a.localeCompare(b))
      .map((category) =>
        summarizeMetric(
          category,
          perCategoryExpected.get(category) ?? new Set<string>(),
          perCategoryActual.get(category) ?? new Set<string>()
        )
      );

    return {
      capability: 'detection',
      scores,
      aggregate: meanScore(primaryScores),
      metadata: {
        adversarialF1: adversarialScores.length > 0 ? meanScore(adversarialScores) : null,
        fixtureSplits: splitAggregate,
        perSourceLibrary,
        perTarget,
        perCategory,
        detectorKindCounts: Object.fromEntries(
          [...detectorKindCounts.entries()].sort(([a], [b]) => a.localeCompare(b))
        ),
      },
    };
  },
};
