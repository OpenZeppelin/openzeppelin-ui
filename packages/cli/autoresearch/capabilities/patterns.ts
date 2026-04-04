/**
 * Capability 2: Pattern Scanning evaluator.
 *
 * Measures F1 on (pattern_name, relative_file_path) tuples — how accurately
 * does the scanner detect wallet/storage/OZ patterns per file?
 */

import { scanPatterns } from '../../src/analysis/pattern-scanner.js';
import { loadPatternCatalog, type PatternCategory } from '../../src/catalog/index.js';
import { scanProjectFiles } from '../../src/analysis/scanner.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

interface ExpectedPattern {
  name: string;
  files: string[];
}

interface ExpectedPatterns {
  fixture: string;
  patterns: ExpectedPattern[];
}

type PatternFixtureSplit = 'train' | 'validation' | 'holdout';

interface PatternFixtureMetadata {
  name: string;
  split: PatternFixtureSplit;
  tags: string[];
}

interface PatternFixtureMetadataFile {
  version: string;
  defaultSplit: PatternFixtureSplit;
  fixtures: PatternFixtureMetadata[];
}

interface PatternMetricSummary {
  name: string;
  category: PatternCategory | 'unknown';
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
}

interface LoadedPatternFixtureMetadata {
  defaultSplit: PatternFixtureSplit;
  fixtures: Map<string, PatternFixtureMetadata>;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const patternFixtureConfigPath = path.join(__dirname, '..', 'config', 'pattern-fixtures.json');

function loadPatternFixtureMetadata(): LoadedPatternFixtureMetadata {
  const config = loadJsonFile<PatternFixtureMetadataFile>(patternFixtureConfigPath);
  const metadata = new Map<string, PatternFixtureMetadata>();

  for (const fixture of config.fixtures) {
    metadata.set(fixture.name, fixture);
  }

  return {
    defaultSplit: config.defaultSplit,
    fixtures: metadata,
  };
}

function buildPatternCategoryLookup(): Map<string, PatternCategory> {
  const lookup = new Map<string, PatternCategory>();

  for (const rule of loadPatternCatalog().rules) {
    lookup.set(rule.displayName, rule.category);
    lookup.set(rule.canonicalPattern, rule.category);
  }

  return lookup;
}

function summarizeMetric(
  name: string,
  expectedSet: Set<string>,
  actualSet: Set<string>,
  category: PatternCategory | 'unknown'
): PatternMetricSummary {
  const summary = computeF1FromSets(expectedSet, actualSet);

  return {
    name,
    category,
    precision: summary.precision,
    recall: summary.recall,
    f1: summary.f1,
    truePositives: summary.truePositives,
    falsePositives: summary.falsePositives,
    falseNegatives: summary.falseNegatives,
  };
}

function evaluateFixture(
  fixtureName: string,
  fixtureMetadata: LoadedPatternFixtureMetadata
): FixtureEvaluationData {
  const fixtureDir = getFixturePath(fixtureName);
  const expected = loadExpectedFile<ExpectedPatterns>(fixtureName, 'patterns');
  const metadata = fixtureMetadata.fixtures.get(fixtureName);

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
  };
}

export const patternsEvaluator: CapabilityEvaluator = {
  name: 'patterns',

  evaluate(): EvaluationResult {
    const fixtureMetadata = loadPatternFixtureMetadata();
    const categoryLookup = buildPatternCategoryLookup();
    const fixtures = discoverFixtures().filter((f) => fixtureHasExpected(f, 'patterns'));
    const fixtureResults = fixtures.map((fixture) => evaluateFixture(fixture, fixtureMetadata));
    const scores = fixtureResults.map((result) => result.score);

    const splitScores = new Map<PatternFixtureSplit, FixtureScore[]>();
    const perPatternExpected = new Map<string, Set<string>>();
    const perPatternActual = new Map<string, Set<string>>();
    const perCategoryExpected = new Map<string, Set<string>>();
    const perCategoryActual = new Map<string, Set<string>>();

    for (const result of fixtureResults) {
      const split = result.score.split ?? fixtureMetadata.defaultSplit;
      const scoresForSplit = splitScores.get(split) ?? [];
      scoresForSplit.push(result.score);
      splitScores.set(split, scoresForSplit);

      for (const key of result.expectedSet) {
        const [pattern] = key.split('::');
        const category = categoryLookup.get(pattern) ?? 'unknown';
        const expectedPatternSet = perPatternExpected.get(pattern) ?? new Set<string>();
        expectedPatternSet.add(`${result.score.fixture}::${key}`);
        perPatternExpected.set(pattern, expectedPatternSet);

        const expectedCategorySet = perCategoryExpected.get(category) ?? new Set<string>();
        expectedCategorySet.add(`${result.score.fixture}::${key}`);
        perCategoryExpected.set(category, expectedCategorySet);
      }

      for (const key of result.actualSet) {
        const [pattern] = key.split('::');
        const category = categoryLookup.get(pattern) ?? 'unknown';
        const actualPatternSet = perPatternActual.get(pattern) ?? new Set<string>();
        actualPatternSet.add(`${result.score.fixture}::${key}`);
        perPatternActual.set(pattern, actualPatternSet);

        const actualCategorySet = perCategoryActual.get(category) ?? new Set<string>();
        actualCategorySet.add(`${result.score.fixture}::${key}`);
        perCategoryActual.set(category, actualCategorySet);
      }
    }

    const splitAggregate = Object.fromEntries(
      [...splitScores.entries()].map(([split, splitFixtureScores]) => [
        split,
        meanScore(splitFixtureScores),
      ])
    );

    const perPattern = [...new Set([...perPatternExpected.keys(), ...perPatternActual.keys()])]
      .sort((a, b) => a.localeCompare(b))
      .map((pattern) =>
        summarizeMetric(
          pattern,
          perPatternExpected.get(pattern) ?? new Set<string>(),
          perPatternActual.get(pattern) ?? new Set<string>(),
          categoryLookup.get(pattern) ?? 'unknown'
        )
      );

    const perCategory = [...new Set([...perCategoryExpected.keys(), ...perCategoryActual.keys()])]
      .sort((a, b) => a.localeCompare(b))
      .map((category) =>
        summarizeMetric(
          category,
          perCategoryExpected.get(category) ?? new Set<string>(),
          perCategoryActual.get(category) ?? new Set<string>(),
          category as PatternCategory | 'unknown'
        )
      );

    return {
      capability: 'patterns',
      scores,
      aggregate: meanScore(scores),
      metadata: {
        fixtureSplits: splitAggregate,
        perPattern,
        perCategory,
      },
    };
  },
};
