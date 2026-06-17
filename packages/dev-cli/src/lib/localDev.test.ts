import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  clearProjectNodeModules,
  collectWorkspacePackageDirs,
  extractManifestPackages,
  extractPackedFilename,
  resolvePackedFilename,
} from './localDev';

describe('resolvePackedFilename', () => {
  it('keeps absolute pnpm pack filenames unchanged', () => {
    const destinationDir = '/tmp/packed';
    const absoluteFilename = '/tmp/packed/openzeppelin-ui-components-1.4.0.tgz';

    expect(resolvePackedFilename(destinationDir, absoluteFilename)).toBe(absoluteFilename);
  });

  it('joins relative pnpm pack filenames to the destination directory', () => {
    const destinationDir = '/tmp/packed';
    const relativeFilename = 'openzeppelin-ui-components-1.4.0.tgz';

    expect(resolvePackedFilename(destinationDir, relativeFilename)).toBe(
      path.join(destinationDir, relativeFilename)
    );
  });
});

describe('extractPackedFilename', () => {
  it('reads the filename from object-shaped pnpm output', () => {
    expect(extractPackedFilename(JSON.stringify({ filename: 'package.tgz' }))).toBe('package.tgz');
  });

  it('reads the filename from array-shaped pnpm output', () => {
    expect(extractPackedFilename(JSON.stringify([{ filename: 'package.tgz' }]))).toBe(
      'package.tgz'
    );
  });

  it('returns null when no filename is present', () => {
    expect(extractPackedFilename(JSON.stringify([{ path: 'package.tgz' }]))).toBeNull();
  });
});

describe('extractManifestPackages', () => {
  it('returns validated package paths from a well-formed manifest', () => {
    expect(
      extractManifestPackages(
        JSON.stringify({
          packages: {
            '@openzeppelin/ui-components': '/tmp/ui-components.tgz',
          },
        })
      )
    ).toEqual({
      '@openzeppelin/ui-components': '/tmp/ui-components.tgz',
    });
  });

  it('returns null when manifest packages are malformed', () => {
    expect(
      extractManifestPackages(
        JSON.stringify({
          packages: {
            '@openzeppelin/ui-components': 123,
          },
        })
      )
    ).toBeNull();
  });
});

describe('collectWorkspacePackageDirs', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const tempRoot of tempRoots.splice(0)) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('expands workspace globs to package directories', () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'oz-ui-dev-workspace-'));
    tempRoots.push(projectRoot);

    fs.mkdirSync(path.join(projectRoot, 'apps', 'builder'), { recursive: true });
    fs.writeFileSync(
      path.join(projectRoot, 'apps', 'builder', 'package.json'),
      JSON.stringify({ name: 'builder-app' })
    );
    fs.mkdirSync(path.join(projectRoot, 'packages', 'shared'), { recursive: true });
    fs.writeFileSync(
      path.join(projectRoot, 'packages', 'shared', 'package.json'),
      JSON.stringify({ name: 'shared' })
    );
    fs.writeFileSync(
      path.join(projectRoot, 'pnpm-workspace.yaml'),
      `packages:\n  - 'apps/*'\n  - 'packages/*'\n`
    );

    expect(collectWorkspacePackageDirs(projectRoot).sort()).toEqual(
      [
        path.join(projectRoot, 'apps', 'builder'),
        path.join(projectRoot, 'packages', 'shared'),
      ].sort()
    );
  });
});

describe('clearProjectNodeModules', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const tempRoot of tempRoots.splice(0)) {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('removes root and workspace package node_modules directories', () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'oz-ui-dev-clear-'));
    tempRoots.push(projectRoot);

    const appRoot = path.join(projectRoot, 'apps', 'builder');
    fs.mkdirSync(appRoot, { recursive: true });
    fs.writeFileSync(path.join(appRoot, 'package.json'), JSON.stringify({ name: 'builder-app' }));
    fs.writeFileSync(path.join(projectRoot, 'pnpm-workspace.yaml'), `packages:\n  - 'apps/*'\n`);

    const rootNodeModules = path.join(projectRoot, 'node_modules');
    const appNodeModules = path.join(appRoot, 'node_modules');
    fs.mkdirSync(rootNodeModules);
    fs.mkdirSync(appNodeModules);

    const removed = clearProjectNodeModules(projectRoot);

    expect(removed.sort()).toEqual([appNodeModules, rootNodeModules].sort());
    expect(fs.existsSync(rootNodeModules)).toBe(false);
    expect(fs.existsSync(appNodeModules)).toBe(false);
  });
});
