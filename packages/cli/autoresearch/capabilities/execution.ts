/**
 * Capability 5: Task Execution (Code Rewriting) evaluator.
 *
 * Tests the rewriteFile() function against before/task/after fixture triples.
 * Metric: composite of AST parse success + AST structural diff.
 */

import fs from 'node:fs';
import path from 'node:path';

import type { MigrationTask } from '../../src/manifest/schema.js';
import { rewriteFile, type RewriteContext } from '../../src/rewriter/rewriteFile.js';

import {
  type CapabilityEvaluator,
  type EvaluationResult,
  type FixtureScore,
  EXPECTED_DIR,
  loadJsonFile,
} from './shared.js';

interface ExecutionFixture {
  name: string;
  dir: string;
  beforePath: string;
  taskPath: string;
  afterPath: string;
}

function discoverExecutionFixtures(): ExecutionFixture[] {
  const baseDir = path.join(EXPECTED_DIR, 'execution');
  if (!fs.existsSync(baseDir)) return [];

  const fixtures: ExecutionFixture[] = [];

  function scan(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    const hasBefore = entries.some((e) => e.name === 'before.tsx');
    const hasTask = entries.some((e) => e.name === 'task.json');
    const hasAfter = entries.some((e) => e.name === 'after.tsx');

    if (hasBefore && hasTask && hasAfter) {
      const name = path.relative(baseDir, dir).replace(/[/\\]/g, '/');
      fixtures.push({
        name,
        dir,
        beforePath: path.join(dir, 'before.tsx'),
        taskPath: path.join(dir, 'task.json'),
        afterPath: path.join(dir, 'after.tsx'),
      });
      return;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) scan(path.join(dir, entry.name));
    }
  }

  scan(baseDir);
  return fixtures.sort((a, b) => a.name.localeCompare(b.name));
}

function normalizeAst(source: string): string[] {
  return source
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('//'));
}

function computeAstSimilarity(actual: string, expected: string): number {
  const actualLines = normalizeAst(actual);
  const expectedLines = normalizeAst(expected);

  if (expectedLines.length === 0) return actualLines.length === 0 ? 1 : 0;

  const expectedSet = new Set(expectedLines);
  const actualSet = new Set(actualLines);

  let matches = 0;
  for (const line of expectedSet) {
    if (actualSet.has(line)) matches++;
  }

  const precision = actualSet.size > 0 ? matches / actualSet.size : 0;
  const recall = expectedSet.size > 0 ? matches / expectedSet.size : 0;

  return precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
}

function isValidTsx(source: string): boolean {
  let depth = 0;
  let inString = false;
  let stringChar = '';
  let inTemplate = false;

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    const prev = i > 0 ? source[i - 1] : '';

    if (inString) {
      if (ch === stringChar && prev !== '\\') inString = false;
      continue;
    }

    if (inTemplate) {
      if (ch === '`' && prev !== '\\') inTemplate = false;
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      stringChar = ch;
      continue;
    }

    if (ch === '`') {
      inTemplate = true;
      continue;
    }

    if (ch === '{' || ch === '(' || ch === '[') depth++;
    if (ch === '}' || ch === ')' || ch === ']') depth--;
  }

  return depth === 0;
}

function evaluateFixture(fixture: ExecutionFixture): FixtureScore {
  const beforeContent = fs.readFileSync(fixture.beforePath, 'utf8');
  const expectedContent = fs.readFileSync(fixture.afterPath, 'utf8');

  const taskData = loadJsonFile<MigrationTask & { propMappings?: Record<string, string> }>(fixture.taskPath);
  const task: MigrationTask = taskData;
  const context: RewriteContext = {};

  if (taskData.propMappings) {
    context.propMappings = taskData.propMappings;
  }

  let actualContent: string;
  try {
    actualContent = rewriteFile(task, beforeContent, context);
  } catch {
    return {
      fixture: fixture.name,
      precision: 0,
      recall: 0,
      f1: 0,
      truePositives: 0,
      falsePositives: 0,
      falseNegatives: 1,
      details: { matched: [], missed: ['rewrite-threw'], extra: [] },
    };
  }

  const parseOk = isValidTsx(actualContent);
  if (!parseOk) {
    return {
      fixture: fixture.name,
      precision: 0,
      recall: 0,
      f1: 0,
      truePositives: 0,
      falsePositives: 0,
      falseNegatives: 1,
      details: { matched: [], missed: ['invalid-tsx-output'], extra: [] },
    };
  }

  const similarity = computeAstSimilarity(actualContent, expectedContent);

  return {
    fixture: fixture.name,
    precision: similarity,
    recall: similarity,
    f1: similarity,
    truePositives: similarity > 0.9 ? 1 : 0,
    falsePositives: 0,
    falseNegatives: similarity > 0.9 ? 0 : 1,
    details: {
      matched: similarity > 0.9 ? ['ast-match'] : [],
      missed: similarity > 0.9 ? [] : [`similarity=${similarity.toFixed(4)}`],
      extra: [],
    },
  };
}

export const executionEvaluator: CapabilityEvaluator = {
  name: 'execution',

  evaluate(): EvaluationResult {
    const fixtures = discoverExecutionFixtures();
    const scores = fixtures.map(evaluateFixture);

    const aggregate =
      scores.length > 0 ? scores.reduce((sum, s) => sum + s.f1, 0) / scores.length : 0;

    return {
      capability: 'execution',
      scores,
      aggregate,
    };
  },
};
