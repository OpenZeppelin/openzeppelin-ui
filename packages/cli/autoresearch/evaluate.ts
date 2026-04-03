/**
 * Autoresearch evaluation harness — analogous to Karpathy's prepare.py.
 *
 * Fixed infrastructure: the autoresearch agent MUST NOT edit this file.
 * It runs analyzeProject on every fixture, computes per-fixture F1
 * (precision/recall on ozTarget matches), then outputs a Karpathy-style
 * summary line suitable for appending to results.tsv.
 *
 * Usage:  npx tsx autoresearch/evaluate.ts
 * Output: single line  "mean_f1\t<score>" to stdout
 *         detailed per-fixture breakdown to stderr
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeProject } from '../src/analysis/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

interface FixtureScore {
  fixture: string;
  precision: number;
  recall: number;
  f1: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  details: {
    matched: string[];
    missed: string[];
    extra: string[];
  };
}

function discoverFixtures(): string[] {
  const fixturesDir = path.join(__dirname, 'fixtures');
  if (!fs.existsSync(fixturesDir)) return [];

  return fs
    .readdirSync(fixturesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function loadExpected(fixtureName: string): ExpectedResult {
  const expectedPath = path.join(__dirname, 'expected', `${fixtureName}.json`);
  return JSON.parse(fs.readFileSync(expectedPath, 'utf8')) as ExpectedResult;
}

function computeF1(fixtureName: string): FixtureScore {
  const fixtureDir = path.join(__dirname, 'fixtures', fixtureName);
  const expected = loadExpected(fixtureName);

  const report = analyzeProject(fixtureDir);

  const expectedSet = new Set(
    expected.components.map((c) => `${c.name}::${c.ozTarget}`)
  );

  const actualSet = new Set(
    report.components
      .filter((c) => c.ozTarget !== null)
      .map((c) => `${c.name}::${c.ozTarget}`)
  );

  const matched: string[] = [];
  const missed: string[] = [];
  const extra: string[] = [];

  for (const key of expectedSet) {
    if (actualSet.has(key)) {
      matched.push(key);
    } else {
      missed.push(key);
    }
  }

  for (const key of actualSet) {
    if (!expectedSet.has(key)) {
      extra.push(key);
    }
  }

  const tp = matched.length;
  const fp = extra.length;
  const fn = missed.length;

  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return {
    fixture: fixtureName,
    precision,
    recall,
    f1,
    truePositives: tp,
    falsePositives: fp,
    falseNegatives: fn,
    details: { matched, missed, extra },
  };
}

function runEvaluation(): { scores: FixtureScore[]; meanF1: number } {
  const fixtures = discoverFixtures();
  if (fixtures.length === 0) return { scores: [], meanF1: 0 };

  const scores: FixtureScore[] = [];

  for (const fixture of fixtures) {
    const expectedPath = path.join(__dirname, 'expected', `${fixture}.json`);
    if (!fs.existsSync(expectedPath)) continue;
    scores.push(computeF1(fixture));
  }

  const meanF1 = scores.length > 0 ? scores.reduce((sum, s) => sum + s.f1, 0) / scores.length : 0;
  return { scores, meanF1 };
}

function main(): void {
  const jsonMode = process.argv.includes('--json');
  const { scores, meanF1 } = runEvaluation();

  if (scores.length === 0) {
    if (jsonMode) {
      console.log(JSON.stringify({ fixtures: [], meanF1: 0 }));
    } else {
      console.error('No fixtures found in autoresearch/fixtures/');
    }
    process.exit(scores.length === 0 && !jsonMode ? 1 : 0);
  }

  if (jsonMode) {
    const jsonFixtures = scores.map((s) => ({
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
    console.log(JSON.stringify({ fixtures: jsonFixtures, meanF1 }));
    return;
  }

  for (const score of scores) {
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

  console.error(`\n=== AGGREGATE ===`);
  console.error(`mean_f1=${meanF1.toFixed(4)}  (${scores.length} fixtures)`);
  console.log(meanF1.toFixed(6));
}

main();
