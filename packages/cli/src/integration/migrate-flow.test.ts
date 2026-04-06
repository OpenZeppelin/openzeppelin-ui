import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { analyzeProject } from '../analysis';
import { detectFramework } from '../utils/framework';

const temporaryDirectories: string[] = [];

function createTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oz-cli-integration-'));
  temporaryDirectories.push(dir);
  return dir;
}

function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function writeFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function createFixtureProject(dir: string): void {
  writeJson(path.join(dir, 'package.json'), {
    name: 'fixture-app',
    version: '0.0.0',
    type: 'module',
    dependencies: {
      react: '^19.0.0',
      'react-dom': '^19.0.0',
    },
    devDependencies: {
      vite: '^7.0.0',
      '@tailwindcss/vite': '^4.1.0',
      tailwindcss: '^4.1.0',
    },
  });

  writeFile(path.join(dir, 'vite.config.ts'), 'export default {};');

  writeFile(
    path.join(dir, 'src', 'main.tsx'),
    [
      "import './index.css';",
      "import { App } from './App';",
      '',
      "document.getElementById('root')!.innerHTML = '';",
    ].join('\n')
  );

  writeFile(
    path.join(dir, 'src', 'index.css'),
    ["@import 'tailwindcss' source(none);", "@source './';"].join('\n')
  );

  writeFile(
    path.join(dir, 'src', 'App.tsx'),
    [
      "import { Button } from '@/components/ui/button';",
      "import { Card, CardContent } from '@/components/ui/card';",
      "import { useAccount } from 'wagmi';",
      '',
      'export function App() {',
      '  const { address } = useAccount();',
      '  return (',
      '    <Card>',
      '      <CardContent>',
      '        <Button>Connect</Button>',
      '      </CardContent>',
      '    </Card>',
      '  );',
      '}',
    ].join('\n')
  );

  writeFile(
    path.join(dir, 'src', 'hooks', 'useStorage.ts'),
    ['export function useStorage(key: string) {', '  return localStorage.getItem(key);', '}'].join(
      '\n'
    )
  );
}

afterEach(() => {
  for (const dir of temporaryDirectories.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('integration: fixture project analysis', () => {
  it('detects Vite framework', () => {
    const dir = createTempDir();
    createFixtureProject(dir);

    expect(detectFramework(dir)).toBe('vite');
  });

  it('produces an analysis report with correct structure', () => {
    const dir = createTempDir();
    createFixtureProject(dir);

    const report = analyzeProject(dir);

    expect(report.version).toBe('1.0.0');
    expect(report.framework).toBe('vite');
    expect(report.summary.totalFiles).toBeGreaterThan(0);
    expect(report.projectInfo.root).toBe(dir);
    expect(report.projectInfo.stylingSystem).toBe('tailwind');
    expect(report.componentsByMigration.mappable.length).toBeGreaterThan(0);
    expect(report.wallet.targetSetup).toContain('RuntimeProvider');
    expect(report.storage.currentPatterns.length).toBeGreaterThan(0);
    expect(report.adapters.capabilityTargets).toContain('ExecutionCapability');
    expect(report.tailwindAnalysis.doctor).toEqual(report.tailwind);
  });

  it('detects shadcn-style component imports', () => {
    const dir = createTempDir();
    createFixtureProject(dir);

    const report = analyzeProject(dir);
    const buttonMatch = report.components.find((c) => c.name === 'Button');

    expect(buttonMatch).toBeDefined();
    expect(buttonMatch!.sourceLibrary).toBe('shadcn');
    expect(buttonMatch!.ozTarget).toBe('Button');
  });

  it('detects wagmi wallet pattern', () => {
    const dir = createTempDir();
    createFixtureProject(dir);

    const report = analyzeProject(dir);
    const wagmi = report.patterns.find((p) => p.pattern === 'wagmi');

    expect(wagmi).toBeDefined();
    expect(wagmi!.category).toBe('wallet');
    expect(report.wallet.currentSetup).toContain('wagmi');
  });

  it('detects localStorage pattern', () => {
    const dir = createTempDir();
    createFixtureProject(dir);

    const report = analyzeProject(dir);
    const storage = report.patterns.find((p) => p.pattern === 'localStorage');

    expect(storage).toBeDefined();
    expect(storage!.category).toBe('storage');
    expect(report.storage.affectedFiles).toContain('src/hooks/useStorage.ts');
  });

  it('estimates medium effort due to wallet + storage patterns', () => {
    const dir = createTempDir();
    createFixtureProject(dir);

    const report = analyzeProject(dir);
    expect(report.summary.estimatedEffort).toBe('medium');
  });
});

function createRawHtmlFixture(dir: string): void {
  writeJson(path.join(dir, 'package.json'), {
    name: 'raw-html-fixture',
    version: '0.0.0',
    type: 'module',
    dependencies: { react: '^19.0.0' },
    devDependencies: { vite: '^7.0.0' },
  });

  writeFile(path.join(dir, 'vite.config.ts'), 'export default {};');

  writeFile(
    path.join(dir, 'src', 'App.tsx'),
    [
      "import React, { useState } from 'react';",
      '',
      'export function App() {',
      '  const [val, setVal] = useState("");',
      '  return (',
      '    <form>',
      '      <label htmlFor="name">Name</label>',
      '      <input id="name" type="text" value={val} onChange={e => setVal(e.target.value)} />',
      '      <input type="checkbox" />',
      '      <input type="radio" name="opt" value="a" />',
      '      <select><option>A</option></select>',
      '      <textarea rows={3} />',
      '      <progress value={50} max={100} />',
      '      <dialog open>Modal</dialog>',
      '      <button type="submit">Go</button>',
      '    </form>',
      '  );',
      '}',
    ].join('\n')
  );
}

describe('integration: raw HTML fixture analysis', () => {
  it('detects raw HTML elements as OZ component targets', () => {
    const dir = createTempDir();
    createRawHtmlFixture(dir);

    const report = analyzeProject(dir);
    const names = report.components.map((c) => c.name).sort();

    expect(names).toContain('Button');
    expect(names).toContain('Input');
    expect(names).toContain('Checkbox');
    expect(names).toContain('RadioGroup');
    expect(names).toContain('Select');
    expect(names).toContain('Textarea');
    expect(names).toContain('Label');
    expect(names).toContain('Progress');
    expect(names).toContain('Dialog');
  });

  it('marks all HTML element detections as html-elements source library', () => {
    const dir = createTempDir();
    createRawHtmlFixture(dir);

    const report = analyzeProject(dir);
    const htmlComponents = report.components.filter((c) => c.sourceLibrary === 'html-elements');

    expect(htmlComponents.length).toBeGreaterThanOrEqual(9);
    for (const comp of htmlComponents) {
      expect(comp.ozTarget).not.toBeNull();
    }
  });
});
