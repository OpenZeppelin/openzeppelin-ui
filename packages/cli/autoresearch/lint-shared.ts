/**
 * Shared structural lint infrastructure for all autoresearch capability loops.
 *
 * Provides reusable fixture-identifier extraction and string-literal checking
 * so that per-capability lint gates stay DRY.
 *
 * Each capability lint script imports from here and adds its own
 * capability-specific checks on top.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
export const CLI_ROOT = path.join(__dir, '..');

/**
 * Strings that are allowed even if they appear in fixtures.
 * These are generic library/ecosystem identifiers, NOT fixture-specific.
 */
export const ALLOWLIST = new Set([
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
export const GENERIC_PATTERNS = [
  /^@openzeppelin\//,
  /^@radix-ui\//,
  /^react/,
  /^node:/,
];

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export interface Violation {
  file: string;
  line: number;
  rule: string;
  detail: string;
}

export type ExtraCheck = (filePath: string, content: string, fixtureIds: Set<string>) => Violation[];

export interface LintConfig {
  capability: string;
  editableFiles: string[];
  extraChecks?: ExtraCheck[];
}

// -----------------------------------------------------------------------
// Identifier extraction (self-updating from fixtures)
// -----------------------------------------------------------------------

interface ExpectedFile {
  fixture: string;
  components?: Array<{ sourceLibrary?: string }>;
}

export function extractFixtureIdentifiers(): Set<string> {
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
export function collectPackageNames(dir: string, out: Set<string>): void {
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
// Shared structural checks
// -----------------------------------------------------------------------

export function isInStringLiteral(line: string, id: string): boolean {
  const idx = line.indexOf(id);
  if (idx < 0) return false;

  for (let i = idx - 1; i >= 0; i--) {
    const ch = line[i];
    if (ch === "'" || ch === '"' || ch === '`') return true;
    if (ch === ' ' || ch === '\t' || ch === '(' || ch === '[' || ch === '{') break;
  }
  return false;
}

export function checkNoFixtureIdentifiers(
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
            `Fixture identifiers must not appear in editable code. ` +
            `Use catalog JSON files or structural inference instead.`,
        });
      }
    }
  }

  return violations;
}

/**
 * Detects hardcoded component-name allowlists in TypeScript code.
 * Reusable by detection, verification, and any future capability that
 * touches component-level logic.
 */
export function checkNoHardcodedAllowlists(
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
            `Capability-specific gates should be in JSON catalog files, not in TypeScript.`,
        });
      }
    }
  }

  return violations;
}

// -----------------------------------------------------------------------
// Runner
// -----------------------------------------------------------------------

export function runLintChecks(config: LintConfig): void {
  const fixtureIds = extractFixtureIdentifiers();

  console.error(`[${config.capability}] Lint gate: extracted ${fixtureIds.size} fixture identifiers`);
  console.error(`[${config.capability}] Checking ${config.editableFiles.length} editable file(s)...\n`);

  const allViolations: Violation[] = [];

  for (const relPath of config.editableFiles) {
    const absPath = path.join(CLI_ROOT, relPath);
    if (!fs.existsSync(absPath)) continue;

    const content = fs.readFileSync(absPath, 'utf8');

    allViolations.push(...checkNoFixtureIdentifiers(relPath, content, fixtureIds));

    if (config.extraChecks) {
      for (const check of config.extraChecks) {
        allViolations.push(...check(relPath, content, fixtureIds));
      }
    }
  }

  if (allViolations.length === 0) {
    console.error(`✓ [${config.capability}] All structural lint checks passed.\n`);
    process.exit(0);
  }

  console.error(`✗ [${config.capability}] ${allViolations.length} violation(s) found:\n`);
  for (const v of allViolations) {
    const loc = v.line > 0 ? `:${v.line}` : '';
    console.error(`  ${v.file}${loc} [${v.rule}]`);
    console.error(`    ${v.detail}\n`);
  }

  process.exit(1);
}
