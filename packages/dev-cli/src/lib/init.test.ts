import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { initProject } from './init';

function createProjectRoot(): string {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'oz-dev-init-'));
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
    expect(packageJson.devDependencies['@openzeppelin/ui-dev-cli']).toBe('^0.1.0');
    expect(packageJson.scripts['dev:local']).toContain('oz-dev use local');
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
    expect(packageJson.devDependencies['@openzeppelin/ui-dev-cli']).toBe('^0.1.0');
    expect(packageJson.scripts['dev:npm']).toContain('oz-dev use remote');
    expect(packageJson.scripts['dev:npm']).toContain('use remote');
  });
});
