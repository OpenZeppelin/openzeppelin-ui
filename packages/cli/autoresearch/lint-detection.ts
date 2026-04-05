/**
 * Structural lint gate for the detection autoresearch loop.
 *
 * Automatically extracts fixture-specific identifiers (package names,
 * workspace package specifiers, non-generic component names) from expected
 * outputs and fixture metadata, then verifies that the editable TypeScript
 * surface does not contain hardcoded references to them.
 *
 * This script is self-updating: adding a new fixture automatically extends
 * the lint because identifiers are extracted at runtime from whatever
 * fixtures and expected files exist on disk.
 *
 * Exit code:
 *   0 — all checks pass
 *   1 — one or more violations detected
 *
 * Usage:
 *   npx tsx autoresearch/lint-detection.ts
 */

import {
  type Violation,
  checkNoHardcodedAllowlists,
  runLintChecks,
} from './lint-shared.js';

// -----------------------------------------------------------------------
// Detection-specific checks
// -----------------------------------------------------------------------

function checkCatalogSeparation(
  filePath: string,
  content: string
): Violation[] {
  const violations: Violation[] = [];
  const lines = content.split('\n');

  const knownComponentNames = new Set([
    'Accordion', 'Alert', 'Badge', 'Button', 'Card', 'Checkbox',
    'Dialog', 'DropdownMenu', 'Input', 'Label', 'Popover', 'Progress',
    'RadioGroup', 'Select', 'Separator', 'Switch', 'Table', 'Tabs',
    'Textarea', 'Tooltip',
  ]);

  let inlineComponentCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) continue;
    if (line.trimStart().startsWith('import ')) continue;

    for (const name of knownComponentNames) {
      const pattern = new RegExp(`['"]${name}['"]`);
      if (pattern.test(line)) {
        const context = lines.slice(Math.max(0, i - 2), i + 1).join(' ');
        if (/(?:source|effort|notes|mapping|\.json)/i.test(context)) continue;
        if (/test|describe|it\(/i.test(context)) continue;
        if (/NON_UI_IDENTITY_SUFFIXES|COMPOUND_SUFFIXES/.test(context)) continue;
        inlineComponentCount++;
      }
    }
  }

  if (inlineComponentCount > 5) {
    violations.push({
      file: filePath,
      line: 0,
      rule: 'catalog-separation',
      detail: `Found ${inlineComponentCount} inline component name string literals. ` +
        `Component mappings should live in JSON catalog files, not be scattered in TypeScript. ` +
        `A small number (≤5) is acceptable for structural constants.`,
    });
  }

  return violations;
}

// -----------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------

runLintChecks({
  capability: 'detection',
  editableFiles: [
    'src/analysis/component-matcher.ts',
    'src/analysis/import-classifier.ts',
    'src/analysis/import-resolver.ts',
  ],
  extraChecks: [
    (_filePath, content, _fixtureIds) => checkNoHardcodedAllowlists(_filePath, content),
    (_filePath, content) => checkCatalogSeparation(_filePath, content),
  ],
});
