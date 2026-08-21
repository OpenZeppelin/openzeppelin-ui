import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  checkAdapterPeers,
  collectAdapterScopeDirs,
  collectOverriddenPeers,
  collectPeerDeclaringManifests,
  compareSemver,
  minimumVersionOf,
} from './adapterPeers';

const tempRoots: string[] = [];

afterEach(() => {
  for (const tempRoot of tempRoots.splice(0)) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

function createProjectRoot(): string {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'oz-ui-dev-peers-'));
  tempRoots.push(projectRoot);
  return projectRoot;
}

function writeJson(filePath: string, contents: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(contents, null, 2));
}

/** Declares a workspace package and its `@openzeppelin/ui-*` ranges. */
function writeManifest(
  projectRoot: string,
  packageDir: string,
  dependencies: Record<string, string> = {}
): void {
  writeJson(path.join(projectRoot, packageDir, 'package.json'), {
    name: packageDir === '' ? 'project-root' : path.basename(packageDir),
    dependencies,
  });
}

/**
 * Installs a package into `<owner>/node_modules/@openzeppelin/<name>`, where an empty
 * owner is the project root. Mirrors how pnpm places a package's dependencies next to it.
 */
function install(
  projectRoot: string,
  owner: string,
  name: string,
  manifest: Record<string, unknown>
): void {
  writeJson(
    path.join(projectRoot, owner, 'node_modules', '@openzeppelin', name, 'package.json'),
    manifest
  );
}

function installAdapter(
  projectRoot: string,
  owner: string,
  name: string,
  peerDependencies: Record<string, string>
): void {
  install(projectRoot, owner, name, { name: `@openzeppelin/${name}`, peerDependencies });
}

function installPeer(projectRoot: string, owner: string, name: string, version: string): void {
  install(projectRoot, owner, name, { name: `@openzeppelin/${name}`, version });
}

describe('minimumVersionOf', () => {
  it('reads the lowest admitted version from common range syntaxes', () => {
    expect(minimumVersionOf('^3.5.0')).toBe('3.5.0');
    expect(minimumVersionOf('~3.5.0')).toBe('3.5.0');
    expect(minimumVersionOf('>=3.5.0')).toBe('3.5.0');
    expect(minimumVersionOf('3.5.0')).toBe('3.5.0');
  });

  it('returns null for ranges with no concrete version', () => {
    expect(minimumVersionOf('*')).toBeNull();
    expect(minimumVersionOf('workspace:*')).toBeNull();
  });
});

describe('compareSemver', () => {
  it('orders versions by numeric segment', () => {
    expect(compareSemver('3.5.1', '3.5.0')).toBeGreaterThan(0);
    expect(compareSemver('3.3.0', '3.5.0')).toBeLessThan(0);
    expect(compareSemver('4.0.0', '3.9.9')).toBeGreaterThan(0);
    expect(compareSemver('3.5.0', '3.5.0')).toBe(0);
  });

  it('strips prerelease suffixes like validatePeerVersions does', () => {
    expect(compareSemver('3.5.0-beta.1', '3.5.0')).toBe(0);
  });
});

describe('collectAdapterScopeDirs', () => {
  it('finds the root scope directory when dependencies are hoisted to the repo root', () => {
    const projectRoot = createProjectRoot();
    installPeer(projectRoot, '', 'ui-types', '3.5.1');

    expect(collectAdapterScopeDirs(projectRoot)).toEqual([
      path.join(projectRoot, 'node_modules', '@openzeppelin'),
    ]);
  });

  it('finds workspace package scope directories declared in pnpm-workspace.yaml', () => {
    const projectRoot = createProjectRoot();
    writeManifest(projectRoot, 'apps/builder');
    fs.writeFileSync(path.join(projectRoot, 'pnpm-workspace.yaml'), `packages:\n  - 'apps/*'\n`);
    installPeer(projectRoot, 'apps/builder', 'ui-types', '3.5.1');

    expect(collectAdapterScopeDirs(projectRoot)).toEqual([
      path.join(projectRoot, 'apps', 'builder', 'node_modules', '@openzeppelin'),
    ]);
  });
});

describe('collectPeerDeclaringManifests', () => {
  it('names the root and workspace package.json files that declare the given peers', () => {
    const projectRoot = createProjectRoot();
    writeManifest(projectRoot, '', { '@openzeppelin/ui-types': '^3.5.0' });
    writeManifest(projectRoot, 'apps/builder', { '@openzeppelin/ui-utils': '^4.0.0' });
    writeManifest(projectRoot, 'packages/unrelated', { lodash: '^4.0.0' });
    fs.writeFileSync(
      path.join(projectRoot, 'pnpm-workspace.yaml'),
      `packages:\n  - 'apps/*'\n  - 'packages/*'\n`
    );

    expect(
      collectPeerDeclaringManifests(projectRoot, [
        '@openzeppelin/ui-types',
        '@openzeppelin/ui-utils',
      ]).sort()
    ).toEqual([path.join('apps', 'builder', 'package.json'), 'package.json']);
  });

  it('ignores manifests that only declare a peer outside the requested set', () => {
    const projectRoot = createProjectRoot();
    writeManifest(projectRoot, '', { '@openzeppelin/ui-utils': '^4.0.0' });

    expect(collectPeerDeclaringManifests(projectRoot, ['@openzeppelin/ui-types'])).toEqual([]);
  });

  it('returns nothing when no peers are requested', () => {
    const projectRoot = createProjectRoot();
    writeManifest(projectRoot, '', { '@openzeppelin/ui-types': '^3.5.0' });

    expect(collectPeerDeclaringManifests(projectRoot, [])).toEqual([]);
  });
});

describe('collectOverriddenPeers', () => {
  it('reads ui-* keys from the overrides block only', () => {
    const projectRoot = createProjectRoot();
    fs.writeFileSync(
      path.join(projectRoot, 'pnpm-workspace.yaml'),
      [
        'packages:',
        "  - 'apps/*'",
        'overrides:',
        "  '@openzeppelin/ui-types': 3.5.1",
        "  '@openzeppelin/ui-utils': 4.0.0",
        '  react-hook-form: 7.79.0',
        'allowBuilds:',
        "  '@openzeppelin/adapter-stellar': true",
        '',
      ].join('\n')
    );

    expect(collectOverriddenPeers(projectRoot)).toEqual([
      '@openzeppelin/ui-types',
      '@openzeppelin/ui-utils',
    ]);
  });

  it('returns nothing when the repository has no overrides', () => {
    const projectRoot = createProjectRoot();
    fs.writeFileSync(path.join(projectRoot, 'pnpm-workspace.yaml'), `packages:\n  - 'apps/*'\n`);

    expect(collectOverriddenPeers(projectRoot)).toEqual([]);
  });
});

describe('checkAdapterPeers', () => {
  describe('dependencies hoisted to the repository root', () => {
    it('passes when every installed peer meets the declared minimum', () => {
      const projectRoot = createProjectRoot();
      writeManifest(projectRoot, '', { '@openzeppelin/ui-types': '^3.5.0' });
      installAdapter(projectRoot, '', 'adapter-evm', {
        '@openzeppelin/ui-types': '^3.5.0',
        '@openzeppelin/ui-utils': '^4.0.0',
      });
      installPeer(projectRoot, '', 'ui-types', '3.5.1');
      installPeer(projectRoot, '', 'ui-utils', '4.0.0');

      const result = checkAdapterPeers(projectRoot);

      expect(result.ok).toBe(true);
      expect(result.issues).toEqual([]);
      expect(result.pairs).toHaveLength(2);
      expect(result.remediation).toEqual([]);
    });

    it('fails when an installed ui-* package is older than an adapter requires', () => {
      const projectRoot = createProjectRoot();
      writeManifest(projectRoot, '', { '@openzeppelin/ui-types': '^3.3.0' });
      installAdapter(projectRoot, '', 'adapter-evm', { '@openzeppelin/ui-types': '^3.5.0' });
      installPeer(projectRoot, '', 'ui-types', '3.3.0');

      const result = checkAdapterPeers(projectRoot);

      expect(result.ok).toBe(false);
      expect(result.issues).toEqual([
        {
          severity: 'error',
          code: 'stale-peer',
          message:
            '@openzeppelin/adapter-evm requires @openzeppelin/ui-types >=3.5.0, but 3.3.0 is installed.',
        },
      ]);
      expect(result.pairs[0].satisfied).toBe(false);
    });

    it('fails on a stale major, which is how the mismatch reaches staging', () => {
      const projectRoot = createProjectRoot();
      installAdapter(projectRoot, '', 'adapter-evm', { '@openzeppelin/ui-utils': '^4.0.0' });
      installPeer(projectRoot, '', 'ui-utils', '3.9.9');

      expect(checkAdapterPeers(projectRoot).ok).toBe(false);
    });

    it('accepts a peer newer than the range, mirroring validatePeerVersions', () => {
      const projectRoot = createProjectRoot();
      installAdapter(projectRoot, '', 'adapter-evm', { '@openzeppelin/ui-utils': '^2.0.0' });
      installPeer(projectRoot, '', 'ui-utils', '4.0.0');

      const result = checkAdapterPeers(projectRoot);

      expect(result.ok).toBe(true);
      expect(result.pairs[0]).toMatchObject({ minimum: '2.0.0', installed: '4.0.0' });
    });

    it('ignores non-@openzeppelin/ui-* peers', () => {
      const projectRoot = createProjectRoot();
      installAdapter(projectRoot, '', 'adapter-evm', {
        '@openzeppelin/ui-types': '^3.5.0',
        react: '^19.0.0',
      });
      installPeer(projectRoot, '', 'ui-types', '3.5.1');

      expect(checkAdapterPeers(projectRoot).pairs).toHaveLength(1);
    });
  });

  describe('dependencies installed under a workspace package', () => {
    function createAppScopedProject(uiTypesVersion: string): string {
      const projectRoot = createProjectRoot();
      writeManifest(projectRoot, 'apps/builder', { '@openzeppelin/ui-types': '^3.5.0' });
      fs.writeFileSync(path.join(projectRoot, 'pnpm-workspace.yaml'), `packages:\n  - 'apps/*'\n`);
      installAdapter(projectRoot, 'apps/builder', 'adapter-evm', {
        '@openzeppelin/ui-types': '^3.5.0',
      });
      installPeer(projectRoot, 'apps/builder', 'ui-types', uiTypesVersion);
      return projectRoot;
    }

    it('passes without a root node_modules directory', () => {
      const projectRoot = createAppScopedProject('3.5.1');

      expect(fs.existsSync(path.join(projectRoot, 'node_modules'))).toBe(false);

      const result = checkAdapterPeers(projectRoot);

      expect(result.ok).toBe(true);
      expect(result.pairs).toHaveLength(1);
      expect(result.scopeDirs).toEqual([
        path.join('apps', 'builder', 'node_modules', '@openzeppelin'),
      ]);
    });

    it('fails on a stale peer installed next to the app', () => {
      const result = checkAdapterPeers(createAppScopedProject('3.3.0'));

      expect(result.ok).toBe(false);
      expect(result.issues[0].code).toBe('stale-peer');
      expect(result.pairs[0].scopeDir).toBe(
        path.join('apps', 'builder', 'node_modules', '@openzeppelin')
      );
    });

    it('resolves a peer hoisted to the root for an adapter installed next to the app', () => {
      const projectRoot = createProjectRoot();
      writeManifest(projectRoot, 'apps/builder');
      fs.writeFileSync(path.join(projectRoot, 'pnpm-workspace.yaml'), `packages:\n  - 'apps/*'\n`);
      installAdapter(projectRoot, 'apps/builder', 'adapter-evm', {
        '@openzeppelin/ui-types': '^3.5.0',
      });
      installPeer(projectRoot, '', 'ui-types', '3.5.1');

      expect(checkAdapterPeers(projectRoot).ok).toBe(true);
    });

    it('fails when one workspace resolved an older peer than another', () => {
      const projectRoot = createProjectRoot();
      writeManifest(projectRoot, 'apps/builder');
      writeManifest(projectRoot, 'apps/legacy');
      fs.writeFileSync(path.join(projectRoot, 'pnpm-workspace.yaml'), `packages:\n  - 'apps/*'\n`);

      for (const app of ['apps/builder', 'apps/legacy']) {
        installAdapter(projectRoot, app, 'adapter-evm', { '@openzeppelin/ui-types': '^3.5.0' });
      }
      installPeer(projectRoot, 'apps/builder', 'ui-types', '3.5.1');
      installPeer(projectRoot, 'apps/legacy', 'ui-types', '3.3.0');

      const result = checkAdapterPeers(projectRoot);

      expect(result.ok).toBe(false);
      expect(result.pairs).toHaveLength(2);
      expect(result.pairs.filter((pair) => !pair.satisfied)).toHaveLength(1);
    });

    it('collapses an adapter linked at both the root and the app to one pair', () => {
      const projectRoot = createProjectRoot();
      writeManifest(projectRoot, 'apps/builder');
      fs.writeFileSync(path.join(projectRoot, 'pnpm-workspace.yaml'), `packages:\n  - 'apps/*'\n`);

      for (const owner of ['', 'apps/builder']) {
        installAdapter(projectRoot, owner, 'adapter-evm', { '@openzeppelin/ui-types': '^3.5.0' });
        installPeer(projectRoot, owner, 'ui-types', '3.5.1');
      }

      const result = checkAdapterPeers(projectRoot);

      expect(result.ok).toBe(true);
      expect(result.pairs).toHaveLength(1);
      expect(result.scopeDirs).toHaveLength(2);
    });
  });

  describe('misconfiguration is reported rather than silently passing', () => {
    it('fails when no @openzeppelin packages are installed at all', () => {
      const projectRoot = createProjectRoot();
      writeManifest(projectRoot, '', { '@openzeppelin/ui-types': '^3.5.0' });

      const result = checkAdapterPeers(projectRoot);

      expect(result.ok).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].code).toBe('no-scope-dirs');
      expect(result.pairs).toEqual([]);
    });

    it('fails when @openzeppelin packages exist but no adapters are installed', () => {
      const projectRoot = createProjectRoot();
      installPeer(projectRoot, '', 'ui-types', '3.5.1');

      const result = checkAdapterPeers(projectRoot);

      expect(result.ok).toBe(false);
      expect(result.issues[0].code).toBe('no-adapters');
    });

    it('fails when adapters are installed but no ui-* peer resolves', () => {
      const projectRoot = createProjectRoot();
      installAdapter(projectRoot, '', 'adapter-evm', { '@openzeppelin/ui-types': '^3.5.0' });

      const result = checkAdapterPeers(projectRoot);

      expect(result.ok).toBe(false);
      expect(result.issues[0].code).toBe('no-peers-resolved');
    });
  });

  describe('remediation guidance', () => {
    function createStaleProject(workspaceYaml: string): string {
      const projectRoot = createProjectRoot();
      writeManifest(projectRoot, '', { '@openzeppelin/ui-types': '^3.3.0' });
      writeManifest(projectRoot, 'apps/builder', { '@openzeppelin/ui-types': '^3.3.0' });
      fs.writeFileSync(path.join(projectRoot, 'pnpm-workspace.yaml'), workspaceYaml);
      installAdapter(projectRoot, '', 'adapter-evm', { '@openzeppelin/ui-types': '^3.5.0' });
      installPeer(projectRoot, '', 'ui-types', '3.3.0');
      return projectRoot;
    }

    it('names the package.json files that declare the ranges', () => {
      const result = checkAdapterPeers(createStaleProject(`packages:\n  - 'apps/*'\n`));
      const guidance = result.remediation.join('\n');

      expect(result.declaringManifests.sort()).toEqual([
        path.join('apps', 'builder', 'package.json'),
        'package.json',
      ]);
      expect(guidance).toContain('package.json');
      expect(guidance).toContain(path.join('apps', 'builder', 'package.json'));
    });

    it('keeps the warning that a caret range alone may not move the install', () => {
      const result = checkAdapterPeers(createStaleProject(`packages:\n  - 'apps/*'\n`));

      expect(result.remediation.join('\n')).toContain('^3.3.0 already permits 3.5.1');
    });

    it('mentions overrides only when the repository actually pins ui-* versions', () => {
      const withoutOverrides = checkAdapterPeers(createStaleProject(`packages:\n  - 'apps/*'\n`));
      expect(withoutOverrides.overriddenPeers).toEqual([]);
      expect(withoutOverrides.remediation.join('\n')).not.toContain('overrides');

      const withOverrides = checkAdapterPeers(
        createStaleProject(
          `packages:\n  - 'apps/*'\noverrides:\n  '@openzeppelin/ui-types': 3.3.0\n`
        )
      );
      expect(withOverrides.overriddenPeers).toEqual(['@openzeppelin/ui-types']);
      expect(withOverrides.remediation.join('\n')).toContain('overrides');
    });

    it('does not name a manifest whose only ui-* dependency is the dev CLI', () => {
      const projectRoot = createProjectRoot();
      // Mirrors ui-builder: the root manifest carries only tooling, the app carries the peers.
      writeManifest(projectRoot, '', { '@openzeppelin/ui-dev-cli': '^1.1.1' });
      writeManifest(projectRoot, 'apps/builder', { '@openzeppelin/ui-types': '^3.3.0' });
      fs.writeFileSync(path.join(projectRoot, 'pnpm-workspace.yaml'), `packages:\n  - 'apps/*'\n`);
      installAdapter(projectRoot, 'apps/builder', 'adapter-evm', {
        '@openzeppelin/ui-types': '^3.5.0',
      });
      installPeer(projectRoot, 'apps/builder', 'ui-types', '3.3.0');

      const result = checkAdapterPeers(projectRoot);

      expect(result.ok).toBe(false);
      expect(result.declaringManifests).toEqual([path.join('apps', 'builder', 'package.json')]);
      expect(result.remediation.join('\n')).not.toContain('ui-dev-cli');
    });

    it('emits no guidance when the check passes', () => {
      const projectRoot = createProjectRoot();
      installAdapter(projectRoot, '', 'adapter-evm', { '@openzeppelin/ui-types': '^3.5.0' });
      installPeer(projectRoot, '', 'ui-types', '3.5.1');

      expect(checkAdapterPeers(projectRoot).remediation).toEqual([]);
    });
  });
});
