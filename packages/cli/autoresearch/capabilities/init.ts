/**
 * Capability 4: Init / Setup evaluator.
 *
 * Copies a fixture to a temp directory, runs init --skip-install, then checks
 * whether the expected files were created with the correct content patterns.
 * Metric: weighted checklist score.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runSetup } from '../../src/init/setup.js';

import {
  type CapabilityEvaluator,
  type EvaluationResult,
  type FixtureScore,
  EXPECTED_DIR,
  checklistScore,
  loadJsonFile,
} from './shared.js';

interface ExpectedFile {
  path: string;
  contentPatterns: string[];
}

interface ExpectedInit {
  fixture: string;
  expectedFiles: ExpectedFile[];
}

function copyDirSync(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

interface InitFixtureEntry {
  fixture: string;
  projectDir: string;
  expectedFiles: ExpectedFile[];
}

function discoverInitFixtures(): InitFixtureEntry[] {
  const initDir = path.join(EXPECTED_DIR, 'init');
  if (!fs.existsSync(initDir)) return [];

  const entries: InitFixtureEntry[] = [];
  for (const file of fs.readdirSync(initDir)) {
    if (!file.endsWith('.json')) continue;
    const data = loadJsonFile<ExpectedInit & { projectDir?: string }>(path.join(initDir, file));
    entries.push({
      fixture: data.fixture,
      projectDir: data.projectDir
        ? path.resolve(initDir, data.projectDir)
        : path.join(initDir, data.fixture, 'project'),
      expectedFiles: data.expectedFiles,
    });
  }
  return entries;
}

function evaluateFixture(entry: InitFixtureEntry): FixtureScore {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `autoresearch-init-${entry.fixture}-`));

  try {
    copyDirSync(entry.projectDir, tmpDir);

    try {
      runSetup({ projectRoot: tmpDir, skipInstall: true });
    } catch {
      // init may fail partially — we still check what was created
    }

    const checks: boolean[] = [];
    const matched: string[] = [];
    const missed: string[] = [];

    for (const ef of entry.expectedFiles) {
      const filePath = path.join(tmpDir, ef.path);
      const exists = fs.existsSync(filePath);

      if (!exists) {
        checks.push(false);
        missed.push(`missing:${ef.path}`);
        continue;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      let allPatternsMatch = true;

      for (const pattern of ef.contentPatterns) {
        if (!content.includes(pattern)) {
          allPatternsMatch = false;
          missed.push(`pattern:${ef.path}:${pattern}`);
        }
      }

      checks.push(allPatternsMatch);
      if (allPatternsMatch) matched.push(ef.path);
    }

    const score = checklistScore(checks);

    return {
      fixture: entry.fixture,
      precision: score,
      recall: score,
      f1: score,
      truePositives: matched.length,
      falsePositives: 0,
      falseNegatives: missed.length,
      details: { matched, missed, extra: [] },
    };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

export const initEvaluator: CapabilityEvaluator = {
  name: 'init',

  evaluate(): EvaluationResult {
    const fixtures = discoverInitFixtures();
    const scores = fixtures.map(evaluateFixture);

    const aggregate =
      scores.length > 0 ? scores.reduce((sum, s) => sum + s.f1, 0) / scores.length : 0;

    return {
      capability: 'init',
      scores,
      aggregate,
    };
  },
};
