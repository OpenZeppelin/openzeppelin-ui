/**
 * @vitest-environment node
 *
 * SF-3 · Package boundary — INV-11.
 * Built-bundle checks read dist/ only (SF-4 precedent). Packed ESM/CJS proof uses
 * npm pack + local tar extract + symlinks into the workspace pnpm store — no registry
 * round-trip and no npm install subprocess.
 */
import { execSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../');
const WORKSPACE_NODE_MODULES = join(PACKAGE_ROOT, 'node_modules');
const RUST_SOURCE = 'fn main() { let x: u32 = 1; }';
const HIGHLIGHTER_MARKERS = [
  /\bCodeView\b/,
  /\bcreateLowlight\b/,
  /\blowlight\b/,
  /highlight\.js/,
  /\bhljs-keyword\b/,
];

const PACKED_RUNTIME_DEPS = [
  'react',
  'react-dom',
  'highlight.js',
  'lowlight',
  '@openzeppelin/ui-utils',
  '@openzeppelin/ui-types',
] as const;

const tempDirs: string[] = [];
let tarballPath = '';
let installablePackageDir = '';

function run(command: string, cwd: string): string {
  return execSync(command, { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function workspaceDependencyPath(packageName: string): string {
  const source = join(WORKSPACE_NODE_MODULES, packageName);
  if (!existsSync(source)) {
    throw new Error(
      `Missing workspace dependency ${packageName} under ${WORKSPACE_NODE_MODULES}; run pnpm install at the monorepo root`
    );
  }
  return source;
}

function linkWorkspaceDependency(consumerNodeModules: string, packageName: string): void {
  const destination = join(consumerNodeModules, packageName);
  mkdirSync(dirname(destination), { recursive: true });
  if (existsSync(destination)) {
    return;
  }
  symlinkSync(workspaceDependencyPath(packageName), destination, 'junction');
}

function linkPackedConsumerDependencies(packageDir: string): void {
  const consumerNodeModules = join(packageDir, 'node_modules');
  mkdirSync(consumerNodeModules, { recursive: true });
  for (const packageName of PACKED_RUNTIME_DEPS) {
    linkWorkspaceDependency(consumerNodeModules, packageName);
  }
}

function extractPackedPackage(tarball: string): string {
  const extractRoot = mkdtempSync(join(tmpdir(), 'code-view-packed-'));
  tempDirs.push(extractRoot);
  run(`tar -xzf "${tarball}" -C "${extractRoot}"`, extractRoot);
  const packageDir = join(extractRoot, 'package');
  linkPackedConsumerDependencies(packageDir);
  return packageDir;
}

function readExportConditionPath(packageDir: string, condition: 'import' | 'require'): string {
  const pkg = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf-8')) as {
    exports: Record<string, { import?: string; require?: string }>;
  };
  const subpath = pkg.exports['./code-view'];
  const relative = subpath[condition];
  if (!relative) {
    throw new Error(`Missing ${condition} export for ./code-view`);
  }
  return join(packageDir, relative.replace(/^\.\//, ''));
}

function expectHighlightedRustMarkup(markup: string): void {
  expect(markup, 'packed CodeView must render highlighted Rust tokens').toContain('hljs-keyword');
  expect(markup, 'packed CodeView must render Rust function tokens').toContain(
    'hljs-title function_'
  );
  expect(markup, 'packed CodeView must render Rust keyword tokens').toContain('let</span>');
}

describe('INV-11: built main entry never ships the highlighter', () => {
  it.each(['index.mjs', 'index.cjs'] as const)(
    'dist/%s excludes CodeView, lowlight, highlight.js, and hljs token strings',
    (fileName) => {
      const bundle = readFileSync(join(PACKAGE_ROOT, 'dist', fileName), 'utf-8');
      for (const marker of HIGHLIGHTER_MARKERS) {
        expect(bundle, `main bundle ${fileName} must stay free of ${marker}`).not.toMatch(marker);
      }
    }
  );

  it('does not export CodeView from the built main declaration file', () => {
    const mainTypes = readFileSync(join(PACKAGE_ROOT, 'dist/index.d.mts'), 'utf-8');
    expect(mainTypes).not.toMatch(/\bCodeView\b/);
  });

  it('resolves matching declaration files for import and require conditions', () => {
    const importTypes = readFileSync(join(PACKAGE_ROOT, 'dist/code-view.d.mts'), 'utf-8');
    const requireTypes = readFileSync(join(PACKAGE_ROOT, 'dist/code-view.d.cts'), 'utf-8');
    for (const types of [importTypes, requireTypes]) {
      expect(types).toContain('CodeView');
      expect(types).toContain('CodeViewLanguage');
      expect(types).toContain('CodeViewProps');
      expect(types).not.toContain('HighlightResult');
      expect(types).not.toContain('Root');
    }
  });
});

describe('INV-11: packed tarball resolves both export conditions', () => {
  beforeAll(() => {
    const packJson = run('npm pack --json', PACKAGE_ROOT);
    const parsed = JSON.parse(packJson) as Array<{ filename: string }>;
    tarballPath = join(PACKAGE_ROOT, parsed[0]?.filename ?? '');
    if (!tarballPath.endsWith('.tgz')) {
      throw new Error(`Unexpected npm pack output: ${packJson.slice(0, 200)}`);
    }
    tempDirs.push(tarballPath);
    installablePackageDir = extractPackedPackage(tarballPath);
  }, 60_000);

  afterAll(() => {
    for (const entry of tempDirs) {
      if (entry.endsWith('.tgz')) {
        rmSync(entry, { force: true });
        continue;
      }
      rmSync(entry, { recursive: true, force: true });
    }
  });

  it('renders highlighted Rust through the packed ESM export condition', () => {
    const esmEntry = readExportConditionPath(installablePackageDir, 'import');
    writeFileSync(
      join(installablePackageDir, 'consumer.mjs'),
      `import { writeFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CodeView } from ${JSON.stringify(esmEntry)};

const markup = renderToStaticMarkup(
  React.createElement(CodeView, { source: ${JSON.stringify(RUST_SOURCE)}, language: 'rust' })
);
writeFileSync('consumer-output.html', markup);
`
    );
    run('node consumer.mjs', installablePackageDir);
    const markup = readFileSync(join(installablePackageDir, 'consumer-output.html'), 'utf-8');
    expectHighlightedRustMarkup(markup);
  });

  it('renders highlighted Rust through the packed CommonJS export condition without ERR_REQUIRE_ESM', () => {
    const cjsEntry = readExportConditionPath(installablePackageDir, 'require');
    writeFileSync(
      join(installablePackageDir, 'consumer.cjs'),
      `const { writeFileSync } = require('node:fs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { CodeView } = require(${JSON.stringify(cjsEntry)});

const markup = renderToStaticMarkup(
  React.createElement(CodeView, { source: ${JSON.stringify(RUST_SOURCE)}, language: 'rust' })
);
writeFileSync('consumer-output.html', markup);
`
    );
    run('node consumer.cjs', installablePackageDir);
    const markup = readFileSync(join(installablePackageDir, 'consumer-output.html'), 'utf-8');
    expectHighlightedRustMarkup(markup);
  });
});
