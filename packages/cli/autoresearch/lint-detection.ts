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

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const CLI_ROOT = path.join(__dir, '..');

// -----------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------

/** TS files the autoresearch agent is allowed to edit for detection. */
const EDITABLE_TS_FILES = [
  'src/analysis/component-matcher.ts',
  'src/analysis/import-classifier.ts',
  'src/analysis/import-resolver.ts',
];

/**
 * Strings that are allowed even if they appear in fixtures.
 * These are generic library/ecosystem identifiers, NOT fixture-specific.
 */
const ALLOWLIST = new Set([
  '@openzeppelin/ui-components',
  '@openzeppelin/accounts-ui-components',
  '@radix-ui/',
  'react-hook-form',
  'lucide-react',
  'react-router',
  'antd',
  'shadcn',
]);

/**
 * Patterns that are inherently generic and should never be flagged.
 * Matches against extracted identifiers — if an identifier matches
 * any of these, it is skipped.
 */
const GENERIC_PATTERNS = [
  /^@openzeppelin\//,
  /^@radix-ui\//,
  /^react/,
  /^node:/,
];

// -----------------------------------------------------------------------
// Identifier extraction (self-updating from fixtures)
// -----------------------------------------------------------------------

interface ExpectedFile {
  fixture: string;
  components?: Array<{ sourceLibrary?: string }>;
}

function extractFixtureIdentifiers(): Set<string> {
  const ids = new Set<string>();

  const expectedDir = path.join(__dir, 'expected');
  if (fs.existsSync(expectedDir)) {
    for (const file of fs.readdirSync(expectedDir)) {
      if (!file.endsWith('.json') || file.endsWith('.scaffold.json')) continue;
      try {
        const data: ExpectedFile = JSON.parse(
          fs.readFileSync(path.join(expectedDir, file), 'utf8')
        );
        if (data.fixture) ids.add(data.fixture);
      } catch { /* skip unparseable */ }
    }
  }

  const fixturesDir = path.join(__dir, 'fixtures');
  if (fs.existsSync(fixturesDir)) {
    for (const entry of fs.readdirSync(fixturesDir, { withFileTypes: true })) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
      if (entry.name.startsWith('_')) continue;
      ids.add(entry.name);

      collectPackageNames(path.join(fixturesDir, entry.name), ids);
    }
  }

  const externalPath = path.join(fixturesDir, '_external.json');
  if (fs.existsSync(externalPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(externalPath, 'utf8'));
      for (const f of manifest.fixtures ?? []) {
        if (f.name) ids.add(f.name);
        if (f.siblingRepo) ids.add(f.siblingRepo);
      }
    } catch { /* skip */ }
  }

  return ids;
}

/**
 * Recursively find package.json files in a fixture tree and extract
 * workspace package names (names containing / that aren't @openzeppelin).
 */
function collectPackageNames(dir: string, out: Set<string>): void {
  let realDir: string;
  try {
    realDir = fs.realpathSync(dir);
  } catch {
    return;
  }

  const pkgPath = path.join(realDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.name && typeof pkg.name === 'string') {
        out.add(pkg.name);
      }
    } catch { /* skip */ }
  }

  try {
    for (const entry of fs.readdirSync(realDir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      if (entry.isDirectory()) {
        const child = path.join(realDir, entry.name);
        if (entry.name === 'packages' || entry.name === 'apps') {
          for (const sub of fs.readdirSync(child, { withFileTypes: true })) {
            if (sub.isDirectory()) {
              collectPackageNames(path.join(child, sub.name), out);
            }
          }
        }
      }
    }
  } catch { /* skip unreadable */ }
}

// -----------------------------------------------------------------------
// Structural invariant checks
// -----------------------------------------------------------------------

interface Violation {
  file: string;
  line: number;
  rule: string;
  detail: string;
}

function checkNoFixtureIdentifiers(
  filePath: string,
  content: string,
  fixtureIds: Set<string>
): Violation[] {
  const violations: Violation[] = [];
  const lines = content.split('\n');

  for (const id of fixtureIds) {
    if (ALLOWLIST.has(id)) continue;
    if (GENERIC_PATTERNS.some((p) => p.test(id))) continue;
    if (id.length < 4) continue;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) continue;
      if (!line.includes(id)) continue;

      if (isInStringLiteral(line, id)) {
        violations.push({
          file: filePath,
          line: i + 1,
          rule: 'no-fixture-identifiers',
          detail: `Found fixture-specific identifier "${id}" as a string literal. ` +
            `Fixture identifiers must not appear in editable detection code. ` +
            `Use catalog JSON files or structural inference instead.`,
        });
      }
    }
  }

  return violations;
}

function isInStringLiteral(line: string, id: string): boolean {
  const idx = line.indexOf(id);
  if (idx < 0) return false;

  for (let i = idx - 1; i >= 0; i--) {
    const ch = line[i];
    if (ch === "'" || ch === '"' || ch === '`') return true;
    if (ch === ' ' || ch === '\t' || ch === '(' || ch === '[' || ch === '{') break;
  }
  return false;
}

function checkNoHardcodedComponentAllowlists(
  filePath: string,
  content: string
): Violation[] {
  const violations: Violation[] = [];
  const lines = content.split('\n');

  const ALLOWLIST_PATTERNS = [
    /new\s+Set\s*\(\s*\[[\s\S]*?['"][A-Z][a-zA-Z]+['"]/,
    /ONLY_FOR_.*_PACKAGE/,
    /MAPPINGS_ONLY_FOR/,
    /HARDCODED_/i,
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trimStart().startsWith('//') || line.trimStart().startsWith('*')) continue;
    for (const pattern of ALLOWLIST_PATTERNS) {
      if (pattern.test(line)) {
        violations.push({
          file: filePath,
          line: i + 1,
          rule: 'no-hardcoded-allowlists',
          detail: `Line matches hardcoded allowlist pattern: ${pattern}. ` +
            `Component-specific gates should be in JSON catalog files, not in TypeScript.`,
        });
      }
    }
  }

  return violations;
}

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

function main(): void {
  const fixtureIds = extractFixtureIdentifiers();

  console.error(`Lint gate: extracted ${fixtureIds.size} fixture identifiers`);
  console.error(`Checking ${EDITABLE_TS_FILES.length} editable files...\n`);

  const allViolations: Violation[] = [];

  for (const relPath of EDITABLE_TS_FILES) {
    const absPath = path.join(CLI_ROOT, relPath);
    if (!fs.existsSync(absPath)) continue;

    const content = fs.readFileSync(absPath, 'utf8');

    allViolations.push(
      ...checkNoFixtureIdentifiers(relPath, content, fixtureIds),
      ...checkNoHardcodedComponentAllowlists(relPath, content),
      ...checkCatalogSeparation(relPath, content),
    );
  }

  if (allViolations.length === 0) {
    console.error('✓ All structural lint checks passed.\n');
    process.exit(0);
  }

  console.error(`✗ ${allViolations.length} violation(s) found:\n`);
  for (const v of allViolations) {
    const loc = v.line > 0 ? `:${v.line}` : '';
    console.error(`  ${v.file}${loc} [${v.rule}]`);
    console.error(`    ${v.detail}\n`);
  }

  process.exit(1);
}

main();
