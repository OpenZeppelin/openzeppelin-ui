import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { loadProjectConfig } from './config';

function createProject(config: object): string {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'oz-ui-dev-config-'));
  fs.writeFileSync(
    path.join(projectRoot, '.openzeppelin-dev.json'),
    JSON.stringify(config, null, 2)
  );
  return projectRoot;
}

describe('loadProjectConfig', () => {
  it('merges standard family defaults with project overrides', () => {
    const projectRoot = createProject({
      version: 1,
      families: {
        ui: {},
        adapters: {
          defaultPath: '../custom-adapters',
        },
      },
    });

    const config = loadProjectConfig(projectRoot);

    expect(config.families.ui?.defaultPath).toBe('../openzeppelin-ui');
    expect(config.families.adapters?.defaultPath).toBe('../custom-adapters');
    expect(config.families.adapters?.envNames).toEqual(['LOCAL_ADAPTERS_PATH']);
  });

  it('rejects unknown family keys', () => {
    const projectRoot = createProject({
      version: 1,
      families: {
        adapters: {},
        unknown: {},
      },
    });

    expect(() => loadProjectConfig(projectRoot)).toThrow(/unsupported family/i);
  });

  it('rejects unsupported package managers', () => {
    const projectRoot = createProject({
      version: 1,
      packageManager: 'npm',
      families: {
        ui: {},
      },
    });

    expect(() => loadProjectConfig(projectRoot)).toThrow(/supports only "pnpm"/i);
  });

  it('falls back to default env names when configured envNames filter to empty', () => {
    const projectRoot = createProject({
      version: 1,
      families: {
        adapters: {
          envNames: ['', 42, null],
        },
      },
    });

    const config = loadProjectConfig(projectRoot);

    expect(config.families.adapters?.envNames).toEqual(['LOCAL_ADAPTERS_PATH']);
  });

  it('rejects cache directories that escape the project root', () => {
    const projectRoot = createProject({
      version: 1,
      cacheDir: '../outside-cache',
      families: {
        ui: {},
      },
    });

    expect(() => loadProjectConfig(projectRoot)).toThrow(
      /cacheDir.*subdirectory of the project root/i
    );
  });

  it('rejects cache directories that point at the project root itself', () => {
    const projectRoot = createProject({
      version: 1,
      cacheDir: '.',
      families: {
        ui: {},
      },
    });

    expect(() => loadProjectConfig(projectRoot)).toThrow(
      /cacheDir.*subdirectory of the project root/i
    );
  });

  it('falls back to default install args when installArgs is omitted', () => {
    const projectRoot = createProject({
      version: 1,
      families: {
        ui: {},
      },
    });

    const config = loadProjectConfig(projectRoot);

    expect(config.installArgs).toEqual(['install', '--force']);
  });

  it('rejects invalid install args entries', () => {
    const projectRoot = createProject({
      version: 1,
      installArgs: [null],
      families: {
        ui: {},
      },
    });

    expect(() => loadProjectConfig(projectRoot)).toThrow(
      /installArgs.*must all be non-empty strings/i
    );
  });
});
