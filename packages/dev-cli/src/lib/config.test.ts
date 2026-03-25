import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { loadProjectConfig } from './config';

function createProject(config: object): string {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'oz-dev-config-'));
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
});
