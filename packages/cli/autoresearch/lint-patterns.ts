/**
 * Structural lint gate for the patterns autoresearch loop.
 *
 * Ensures pattern-scanner.ts does not contain fixture-specific identifiers
 * such as fixture names, fixture package names, or fixture-specific file paths.
 *
 * Exit code:
 *   0 — all checks pass
 *   1 — one or more violations detected
 *
 * Usage:
 *   npx tsx autoresearch/lint-patterns.ts
 */

import {
  type Violation,
  extractFixtureIdentifiers,
  isInStringLiteral,
  runLintChecks,
} from './lint-shared.js';

// -----------------------------------------------------------------------
// Pattern-specific checks
// -----------------------------------------------------------------------

/**
 * Detects regex patterns that embed fixture-specific package scopes
 * (e.g., a regex literal containing a fixture's workspace package name).
 */
function checkNoFixtureSpecificRegex(
  filePath: string,
  content: string,
  fixtureIds: Set<string>
): Violation[] {
  const violations: Violation[] = [];
  const lines = content.split('\n');

  for (const id of fixtureIds) {
    if (id.length < 4) continue;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) continue;
      if (!line.includes(id)) continue;

      const regexMatch = line.match(/\/[^/]+\//);
      if (regexMatch && regexMatch[0].includes(id)) {
        violations.push({
          file: filePath,
          line: i + 1,
          rule: 'no-fixture-regex',
          detail: `Regex literal contains fixture-specific identifier "${id}". ` +
            `Pattern regexes must match structural properties, not fixture-specific names.`,
        });
      }
    }
  }

  return violations;
}

/**
 * Detects fixture-specific file paths used as string literals in pattern rules.
 * Extracts relative paths from expected pattern files and checks for their
 * presence in the scanner code.
 */
function checkNoFixtureFilePaths(
  filePath: string,
  content: string
): Violation[] {
  const violations: Violation[] = [];
  const lines = content.split('\n');
  const fixtureIds = extractFixtureIdentifiers();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) continue;

    for (const id of fixtureIds) {
      if (id.length < 4) continue;
      const pathPattern = new RegExp(`['"\`].*${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`);
      if (pathPattern.test(line) && isInStringLiteral(line, id)) {
        violations.push({
          file: filePath,
          line: i + 1,
          rule: 'no-fixture-file-paths',
          detail: `String literal contains a path referencing fixture "${id}". ` +
            `Pattern rules must not embed fixture-specific directory structures.`,
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
  capability: 'patterns',
  editableFiles: [
    'src/analysis/pattern-scanner.ts',
  ],
  extraChecks: [
    checkNoFixtureSpecificRegex,
    (_filePath, content) => checkNoFixtureFilePaths(_filePath, content),
  ],
});
