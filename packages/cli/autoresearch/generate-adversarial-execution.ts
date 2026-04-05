/**
 * Adversarial fixture generator for execution (code rewriting) autoresearch.
 *
 * Generates synthetic before.tsx / task.json / after.tsx triples with
 * randomized component names, import paths, and prop names. This tests that
 * the rewriter operates solely from MigrationTask properties and
 * RewriteContext — not from hardcoded component or import path strings.
 *
 * Generated fixtures are placed at `expected/execution/adversarial/`.
 * The evaluator automatically discovers them by scanning that directory.
 *
 * Usage:
 *   npx tsx autoresearch/generate-adversarial-execution.ts
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_BASE = path.join(__dir, 'expected', 'execution', 'adversarial');

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
const PROPS_POOL = [
  'onPress', 'isActive', 'variant', 'sizing', 'intent', 'scheme',
  'elevation', 'radius', 'weight', 'density', 'accent', 'tone',
];

function pick<T>(arr: readonly T[]): T {
  return arr[crypto.randomInt(arr.length)];
}

function randomPascal(): string {
  return `${pick(ADJECTIVES)}${pick(NOUNS)}`;
}

function randomCamel(): string {
  const adj = pick(ADJECTIVES);
  return `${adj[0].toLowerCase()}${adj.slice(1)}${pick(NOUNS)}`;
}

function randomPackagePath(): string {
  const adj = pick(ADJECTIVES).toLowerCase();
  const noun = pick(NOUNS).toLowerCase();
  return `@${adj}-${noun}/components`;
}

function uniquePair(exclude: Set<string>): [string, string] {
  let a: string, b: string;
  do { a = randomPascal(); } while (exclude.has(a));
  exclude.add(a);
  do { b = randomPascal(); } while (exclude.has(b));
  exclude.add(b);
  return [a, b];
}

function randomPropMapping(): Record<string, string> {
  const shuffled = [...PROPS_POOL].sort(() => crypto.randomInt(3) - 1);
  const count = 1 + crypto.randomInt(2);
  const mapping: Record<string, string> = {};
  for (let i = 0; i < count && i + count < shuffled.length; i++) {
    mapping[shuffled[i]] = shuffled[i + count];
  }
  return mapping;
}

// -----------------------------------------------------------------------
// Fixture generation
// -----------------------------------------------------------------------

function cleanOutput(): void {
  if (fs.existsSync(OUTPUT_BASE)) {
    fs.rmSync(OUTPUT_BASE, { recursive: true, force: true });
  }
}

function writeFixture(
  name: string,
  before: string,
  task: object,
  after: string
): void {
  const dir = path.join(OUTPUT_BASE, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'before.tsx'), before, 'utf8');
  fs.writeFileSync(path.join(dir, 'task.json'), JSON.stringify(task, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(dir, 'after.tsx'), after, 'utf8');
}

interface SimpleSwapConfig {
  componentName: string;
  targetName: string;
  sourcePackage: string;
  fileName: string;
}

function generateSimpleImportSwap(config: SimpleSwapConfig): void {
  const { componentName, targetName, sourcePackage, fileName } = config;
  const funcName = randomPascal() + 'View';

  const before = `import { ${componentName} } from '${sourcePackage}';
import { useState } from 'react';

export function ${funcName}() {
  const [active, setActive] = useState(false);
  return (
    <div>
      <${componentName} onClick={() => setActive(!active)}>
        Toggle
      </${componentName}>
    </div>
  );
}
`;

  const after = `import { useState } from 'react';
import { ${targetName} } from '@openzeppelin/ui-components';

export function ${funcName}() {
  const [active, setActive] = useState(false);
  return (
    <div>
      <${targetName} onClick={() => setActive(!active)}>
        Toggle
      </${targetName}>
    </div>
  );
}
`;

  const task = {
    id: `component-replacement-${componentName}`,
    phase: 'ui-components',
    type: 'component-replacement',
    status: 'pending',
    description: `Replace ${componentName} with OZ ${targetName}`,
    file: `src/${fileName}.tsx`,
    sourceComponent: componentName,
    targetComponent: targetName,
  };

  writeFixture('simple-swap', before, task, after);
}

interface MultiComponentConfig {
  replaceComponent: string;
  replaceTarget: string;
  keepComponent: string;
  sourcePackage: string;
}

function generateMultiComponent(config: MultiComponentConfig): void {
  const { replaceComponent, replaceTarget, keepComponent, sourcePackage } = config;
  const funcName = randomPascal() + 'Form';

  const before = `import { ${replaceComponent} } from '${sourcePackage}';
import { ${keepComponent} } from '${sourcePackage}';
import { useState } from 'react';

export function ${funcName}() {
  const [value, setValue] = useState('');

  return (
    <${keepComponent}>
      <${replaceComponent} onClick={() => setValue('')}>
        Reset
      </${replaceComponent}>
    </${keepComponent}>
  );
}
`;

  const after = `import { ${keepComponent} } from '${sourcePackage}';
import { useState } from 'react';
import { ${replaceTarget} } from '@openzeppelin/ui-components';

export function ${funcName}() {
  const [value, setValue] = useState('');

  return (
    <${keepComponent}>
      <${replaceTarget} onClick={() => setValue('')}>
        Reset
      </${replaceTarget}>
    </${keepComponent}>
  );
}
`;

  const task = {
    id: `component-replacement-${replaceComponent}`,
    phase: 'ui-components',
    type: 'component-replacement',
    status: 'pending',
    description: `Replace ${replaceComponent} with OZ ${replaceTarget}`,
    file: `src/${funcName}.tsx`,
    sourceComponent: replaceComponent,
    targetComponent: replaceTarget,
  };

  writeFixture('multi-component', before, task, after);
}

interface PropRenameConfig {
  componentName: string;
  targetName: string;
  sourcePackage: string;
  propMappings: Record<string, string>;
}

function generatePropRename(config: PropRenameConfig): void {
  const { componentName, targetName, sourcePackage, propMappings } = config;
  const funcName = randomPascal() + 'Widget';

  const propEntries = Object.entries(propMappings);
  const propsJsx = propEntries
    .map(([oldProp]) => `      ${oldProp}={true}`)
    .join('\n');
  const propsJsxRenamed = propEntries
    .map(([, newProp]) => `      ${newProp}={true}`)
    .join('\n');

  const before = `import { ${componentName} } from '${sourcePackage}';

export function ${funcName}() {
  return (
    <${componentName}
${propsJsx}
    >
      Content
    </${componentName}>
  );
}
`;

  const after = `import { ${targetName} } from '@openzeppelin/ui-components';

export function ${funcName}() {
  return (
    <${targetName}
${propsJsxRenamed}
    >
      Content
    </${targetName}>
  );
}
`;

  const task = {
    id: `component-replacement-${componentName}`,
    phase: 'ui-components',
    type: 'component-replacement',
    status: 'pending',
    description: `Replace ${componentName} with OZ ${targetName} including prop renames`,
    file: `src/${funcName}.tsx`,
    sourceComponent: componentName,
    targetComponent: targetName,
    propMappings,
  };

  writeFixture('prop-rename', before, task, after);
}

// -----------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------

function main(): void {
  cleanOutput();

  const usedNames = new Set<string>();

  const [comp1, target1] = uniquePair(usedNames);
  const pkg1 = randomPackagePath();
  generateSimpleImportSwap({
    componentName: comp1,
    targetName: target1,
    sourcePackage: pkg1,
    fileName: randomPascal() + 'Page',
  });

  const [replaceComp, replaceTarget] = uniquePair(usedNames);
  const [keepComp] = uniquePair(usedNames);
  const pkg2 = randomPackagePath();
  generateMultiComponent({
    replaceComponent: replaceComp,
    replaceTarget: replaceTarget,
    keepComponent: keepComp,
    sourcePackage: pkg2,
  });

  const [comp3, target3] = uniquePair(usedNames);
  const pkg3 = randomPackagePath();
  const propMappings = randomPropMapping();
  generatePropRename({
    componentName: comp3,
    targetName: target3,
    sourcePackage: pkg3,
    propMappings,
  });

  const totalFixtures = 3;
  console.error(`Generated ${totalFixtures} adversarial execution fixtures at ${OUTPUT_BASE}`);
  console.error('Fixture names are randomized — any hardcoded component-name logic will fail.');
}

main();
