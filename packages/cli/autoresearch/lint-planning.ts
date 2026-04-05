/**
 * Structural lint gate for the planning autoresearch loop.
 *
 * Ensures generate.ts and exclusions.json do not contain fixture-specific
 * identifiers, and that exclusion rules are not fixture-shaped workarounds.
 *
 * Exit code:
 *   0 — all checks pass
 *   1 — one or more violations detected
 *
 * Usage:
 *   npx tsx autoresearch/lint-planning.ts
 */

import fs from 'node:fs';
import path from 'node:path';

import {
  type Violation,
  CLI_ROOT,
  extractFixtureIdentifiers,
  ALLOWLIST,
  GENERIC_PATTERNS,
  runLintChecks,
} from './lint-shared.js';

// -----------------------------------------------------------------------
// Planning-specific checks
// -----------------------------------------------------------------------

/**
 * Checks exclusions.json for fixture-specific component names.
 * Exclusion entries should reference generic library/ecosystem identifiers,
 * not components unique to a benchmark fixture.
 */
function checkExclusionsJson(
  _filePath: string,
  _content: string,
  fixtureIds: Set<string>
): Violation[] {
  const violations: Violation[] = [];

  const exclusionsPath = path.join(CLI_ROOT, 'src/catalog/exclusions.json');
  if (!fs.existsSync(exclusionsPath)) return violations;

  let exclusions: { excludedLibraries?: string[]; excludedComponents?: string[] };
  try {
    exclusions = JSON.parse(fs.readFileSync(exclusionsPath, 'utf8'));
  } catch {
    return violations;
  }

  const allExcluded = [
    ...(exclusions.excludedLibraries ?? []),
    ...(exclusions.excludedComponents ?? []),
  ];

  for (const entry of allExcluded) {
    if (ALLOWLIST.has(entry)) continue;
    if (GENERIC_PATTERNS.some((p) => p.test(entry))) continue;

    if (fixtureIds.has(entry)) {
      violations.push({
        file: 'src/catalog/exclusions.json',
        line: 0,
        rule: 'no-fixture-exclusions',
        detail: `Exclusion entry "${entry}" matches a fixture-specific identifier. ` +
          `Exclusion rules must reflect product invariants, not benchmark workarounds.`,
      });
    }
  }

  return violations;
}

/**
 * Detects fixture-shaped conditionals — source/component equality checks
 * that reference fixture-specific identifiers.
 */
function checkNoFixtureConditionals(
  filePath: string,
  content: string,
  fixtureIds: Set<string>
): Violation[] {
  const violations: Violation[] = [];
  const lines = content.split('\n');

  const conditionalPattern = /(?:===|!==|==|!=)\s*['"`]/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) continue;
    if (!conditionalPattern.test(line)) continue;

    for (const id of fixtureIds) {
      if (ALLOWLIST.has(id)) continue;
      if (GENERIC_PATTERNS.some((p) => p.test(id))) continue;
      if (id.length < 4) continue;

      if (line.includes(id)) {
        violations.push({
          file: filePath,
          line: i + 1,
          rule: 'no-fixture-conditionals',
          detail: `Conditional references fixture-specific identifier "${id}". ` +
            `Planning logic must use structural classification, not string-matching against specific fixtures.`,
        });
      }
    }
  }

  return violations;
}

// -----------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------

runLintChecks({
  capability: 'planning',
  editableFiles: [
    'src/commands/migrate/plan.ts',
    'src/planning/generate.ts',
  ],
  extraChecks: [
    checkExclusionsJson,
    checkNoFixtureConditionals,
  ],
});
