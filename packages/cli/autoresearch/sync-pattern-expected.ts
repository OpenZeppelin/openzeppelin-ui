#!/usr/bin/env npx tsx
/**
 * Normalizes pattern expected files so they stay aligned with the benchmark
 * contract enforced by `scanProjectFiles()` and pinned fixture snapshots.
 *
 * For each `expected/patterns/*.json` file this script:
 *   1. Resolves the fixture using the same resolver as evaluation
 *   2. Filters expected file paths to the scanner-visible file set
 *   3. Writes benchmark metadata (fixture source, pinned commit, scanner hash)
 *
 * This is intentionally conservative: it does not invent new tuples or rewrite
 * pattern names. It only removes impossible-to-score tuples and stamps the
 * metadata needed for deterministic evaluation.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { scanProjectFiles } from '../src/analysis/scanner.ts';
import {
  hashFile,
  loadJsonFile,
} from './capabilities/shared.ts';
import {
  discoverAllFixtures,
  resolveFixture,
} from './capabilities/fixture-resolver.ts';

interface ExpectedPattern {
  name: string;
  files: string[];
}

interface ExpectedPatternsFile {
  fixture: string;
  benchmark?: {
    fixtureSource: 'synthetic' | 'external-snapshot';
    fixtureCommit?: string;
    scannerPolicyHash: string;
  };
  patterns: ExpectedPattern[];
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const expectedPatternsDir = path.join(__dirname, 'expected', 'patterns');
const scannerPolicyPath = path.join(__dirname, '..', 'src', 'analysis', 'scanner.ts');
const scannerPolicyHash = hashFile(scannerPolicyPath);

function syncExpectedFile(expectedFilePath: string): void {
  const expected = loadJsonFile<ExpectedPatternsFile>(expectedFilePath);
  const fixture = resolveFixture(expected.fixture);
  if (!fixture) {
    throw new Error(
      `Fixture "${expected.fixture}" is not available. Run \`npx tsx autoresearch/fetch-fixtures.ts\` first.`
    );
  }

  const visibleFiles = new Set(scanProjectFiles(fixture.path).map((file) => file.relativePath));
  const filteredPatterns = expected.patterns
    .map((pattern) => ({
      ...pattern,
      files: pattern.files.filter((file) => visibleFiles.has(file)),
    }))
    .filter((pattern) => pattern.files.length > 0);

  const next: ExpectedPatternsFile = {
    fixture: expected.fixture,
    benchmark: {
      fixtureSource: fixture.source === 'synthetic' ? 'synthetic' : 'external-snapshot',
      fixtureCommit: fixture.lockfile?.commit,
      scannerPolicyHash,
    },
    patterns: filteredPatterns,
  };

  fs.writeFileSync(expectedFilePath, JSON.stringify(next, null, 2) + '\n');
  const removedTupleCount =
    expected.patterns.reduce((sum, pattern) => sum + pattern.files.length, 0) -
    filteredPatterns.reduce((sum, pattern) => sum + pattern.files.length, 0);
  console.log(
    `${path.basename(expectedFilePath)}: synced metadata, removed ${removedTupleCount} invisible tuple(s)`
  );
}

function main(): void {
  const availableFixtures = new Set(discoverAllFixtures().map((fixture) => fixture.name));
  for (const entry of fs.readdirSync(expectedPatternsDir)) {
    if (!entry.endsWith('.json')) continue;

    const expectedPath = path.join(expectedPatternsDir, entry);
    const expected = loadJsonFile<ExpectedPatternsFile>(expectedPath);
    if (!availableFixtures.has(expected.fixture)) {
      throw new Error(
        `Expected file ${entry} points at unavailable fixture "${expected.fixture}".`
      );
    }

    syncExpectedFile(expectedPath);
  }
}

main();
