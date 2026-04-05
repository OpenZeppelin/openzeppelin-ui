/**
 * Adversarial fixture generator for detection autoresearch.
 *
 * Generates a synthetic project that uses real OZ-mappable component names
 * (Button, Card, Dialog, etc.) but imports them through randomized structural
 * contexts: unfamiliar workspace package names, novel path alias patterns,
 * and unconventional compound sub-component groupings.
 *
 * This tests that the detection system works based on structural properties
 * (import graph shape, compound suffix patterns, HTML tag recognition) rather
 * than hardcoded package names or file path conventions.
 *
 * The generated fixture is placed at `fixtures/adversarial-app/` with a
 * matching expected file at `expected/adversarial-app.json`.
 *
 * Usage:
 *   npx tsx autoresearch/generate-adversarial-fixture.ts
 *
 * The fixture is regenerated from scratch each time — previous content is
 * replaced. The randomized structural context changes on every run, so any
 * detection approach that only works for specific package/path names will
 * eventually fail.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dir, 'fixtures');
const EXPECTED_DIR = path.join(__dir, 'expected');
const FIXTURE_NAME = 'adversarial-app';
const OUTPUT_DIR = path.join(FIXTURES_DIR, FIXTURE_NAME);

// -----------------------------------------------------------------------
// Random naming (structural context only — component names are real OZ names)
// -----------------------------------------------------------------------

const ADJECTIVES = [
  'bright', 'swift', 'calm', 'bold', 'keen', 'warm', 'sharp', 'clear',
  'prime', 'vivid', 'crisp', 'sleek', 'fluid', 'agile', 'dense', 'rapid',
];
const NOUNS = [
  'panel', 'block', 'frame', 'field', 'layer', 'shell', 'stack', 'craft',
  'vault', 'prism', 'nexus', 'forge', 'pulse', 'spark', 'orbit', 'pixel',
];

function pick<T>(arr: readonly T[]): T {
  return arr[crypto.randomInt(arr.length)];
}

function randomLowerWord(): string {
  return pick([...ADJECTIVES, ...NOUNS]);
}

function randomPackageScope(): string {
  return `@${randomLowerWord()}${randomLowerWord()}`;
}

// -----------------------------------------------------------------------
// Fixture generation
// -----------------------------------------------------------------------

interface GeneratedComponent {
  name: string;
  ozTarget: string;
  sourceLibrary: string;
}

function generate(): void {
  const seed = crypto.randomInt(100000);
  console.error(`Generating adversarial fixture (seed hint: ${seed})...`);

  const scope = randomPackageScope();
  const uiPkgName = `${scope}/design-system`;
  const appPkgName = `${scope}/app`;

  // Randomize the UI component directory path (not the standard @/components/ui/)
  const uiDirSegments = [randomLowerWord(), randomLowerWord()];
  const uiImportAlias = `~/${uiDirSegments.join('/')}`;
  const uiRelativeDir = `src/${uiDirSegments.join('/')}`;

  // -------------------------------------------------------------------
  // Write fixture files
  // -------------------------------------------------------------------

  rmrf(OUTPUT_DIR);
  mkdirp(path.join(OUTPUT_DIR, uiRelativeDir));
  mkdirp(path.join(OUTPUT_DIR, 'src', 'views'));

  // Root package.json
  writeJson(path.join(OUTPUT_DIR, 'package.json'), {
    name: appPkgName,
    version: '0.0.0',
    type: 'module',
    private: true,
    dependencies: {
      react: '^19.0.0',
      'react-dom': '^19.0.0',
    },
    devDependencies: {
      vite: '^7.0.0',
      tailwindcss: '^4.1.0',
    },
  });

  // tsconfig with path alias using ~/ (less common than @/)
  writeJson(path.join(OUTPUT_DIR, 'tsconfig.json'), {
    compilerOptions: {
      baseUrl: '.',
      paths: {
        '~/*': ['./src/*'],
      },
    },
  });

  writeFile(path.join(OUTPUT_DIR, 'vite.config.ts'), [
    "import { defineConfig } from 'vite';",
    "import path from 'path';",
    'export default defineConfig({',
    '  resolve: { alias: { "~": path.resolve(__dirname, "src") } },',
    '});',
  ]);

  // UI library files — real OZ names, random path structure
  // Button (standalone)
  writeUiComponent(
    path.join(OUTPUT_DIR, uiRelativeDir, 'action-button.tsx'),
    'Button'
  );

  // Card family (compound)
  writeUiCompoundComponent(
    path.join(OUTPUT_DIR, uiRelativeDir, 'info-card.tsx'),
    'Card',
    ['CardContent', 'CardHeader', 'CardTitle', 'CardFooter']
  );

  // Dialog family (compound)
  writeUiCompoundComponent(
    path.join(OUTPUT_DIR, uiRelativeDir, 'modal.tsx'),
    'Dialog',
    ['DialogContent', 'DialogTrigger']
  );

  // Tabs family (compound)
  writeUiCompoundComponent(
    path.join(OUTPUT_DIR, uiRelativeDir, 'tab-set.tsx'),
    'Tabs',
    ['TabsList', 'TabsTrigger', 'TabsContent']
  );

  // Select family (compound)
  writeUiCompoundComponent(
    path.join(OUTPUT_DIR, uiRelativeDir, 'picker.tsx'),
    'Select',
    ['SelectTrigger', 'SelectContent', 'SelectItem']
  );

  // Alert family (compound)
  writeUiCompoundComponent(
    path.join(OUTPUT_DIR, uiRelativeDir, 'notice.tsx'),
    'Alert',
    ['AlertTitle', 'AlertDescription']
  );

  // Checkbox (standalone)
  writeUiComponent(
    path.join(OUTPUT_DIR, uiRelativeDir, 'tick-box.tsx'),
    'Checkbox'
  );

  // Input (standalone)
  writeUiComponent(
    path.join(OUTPUT_DIR, uiRelativeDir, 'text-input.tsx'),
    'Input'
  );

  // Tooltip (standalone)
  writeUiComponent(
    path.join(OUTPUT_DIR, uiRelativeDir, 'hint.tsx'),
    'Tooltip'
  );

  // Consumer page 1 — imports from the randomized UI alias path
  writeFile(path.join(OUTPUT_DIR, 'src', 'views', 'Overview.tsx'), [
    `import { Button } from '${uiImportAlias}/action-button';`,
    `import { Card, CardContent, CardHeader, CardTitle } from '${uiImportAlias}/info-card';`,
    `import { Tabs, TabsList, TabsTrigger, TabsContent } from '${uiImportAlias}/tab-set';`,
    '',
    'export function Overview() {',
    '  return (',
    '    <div>',
    '      <Card>',
    '        <CardHeader><CardTitle>Overview</CardTitle></CardHeader>',
    '        <CardContent>',
    '          <Tabs defaultValue="main">',
    '            <TabsList>',
    '              <TabsTrigger value="main">Main</TabsTrigger>',
    '              <TabsTrigger value="details">Details</TabsTrigger>',
    '            </TabsList>',
    '            <TabsContent value="main"><p>Main content</p></TabsContent>',
    '            <TabsContent value="details"><p>Details</p></TabsContent>',
    '          </Tabs>',
    '        </CardContent>',
    '      </Card>',
    '      <Button>Save</Button>',
    '    </div>',
    '  );',
    '}',
  ]);

  // Consumer page 2
  writeFile(path.join(OUTPUT_DIR, 'src', 'views', 'Configuration.tsx'), [
    `import { Dialog, DialogContent, DialogTrigger } from '${uiImportAlias}/modal';`,
    `import { Select, SelectTrigger, SelectContent, SelectItem } from '${uiImportAlias}/picker';`,
    `import { Alert, AlertTitle, AlertDescription } from '${uiImportAlias}/notice';`,
    `import { Button } from '${uiImportAlias}/action-button';`,
    `import { Checkbox } from '${uiImportAlias}/tick-box';`,
    `import { Tooltip } from '${uiImportAlias}/hint';`,
    '',
    'export function Configuration() {',
    '  return (',
    '    <div>',
    '      <Alert>',
    '        <AlertTitle>Warning</AlertTitle>',
    '        <AlertDescription>Check your settings</AlertDescription>',
    '      </Alert>',
    '      <Select>',
    '        <SelectTrigger>Choose</SelectTrigger>',
    '        <SelectContent>',
    '          <SelectItem value="a">Option A</SelectItem>',
    '          <SelectItem value="b">Option B</SelectItem>',
    '        </SelectContent>',
    '      </Select>',
    '      <Tooltip><span>Hover me</span></Tooltip>',
    '      <Checkbox />',
    '      <Dialog>',
    '        <DialogTrigger><Button>Open</Button></DialogTrigger>',
    '        <DialogContent><p>Dialog body</p></DialogContent>',
    '      </Dialog>',
    '    </div>',
    '  );',
    '}',
  ]);

  // Consumer page 3 — HTML fallback (no DS imports, just raw HTML)
  writeFile(path.join(OUTPUT_DIR, 'src', 'views', 'LegacyForm.tsx'), [
    'export function LegacyForm() {',
    '  return (',
    '    <form>',
    '      <label htmlFor="name">Name</label>',
    '      <input id="name" type="text" />',
    '      <textarea placeholder="Bio" />',
    '      <select>',
    '        <option>Pick one</option>',
    '      </select>',
    '      <button type="submit">Submit</button>',
    '    </form>',
    '  );',
    '}',
  ]);

  // Consumer page 4 — local wrapper that re-exports DS components
  writeFile(path.join(OUTPUT_DIR, 'src', 'views', 'AppInput.tsx'), [
    `import { Input } from '${uiImportAlias}/text-input';`,
    '',
    'export function AppInput(props: Record<string, unknown>) {',
    '  return <Input {...props} />;',
    '}',
  ]);

  writeFile(path.join(OUTPUT_DIR, 'src', 'App.tsx'), [
    `import { Overview } from './views/Overview';`,
    `import { Configuration } from './views/Configuration';`,
    `import { LegacyForm } from './views/LegacyForm';`,
    '',
    'export function App() {',
    '  return (',
    '    <div>',
    '      <Overview />',
    '      <Configuration />',
    '      <LegacyForm />',
    '    </div>',
    '  );',
    '}',
  ]);

  writeFile(path.join(OUTPUT_DIR, 'src', 'main.tsx'), [
    "import React from 'react';",
    "import { App } from './App';",
    '',
    'export default App;',
  ]);

  writeFile(path.join(OUTPUT_DIR, 'src', 'index.css'), [
    '@tailwind base;',
    '@tailwind components;',
    '@tailwind utilities;',
  ]);

  // -------------------------------------------------------------------
  // Expected output — real OZ component names detected via structure
  // -------------------------------------------------------------------

  const expected: GeneratedComponent[] = [
    // shadcn-style (local alias path to UI lib files)
    { name: 'Button', ozTarget: 'Button', sourceLibrary: 'shadcn' },
    { name: 'Card', ozTarget: 'Card', sourceLibrary: 'shadcn' },
    { name: 'CardContent', ozTarget: 'Card', sourceLibrary: 'shadcn' },
    { name: 'CardHeader', ozTarget: 'Card', sourceLibrary: 'shadcn' },
    { name: 'CardTitle', ozTarget: 'Card', sourceLibrary: 'shadcn' },
    { name: 'Dialog', ozTarget: 'Dialog', sourceLibrary: 'shadcn' },
    { name: 'DialogContent', ozTarget: 'Dialog', sourceLibrary: 'shadcn' },
    { name: 'DialogTrigger', ozTarget: 'Dialog', sourceLibrary: 'shadcn' },
    { name: 'Tabs', ozTarget: 'Tabs', sourceLibrary: 'shadcn' },
    { name: 'TabsList', ozTarget: 'Tabs', sourceLibrary: 'shadcn' },
    { name: 'TabsTrigger', ozTarget: 'Tabs', sourceLibrary: 'shadcn' },
    { name: 'TabsContent', ozTarget: 'Tabs', sourceLibrary: 'shadcn' },
    { name: 'Select', ozTarget: 'Select', sourceLibrary: 'shadcn' },
    { name: 'SelectTrigger', ozTarget: 'Select', sourceLibrary: 'shadcn' },
    { name: 'SelectContent', ozTarget: 'Select', sourceLibrary: 'shadcn' },
    { name: 'SelectItem', ozTarget: 'Select', sourceLibrary: 'shadcn' },
    { name: 'Alert', ozTarget: 'Alert', sourceLibrary: 'shadcn' },
    { name: 'AlertTitle', ozTarget: 'Alert', sourceLibrary: 'shadcn' },
    { name: 'AlertDescription', ozTarget: 'Alert', sourceLibrary: 'shadcn' },
    { name: 'Checkbox', ozTarget: 'Checkbox', sourceLibrary: 'shadcn' },
    { name: 'Input', ozTarget: 'Input', sourceLibrary: 'shadcn' },
    { name: 'Tooltip', ozTarget: 'Tooltip', sourceLibrary: 'shadcn' },
    // HTML fallback elements from LegacyForm.tsx
    { name: 'Button', ozTarget: 'Button', sourceLibrary: 'html-elements' },
    { name: 'Input', ozTarget: 'Input', sourceLibrary: 'html-elements' },
    { name: 'Textarea', ozTarget: 'Textarea', sourceLibrary: 'html-elements' },
    { name: 'Select', ozTarget: 'Select', sourceLibrary: 'html-elements' },
    { name: 'Label', ozTarget: 'Label', sourceLibrary: 'html-elements' },
  ];

  // Deduplicate by (name, ozTarget) tuple since the evaluator compares these
  const tupleSet = new Set<string>();
  const deduped: GeneratedComponent[] = [];
  for (const c of expected) {
    const key = `${c.name}::${c.ozTarget}`;
    if (!tupleSet.has(key)) {
      tupleSet.add(key);
      deduped.push(c);
    }
  }

  writeJson(path.join(EXPECTED_DIR, `${FIXTURE_NAME}.json`), {
    fixture: FIXTURE_NAME,
    description:
      'Auto-generated adversarial fixture. Uses real OZ component names but ' +
      'imports through randomized path aliases, unusual directory structures, ' +
      'and non-standard file names. Tests that detection strategies are ' +
      'structurally generic rather than path/package-name-dependent.',
    _generatedAt: new Date().toISOString(),
    _seed: seed,
    _structuralContext: {
      scope,
      uiPackage: uiPkgName,
      pathAlias: '~/',
      uiDir: uiRelativeDir,
    },
    components: deduped,
  });

  updateDetectionFixturesConfig();

  console.error(`\u2713 Generated adversarial fixture at fixtures/${FIXTURE_NAME}/`);
  console.error(`  Scope: ${scope}`);
  console.error(`  UI package: ${uiPkgName}`);
  console.error(`  Path alias: ~/  UI dir: ${uiRelativeDir}`);
  console.error(`  Expected: ${deduped.length} unique (name, ozTarget) tuples`);
}

// -----------------------------------------------------------------------
// File writing helpers
// -----------------------------------------------------------------------

function rmrf(dir: string): void {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function mkdirp(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFile(filePath: string, lines: string[]): void {
  fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf8');
}

function writeJson(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function writeUiComponent(filePath: string, name: string): void {
  writeFile(filePath, [
    "import React from 'react';",
    '',
    `export function ${name}({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) {`,
    '  return <div {...props}>{children}</div>;',
    '}',
  ]);
}

function writeUiCompoundComponent(filePath: string, family: string, compounds: string[]): void {
  const lines = ["import React from 'react';", ''];

  lines.push(
    `export function ${family}({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) {`,
    '  return <div {...props}>{children}</div>;',
    '}',
    '',
  );

  for (const comp of compounds) {
    lines.push(
      `export function ${comp}({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) {`,
      '  return <div {...props}>{children}</div>;',
      '}',
      '',
    );
  }

  writeFile(filePath, lines);
}

function updateDetectionFixturesConfig(): void {
  const configPath = path.join(__dir, 'config', 'detection-fixtures.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  const existingIdx = config.fixtures.findIndex(
    (f: { name: string }) => f.name === FIXTURE_NAME
  );

  const entry = {
    name: FIXTURE_NAME,
    split: 'adversarial',
    tags: ['synthetic', 'adversarial', 'randomized-context', 'shadcn', 'html-fallback'],
  };

  if (existingIdx >= 0) {
    config.fixtures[existingIdx] = entry;
  } else {
    config.fixtures.push(entry);
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
}

// -----------------------------------------------------------------------
// Entry
// -----------------------------------------------------------------------

generate();
