/**
 * Shared scoring primitives used by all capability evaluators.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { discoverAllFixtures, resolveFixturePath } from './fixture-resolver.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const AUTORESEARCH_DIR = path.join(__dirname, '..');
export const FIXTURES_DIR = path.join(AUTORESEARCH_DIR, 'fixtures');
export const EXPECTED_DIR = path.join(AUTORESEARCH_DIR, 'expected');

export interface FixtureScore {
  fixture: string;
  split?: string;
  tags?: string[];
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
  metadata?: Record<string, unknown>;
}

export interface EvaluationResult {
  capability: string;
  scores: FixtureScore[];
  aggregate: number;
  metadata?: Record<string, unknown>;
}

export interface CapabilityEvaluator {
  name: string;
  evaluate(): EvaluationResult | Promise<EvaluationResult>;
}

/**
 * Discover all available fixture names from both committed (synthetic)
 * and external (sibling-resolved or fetched) sources.
 */
export function discoverFixtures(): string[] {
  return discoverAllFixtures().map((f) => f.name);
}


/**
 * Resolve the absolute on-disk path for a fixture by name.
 * Checks in-tree fixtures/ first, then local sibling paths from the manifest.
 */
export function getFixturePath(name: string): string {
  const resolved = resolveFixturePath(name);
  if (!resolved) {
    throw new Error(
      `Fixture "${name}" not found. External fixtures must be materialized as local snapshots; ` +
      'run `npx tsx autoresearch/fetch-fixtures.ts` to prepare them.'
    );
  }
  return resolved;
}

export function computeF1FromSets(
  expectedSet: Set<string>,
  actualSet: Set<string>
): Pick<FixtureScore, 'precision' | 'recall' | 'f1' | 'truePositives' | 'falsePositives' | 'falseNegatives' | 'details'> {
  if (expectedSet.size === 0 && actualSet.size === 0) {
    return { precision: 1, recall: 1, f1: 1, truePositives: 0, falsePositives: 0, falseNegatives: 0, details: { matched: [], missed: [], extra: [] } };
  }

  const matched: string[] = [];
  const missed: string[] = [];
  const extra: string[] = [];

  for (const key of expectedSet) {
    if (actualSet.has(key)) matched.push(key);
    else missed.push(key);
  }

  for (const key of actualSet) {
    if (!expectedSet.has(key)) extra.push(key);
  }

  const tp = matched.length;
  const fp = extra.length;
  const fn = missed.length;

  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return { precision, recall, f1, truePositives: tp, falsePositives: fp, falseNegatives: fn, details: { matched, missed, extra } };
}

export function meanScore(scores: FixtureScore[]): number {
  if (scores.length === 0) return 0;
  return scores.reduce((sum, s) => sum + s.f1, 0) / scores.length;
}

export function checklistScore(checks: boolean[]): number {
  if (checks.length === 0) return 0;
  return checks.filter(Boolean).length / checks.length;
}

export function loadJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

export function hashFile(filePath: string): string {
  return crypto.createHash('sha1').update(fs.readFileSync(filePath)).digest('hex');
}

export function fixtureHasExpected(fixtureName: string, subdir?: string): boolean {
  const expectedPath = subdir
    ? path.join(EXPECTED_DIR, subdir, `${fixtureName}.json`)
    : path.join(EXPECTED_DIR, `${fixtureName}.json`);
  return fs.existsSync(expectedPath);
}

export function loadExpectedFile<T>(fixtureName: string, subdir?: string): T {
  const expectedPath = subdir
    ? path.join(EXPECTED_DIR, subdir, `${fixtureName}.json`)
    : path.join(EXPECTED_DIR, `${fixtureName}.json`);
  return loadJsonFile<T>(expectedPath);
}
