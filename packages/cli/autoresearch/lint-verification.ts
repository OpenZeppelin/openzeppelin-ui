/**
 * Structural lint gate for the verification autoresearch loop.
 *
 * Ensures checker.ts does not contain fixture-specific identifiers,
 * hardcoded component allowlists, or fixture-shaped conditionals.
 *
 * Exit code:
 *   0 — all checks pass
 *   1 — one or more violations detected
 *
 * Usage:
 *   npx tsx autoresearch/lint-verification.ts
 */

import {
  type Violation,
  ALLOWLIST,
  GENERIC_PATTERNS,
  checkNoHardcodedAllowlists,
  runLintChecks,
} from './lint-shared.js';

// -----------------------------------------------------------------------
// Verification-specific checks
// -----------------------------------------------------------------------

/**
 * Detects fixture-shaped conditionals — source/component equality checks
 * that reference fixture-specific identifiers in checker logic.
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
            `Verification checks must classify based on structural properties, not fixture-specific strings.`,
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
  capability: 'verification',
  editableFiles: [
    'src/verification/checker.ts',
  ],
  extraChecks: [
    (_filePath, content) => checkNoHardcodedAllowlists(_filePath, content),
    checkNoFixtureConditionals,
  ],
});
