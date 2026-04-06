/**
 * Capability 2: Pattern Scanning evaluator.
 *
 * Measures F1 on (pattern_name, relative_file_path) tuples — how accurately
 * does the scanner detect wallet/storage/OZ patterns per file?
 */

import { scanPatterns } from '../../src/analysis/pattern-scanner.js';
import { loadPatternCatalog, type PatternCategory } from '../../src/catalog/index.js';
import { scanProjectFiles, type ScannedFile } from '../../src/analysis/scanner.js';
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
  hashFile,
  loadJsonFile,
  loadExpectedFile,
  meanScore,
} from './shared.js';
import { resolveFixture } from './fixture-resolver.js';

interface ExpectedPattern {
  name: string;
  files: string[];
}

interface ExpectedPatterns {
  fixture: string;
  benchmark?: {
    fixtureSource: 'synthetic' | 'external-snapshot';
    fixtureCommit?: string;
    scannerPolicyHash: string;
  };
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
const scannerPolicyPath = path.join(__dirname, '..', '..', 'src', 'analysis', 'scanner.ts');
const scannerPolicyHash = hashFile(scannerPolicyPath);

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

function assertExpectedBenchmarkMetadata(
  fixtureName: string,
  expected: ExpectedPatterns
): void {
  if (!expected.benchmark) {
    throw new Error(
      `Expected patterns for "${fixtureName}" are missing benchmark metadata. ` +
      'Add benchmark.fixtureSource and benchmark.scannerPolicyHash.'
    );
  }

  if (expected.benchmark.scannerPolicyHash !== scannerPolicyHash) {
    throw new Error(
      `Expected patterns for "${fixtureName}" were generated against scanner policy ` +
      `${expected.benchmark.scannerPolicyHash}, but current policy is ${scannerPolicyHash}. ` +
      'Refresh the expected file so it matches scanProjectFiles().'
    );
  }
}

function assertExpectedFilesAreScannable(
  fixtureName: string,
  files: ScannedFile[],
  expected: ExpectedPatterns
): void {
  const visibleFiles = new Set(files.map((file) => file.relativePath));
  const invisibleExpectedFiles = new Set<string>();

  for (const pattern of expected.patterns) {
    for (const file of pattern.files) {
      if (!visibleFiles.has(file)) {
        invisibleExpectedFiles.add(file);
      }
    }
  }

  if (invisibleExpectedFiles.size === 0) return;

  const examples = [...invisibleExpectedFiles].sort().slice(0, 5).join(', ');
  throw new Error(
    `Expected patterns for "${fixtureName}" reference ${invisibleExpectedFiles.size} ` +
    `file(s) that scanProjectFiles() does not include. Examples: ${examples}. ` +
    'Refresh the expected file using the scanner-visible file set.'
  );
}

function assertFixtureSnapshotConsistency(
  fixtureName: string,
  expected: ExpectedPatterns
): void {
  const resolvedFixture = resolveFixture(fixtureName);
  if (!resolvedFixture || resolvedFixture.source === 'synthetic') return;

  if (resolvedFixture.source !== 'external-snapshot' || !resolvedFixture.lockfile) {
    throw new Error(
      `Fixture "${fixtureName}" is not using a materialized snapshot. ` +
      'Run `npx tsx autoresearch/fetch-fixtures.ts` before evaluating.'
    );
  }

  if (expected.benchmark?.fixtureSource !== 'external-snapshot') {
    throw new Error(
      `Expected patterns for "${fixtureName}" must declare benchmark.fixtureSource="external-snapshot".`
    );
  }

  if (!expected.benchmark.fixtureCommit) {
    throw new Error(
      `Expected patterns for "${fixtureName}" are missing benchmark.fixtureCommit.`
    );
  }

  if (expected.benchmark.fixtureCommit !== resolvedFixture.lockfile.commit) {
    throw new Error(
      `Fixture "${fixtureName}" snapshot commit ${resolvedFixture.lockfile.commit} does not match ` +
      `expected commit ${expected.benchmark.fixtureCommit}. Refresh fixtures or expected data.`
    );
  }
}

function evaluateFixture(
  fixtureName: string,
  fixtureMetadata: LoadedPatternFixtureMetadata
): FixtureEvaluationData {
  const fixtureDir = getFixturePath(fixtureName);
  const expected = loadExpectedFile<ExpectedPatterns>(fixtureName, 'patterns');
  const metadata = fixtureMetadata.fixtures.get(fixtureName);

  const files = scanProjectFiles(fixtureDir);
  assertExpectedBenchmarkMetadata(fixtureName, expected);
  assertFixtureSnapshotConsistency(fixtureName, expected);
  assertExpectedFilesAreScannable(fixtureName, files, expected);
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
        scannerPolicyHash,
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
