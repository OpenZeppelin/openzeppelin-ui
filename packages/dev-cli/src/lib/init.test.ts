import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { initProject } from './init';
import { getCliDependencyRange } from './packageInfo';

function createProjectRoot(): string {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'oz-ui-dev-init-'));
  fs.writeFileSync(
    path.join(projectRoot, 'package.json'),
    JSON.stringify(
      {
        name: 'consumer-app',
        private: true,
        scripts: {},
      },
      null,
      2
    )
  );
  return projectRoot;
}

describe('initProject', () => {
  const expectedCliDependencyRange = getCliDependencyRange();

  it('writes managed config, pnpmfile, and scripts for ui plus adapters', () => {
    const projectRoot = createProjectRoot();

    const result = initProject({
      projectRoot,
      families: ['ui', 'adapters'],
      uiPath: '../openzeppelin-ui',
      adaptersPath: '../openzeppelin-adapters',
    });

    const config = fs.readFileSync(path.join(projectRoot, '.openzeppelin-dev.json'), 'utf8');
    const pnpmfile = fs.readFileSync(path.join(projectRoot, '.pnpmfile.cjs'), 'utf8');
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')
    ) as {
      scripts: Record<string, string>;
      devDependencies: Record<string, string>;
    };

    expect(result.updatedScripts).toEqual([
      'dev:local',
      'dev:uikit:local',
      'dev:adapters:local',
      'dev:npm',
    ]);
    expect(config).toContain('"ui"');
    expect(config).toContain('"adapters"');
    expect(pnpmfile).toContain('.openzeppelin-dev.json');
    expect(pnpmfile).toContain('const families = Object.create(null);');
    expect(pnpmfile).toContain(
      'Object.prototype.hasOwnProperty.call(STANDARD_FAMILIES, familyKey)'
    );
    expect(pnpmfile).toContain('function resolveCacheDir(workspaceRoot, cacheDir)');
    expect(pnpmfile).toContain('function getRealPath(targetPath)');
    expect(pnpmfile).toContain('function findWorkspacePackage(repoRoot, packageName)');
    expect(pnpmfile).toContain(
      'function resolvePackageDirectoryByName(workspaceRoot, family, packageName)'
    );
    expect(pnpmfile).toContain('(workspace fallback)');
    expect(pnpmfile).toContain('function allowAdapterPrereleases(pkg)');
    expect(pnpmfile).toContain('allowAdapterPrereleases(pkg)');
    expect(packageJson.devDependencies['@openzeppelin/ui-dev-cli']).toBe(
      expectedCliDependencyRange
    );
    expect(packageJson.scripts['dev:local']).toContain('oz-ui-dev use local');
    expect(packageJson.scripts['dev:local']).toContain('--family ui --family adapters');
    expect(packageJson.scripts['dev:npm']).toContain('use remote');
  });

  it('does not overwrite unrelated existing scripts', () => {
    const projectRoot = createProjectRoot();
    const packageJsonPath = path.join(projectRoot, 'package.json');
    fs.writeFileSync(
      packageJsonPath,
      JSON.stringify(
        {
          name: 'consumer-app',
          private: true,
          scripts: {
            'dev:local': 'custom-command',
          },
        },
        null,
        2
      )
    );

    const result = initProject({
      projectRoot,
      families: ['ui'],
      uiPath: '../openzeppelin-ui',
      adaptersPath: '../openzeppelin-adapters',
    });

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
      scripts: Record<string, string>;
      devDependencies: Record<string, string>;
    };

    expect(result.keptScripts).toContain('dev:local');
    expect(packageJson.scripts['dev:local']).toBe('custom-command');
    expect(packageJson.devDependencies['@openzeppelin/ui-dev-cli']).toBe(
      expectedCliDependencyRange
    );
    expect(packageJson.scripts['dev:npm']).toContain('oz-ui-dev use remote');
    expect(packageJson.scripts['dev:npm']).toContain('use remote');
  });

  it('quotes generated local path defaults for shell-safe scripts', () => {
    const projectRoot = createProjectRoot();

    initProject({
      projectRoot,
      families: ['ui', 'adapters'],
      uiPath: '../Open Zeppelin/openzeppelin-ui$dev',
      adaptersPath: '../Open Zeppelin/openzeppelin-adapters`local`',
    });

    const packageJson = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')
    ) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts['dev:local']).toContain(
      'LOCAL_UI_PATH="${LOCAL_UI_PATH:-../Open Zeppelin/openzeppelin-ui\\$dev}"'
    );
    expect(packageJson.scripts['dev:local']).toContain(
      'LOCAL_ADAPTERS_PATH="${LOCAL_ADAPTERS_PATH:-../Open Zeppelin/openzeppelin-adapters\\`local\\`}"'
    );
  });

  it('fails before writing files when an unmanaged pnpmfile already exists', () => {
    const projectRoot = createProjectRoot();
    fs.writeFileSync(path.join(projectRoot, '.pnpmfile.cjs'), 'module.exports = {};');

    expect(() =>
      initProject({
        projectRoot,
        families: ['ui'],
        uiPath: '../openzeppelin-ui',
        adaptersPath: '../openzeppelin-adapters',
      })
    ).toThrow(/not managed by the shared local-dev flow/i);

    expect(fs.existsSync(path.join(projectRoot, '.openzeppelin-dev.json'))).toBe(false);
    expect(fs.readFileSync(path.join(projectRoot, '.pnpmfile.cjs'), 'utf8')).toBe(
      'module.exports = {};'
    );
  });

  it('replaces legacy setup-local-dev scripts with oz-ui-dev commands', () => {
    const projectRoot = createProjectRoot();
    const packageJsonPath = path.join(projectRoot, 'package.json');
    fs.writeFileSync(
      packageJsonPath,
      JSON.stringify(
        {
          name: 'consumer-app',
          private: true,
          scripts: {
            'dev:local': 'LOCAL_UI=true pnpm install --force',
            'dev:npm': 'pnpm install --force',
          },
        },
        null,
        2
      )
    );

    const result = initProject({
      projectRoot,
      families: ['ui'],
      uiPath: '../openzeppelin-ui',
      adaptersPath: '../openzeppelin-adapters',
    });

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(result.updatedScripts).toContain('dev:local');
    expect(result.updatedScripts).toContain('dev:npm');
    expect(packageJson.scripts['dev:local']).toContain('oz-ui-dev use local');
    expect(packageJson.scripts['dev:npm']).toContain('oz-ui-dev use remote');
  });
});
