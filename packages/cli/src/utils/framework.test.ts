import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { buildInstallCommand, detectFramework, detectPackageManager } from './framework';

const temporaryDirectories: string[] = [];

function createTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oz-cli-framework-'));
  temporaryDirectories.push(dir);
  return dir;
}

function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

afterEach(() => {
  for (const dir of temporaryDirectories.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('detectFramework', () => {
  it('detects Vite from vite.config.ts', () => {
    const dir = createTempDir();
    writeJson(path.join(dir, 'package.json'), { name: 'test' });
    fs.writeFileSync(path.join(dir, 'vite.config.ts'), 'export default {}');

    expect(detectFramework(dir)).toBe('vite');
  });

  it('detects Vite from vite dependency', () => {
    const dir = createTempDir();
    writeJson(path.join(dir, 'package.json'), {
      name: 'test',
      devDependencies: { vite: '^7.0.0' },
    });

    expect(detectFramework(dir)).toBe('vite');
  });

  it('detects Next.js from next.config.js', () => {
    const dir = createTempDir();
    writeJson(path.join(dir, 'package.json'), { name: 'test' });
    fs.writeFileSync(path.join(dir, 'next.config.js'), 'module.exports = {}');

    expect(detectFramework(dir)).toBe('next');
  });

  it('detects CRA from react-scripts', () => {
    const dir = createTempDir();
    writeJson(path.join(dir, 'package.json'), {
      name: 'test',
      dependencies: { 'react-scripts': '^5.0.0' },
    });

    expect(detectFramework(dir)).toBe('cra');
  });

  it('returns unknown when no framework detected', () => {
    const dir = createTempDir();
    writeJson(path.join(dir, 'package.json'), { name: 'test' });

    expect(detectFramework(dir)).toBe('unknown');
  });

  it('returns unknown when no package.json', () => {
    const dir = createTempDir();
    expect(detectFramework(dir)).toBe('unknown');
  });
});

describe('detectPackageManager', () => {
  it('detects pnpm from lock file', () => {
    const dir = createTempDir();
    fs.writeFileSync(path.join(dir, 'pnpm-lock.yaml'), '');

    expect(detectPackageManager(dir)).toBe('pnpm');
  });

  it('detects yarn from lock file', () => {
    const dir = createTempDir();
    fs.writeFileSync(path.join(dir, 'yarn.lock'), '');

    expect(detectPackageManager(dir)).toBe('yarn');
  });

  it('defaults to npm', () => {
    const dir = createTempDir();
    expect(detectPackageManager(dir)).toBe('npm');
  });
});

describe('buildInstallCommand', () => {
  it('generates pnpm add command', () => {
    expect(buildInstallCommand('pnpm', ['react', 'react-dom'])).toBe('pnpm add react react-dom');
  });

  it('generates npm install command', () => {
    expect(buildInstallCommand('npm', ['react'])).toBe('npm install react');
  });

  it('generates yarn add command', () => {
    expect(buildInstallCommand('yarn', ['react'])).toBe('yarn add react');
  });
});
