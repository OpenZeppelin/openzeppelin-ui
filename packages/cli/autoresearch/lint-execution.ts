/**
 * Structural lint gate for the execution autoresearch loop.
 *
 * Ensures rewriteFile.ts does not contain fixture-specific identifiers
 * or hardcoded component names. Rewrite logic should reference task
 * properties (sourceComponent, targetComponent), not hardcoded strings.
 *
 * Exit code:
 *   0 — all checks pass
 *   1 — one or more violations detected
 *
 * Usage:
 *   npx tsx autoresearch/lint-execution.ts
 */

import {
  type Violation,
  ALLOWLIST,
  GENERIC_PATTERNS,
  checkNoHardcodedAllowlists,
  runLintChecks,
} from './lint-shared.js';

// -----------------------------------------------------------------------
// Execution-specific checks
// -----------------------------------------------------------------------

/**
 * Detects fixture-specific import paths or component names used in
 * conditional branches of the rewriter. The rewriter should be
 * entirely task-driven — it reads sourceComponent/targetComponent from
 * the MigrationTask and should never branch on a specific component name.
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
            `Rewrite logic must use task properties (sourceComponent, targetComponent), not hardcoded strings.`,
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
  capability: 'execution',
  editableFiles: [
    'src/rewriter/rewriteFile.ts',
  ],
  extraChecks: [
    (_filePath, content) => checkNoHardcodedAllowlists(_filePath, content),
    checkNoFixtureConditionals,
  ],
});
