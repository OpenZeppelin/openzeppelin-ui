/**
 * Adversarial fixture generator for verification (doctor) autoresearch.
 *
 * Generates synthetic verification fixtures with randomized component names,
 * import sources, and project structures. This tests that the checker classifies
 * based on structural properties (orphaned imports, wrong packages) rather than
 * hardcoded component or library identifiers.
 *
 * Generated fixtures are placed at `expected/verification/adversarial/`.
 * The evaluator automatically discovers them by scanning that directory.
 *
 * Usage:
 *   npx tsx autoresearch/generate-adversarial-verification.ts
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_BASE = path.join(__dir, 'expected', 'verification', 'adversarial');

// -----------------------------------------------------------------------
// Random naming
// -----------------------------------------------------------------------

const ADJECTIVES = [
  'Bright', 'Swift', 'Calm', 'Bold', 'Keen', 'Warm', 'Sharp', 'Clear',
  'Prime', 'Vivid', 'Crisp', 'Sleek', 'Fluid', 'Agile', 'Dense', 'Rapid',
];
const NOUNS = [
  'Panel', 'Block', 'Frame', 'Field', 'Layer', 'Shell', 'Stack', 'Craft',
  'Vault', 'Prism', 'Nexus', 'Forge', 'Pulse', 'Spark', 'Orbit', 'Pixel',
];

function pick<T>(arr: readonly T[]): T {
  return arr[crypto.randomInt(arr.length)];
}

function randomPascal(): string {
  return `${pick(ADJECTIVES)}${pick(NOUNS)}`;
}

function randomPackagePath(): string {
  const adj = pick(ADJECTIVES).toLowerCase();
  const noun = pick(NOUNS).toLowerCase();
  return `@${adj}-${noun}/ui`;
}

// -----------------------------------------------------------------------
// Fixture generation helpers
// -----------------------------------------------------------------------

function cleanOutput(): void {
  if (fs.existsSync(OUTPUT_BASE)) {
    fs.rmSync(OUTPUT_BASE, { recursive: true, force: true });
  }
}

function writeFixtureJson(name: string, data: object): void {
  const filePath = path.join(OUTPUT_BASE, `${name}.json`);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function writeProjectFile(name: string, relPath: string, content: string): void {
  const filePath = path.join(OUTPUT_BASE, name, 'project', relPath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

// -----------------------------------------------------------------------
// Scenario generators
// -----------------------------------------------------------------------

const usedNames = new Set<string>();

function uniqueName(): string {
  let name: string;
  do { name = randomPascal(); } while (usedNames.has(name));
  usedNames.add(name);
  return name;
}

/**
 * Scenario 1: Correct migration (pass).
 * Component is properly imported from @openzeppelin/ui-components.
 */
function generateCorrectMigration(): void {
  const comp = uniqueName();
  const target = uniqueName();
  const funcName = uniqueName() + 'App';

  const appTsx = `import { ${target} } from '@openzeppelin/ui-components';

export function ${funcName}() {
  return <${target} onClick={() => {}}>Action</${target}>;
}
`;

  writeProjectFile('correct-migration', 'src/App.tsx', appTsx);
  writeFixtureJson('correct-migration', {
    fixture: 'adversarial-correct-migration',
    expectedStatus: 'pass',
    diagnosticKeywords: [],
    task: {
      id: `component-replacement-${comp}-src-App.tsx`,
      phase: 'ui-components',
      type: 'component-replacement',
      status: 'pending',
      description: `Replace ${comp} with OZ ${target} in src/App.tsx`,
      file: 'src/App.tsx',
      sourceComponent: comp,
      targetComponent: target,
    },
    projectDir: 'adversarial/correct-migration/project',
  });
}

/**
 * Scenario 2: Orphaned old import (fail).
 * Old import from random source still exists alongside OZ import.
 */
function generateOrphanedImport(): void {
  const comp = uniqueName();
  const target = uniqueName();
  const oldSource = randomPackagePath();
  const funcName = uniqueName() + 'Page';

  const appTsx = `import { ${comp} } from '${oldSource}';
import { ${target} } from '@openzeppelin/ui-components';

export function ${funcName}() {
  return (
    <div>
      <${comp} />
      <${target} />
    </div>
  );
}
`;

  writeProjectFile('orphaned-import', 'src/App.tsx', appTsx);
  writeFixtureJson('orphaned-import', {
    fixture: 'adversarial-orphaned-import',
    expectedStatus: 'fail',
    diagnosticKeywords: ['old import', comp],
    task: {
      id: `component-replacement-${comp}-src-App.tsx`,
      phase: 'ui-components',
      type: 'component-replacement',
      status: 'pending',
      description: `Replace ${comp} with OZ ${target} in src/App.tsx`,
      file: 'src/App.tsx',
      sourceComponent: comp,
      targetComponent: target,
    },
    projectDir: 'adversarial/orphaned-import/project',
  });
}

/**
 * Scenario 3: Wrong OZ package (fail).
 * Component imported from a wrong @openzeppelin/* sub-package.
 */
function generateWrongOzPackage(): void {
  const comp = uniqueName();
  const target = uniqueName();
  const funcName = uniqueName() + 'View';

  const appTsx = `import { ${target} } from '@openzeppelin/ui-react';

export function ${funcName}() {
  return <${target} />;
}
`;

  writeProjectFile('wrong-oz-package', 'src/App.tsx', appTsx);
  writeFixtureJson('wrong-oz-package', {
    fixture: 'adversarial-wrong-oz-package',
    expectedStatus: 'fail',
    diagnosticKeywords: ['wrong package', target, 'ui-components'],
    task: {
      id: `component-replacement-${comp}-src-App.tsx`,
      phase: 'ui-components',
      type: 'component-replacement',
      status: 'pending',
      description: `Replace ${comp} with OZ ${target} in src/App.tsx`,
      file: 'src/App.tsx',
      sourceComponent: comp,
      targetComponent: target,
    },
    projectDir: 'adversarial/wrong-oz-package/project',
  });
}

/**
 * Scenario 4: Missing OZ import (fail).
 * The target component is not imported at all — the file still uses the old name.
 */
function generateMissingOzImport(): void {
  const comp = uniqueName();
  const target = uniqueName();
  const oldSource = randomPackagePath();
  const funcName = uniqueName() + 'Section';

  const appTsx = `import { ${comp} } from '${oldSource}';

export function ${funcName}() {
  return <${comp} onClick={() => {}}>Submit</${comp}>;
}
`;

  writeProjectFile('missing-oz-import', 'src/App.tsx', appTsx);
  writeFixtureJson('missing-oz-import', {
    fixture: 'adversarial-missing-oz-import',
    expectedStatus: 'fail',
    diagnosticKeywords: ['not imported', target],
    task: {
      id: `component-replacement-${comp}-src-App.tsx`,
      phase: 'ui-components',
      type: 'component-replacement',
      status: 'pending',
      description: `Replace ${comp} with OZ ${target} in src/App.tsx`,
      file: 'src/App.tsx',
      sourceComponent: comp,
      targetComponent: target,
    },
    projectDir: 'adversarial/missing-oz-import/project',
  });
}

// -----------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------

function main(): void {
  cleanOutput();

  generateCorrectMigration();
  generateOrphanedImport();
  generateWrongOzPackage();
  generateMissingOzImport();

  const totalFixtures = 4;
  console.error(`Generated ${totalFixtures} adversarial verification fixtures at ${OUTPUT_BASE}`);
  console.error('Component and source names are randomized — any hardcoded name logic will fail.');
}

main();
