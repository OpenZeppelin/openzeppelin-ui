/**
 * Resolves fixture paths from multiple sources:
 *   1. Committed synthetic fixtures in fixtures/ (radix-app, shadcn-app, etc.)
 *   2. Materialized external fixture snapshots in resolved-fixtures/<name>/
 *
 * Live sibling repos are intentionally excluded from default evaluation so
 * benchmark scoring stays deterministic. They remain available as inputs to
 * `fetch-fixtures.ts`, which materializes pinned snapshots on disk.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __resolverDir = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__resolverDir, '..', 'fixtures');
export const RESOLVED_FIXTURES_DIR = path.join(__resolverDir, '..', 'resolved-fixtures');

interface ExternalFixture {
  name: string;
  repo: string;
  commit: string;
  siblingRepo: string;
  subPath?: string;
  sparsePaths?: string[];
  tailwindCssPath?: string;
  description?: string;
}

interface ExternalManifest {
  fixtures: ExternalFixture[];
}

const MANIFEST_PATH = path.join(FIXTURES_DIR, '_external.json');
export const FIXTURE_LOCKFILE_NAME = '.autoresearch-fixture-lock.json';

export interface FixtureLockfile {
  version: 1;
  fixture: string;
  repo: string;
  commit: string;
  subPath?: string;
  source: 'local-env-git' | 'local-sibling-git' | 'remote-clone';
  generatedAt: string;
}

interface ResolveOptions {
  allowLiveFixtures?: boolean;
}

function loadManifest(): ExternalManifest {
  if (!fs.existsSync(MANIFEST_PATH)) return { fixtures: [] };
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as ExternalManifest;
}

function isPopulatedDir(dirPath: string): boolean {
  try {
    const realPath = fs.realpathSync(dirPath);
    const stat = fs.statSync(realPath);
    return stat.isDirectory() && fs.readdirSync(realPath).length > 0;
  } catch {
    return false;
  }
}

function findMonorepoRoot(): string {
  try {
    return execSync('git rev-parse --show-toplevel', { cwd: __resolverDir, encoding: 'utf8' }).trim();
  } catch {
    return path.join(__resolverDir, '..', '..', '..');
  }
}

/**
 * Builds the env var name for a fixture override.
 * e.g. "zama-accounts-ui" → "FIXTURE_ZAMA_ACCOUNTS_UI_PATH"
 */
function envVarName(fixtureName: string): string {
  return `FIXTURE_${fixtureName.replace(/-/g, '_').toUpperCase()}_PATH`;
}

export function getFixtureLockfilePath(fixtureDir: string): string {
  return path.join(fixtureDir, FIXTURE_LOCKFILE_NAME);
}

export function readFixtureLockfile(fixtureDir: string): FixtureLockfile | null {
  const lockfilePath = getFixtureLockfilePath(fixtureDir);
  if (!fs.existsSync(lockfilePath)) return null;

  try {
    return JSON.parse(fs.readFileSync(lockfilePath, 'utf8')) as FixtureLockfile;
  } catch {
    return null;
  }
}

function findLiveExternalFixturePath(fixture: ExternalFixture): string | null {
  const envPath = process.env[envVarName(fixture.name)];
  if (envPath && isPopulatedDir(envPath)) return envPath;

  const monorepoRoot = findMonorepoRoot();
  const parentDir = path.dirname(monorepoRoot);
  const grandparentDir = path.dirname(parentDir);

  for (const searchDir of [parentDir, grandparentDir]) {
    const siblingRoot = path.join(searchDir, fixture.siblingRepo);
    const candidate = fixture.subPath ? path.join(siblingRoot, fixture.subPath) : siblingRoot;
    if (isPopulatedDir(candidate)) return candidate;
  }

  return null;
}

export interface ResolvedFixture {
  name: string;
  path: string;
  source: 'synthetic' | 'external-snapshot' | 'external-live';
  manifest?: ExternalFixture;
  lockfile?: FixtureLockfile | null;
}

function resolveSyntheticFixture(name: string): ResolvedFixture | null {
  const fixturePath = path.join(FIXTURES_DIR, name);
  if (!isPopulatedDir(fixturePath)) return null;
  if (fs.lstatSync(fixturePath).isSymbolicLink()) return null;

  return {
    name,
    path: fixturePath,
    source: 'synthetic',
    lockfile: null,
  };
}

function resolveExternalFixture(
  fixture: ExternalFixture,
  options: ResolveOptions = {}
): ResolvedFixture | null {
  const inTree = path.join(RESOLVED_FIXTURES_DIR, fixture.name);
  if (isPopulatedDir(inTree) && !fs.lstatSync(inTree).isSymbolicLink()) {
    const lockfile = readFixtureLockfile(inTree);
    if (lockfile?.fixture === fixture.name) {
      return {
        name: fixture.name,
        path: inTree,
        source: 'external-snapshot',
        manifest: fixture,
        lockfile,
      };
    }
  }

  if (!options.allowLiveFixtures) return null;

  const livePath = findLiveExternalFixturePath(fixture);
  if (!livePath) return null;

  return {
    name: fixture.name,
    path: livePath,
    source: 'external-live',
    manifest: fixture,
    lockfile: null,
  };
}

/**
 * Discover all available fixtures — both synthetic (committed) and external (resolved).
 */
export function discoverAllFixtures(options: ResolveOptions = {}): ResolvedFixture[] {
  const resolved: ResolvedFixture[] = [];
  const manifest = loadManifest();

  if (fs.existsSync(FIXTURES_DIR)) {
    for (const entry of fs.readdirSync(FIXTURES_DIR, { withFileTypes: true })) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
      if (entry.name.startsWith('_')) continue;

      const externalFixture = manifest.fixtures.find((fixture) => fixture.name === entry.name);
      if (externalFixture) {
        const snapshot = resolveExternalFixture(externalFixture, options);
        if (snapshot) resolved.push(snapshot);
        continue;
      }

      const synthetic = resolveSyntheticFixture(entry.name);
      if (synthetic) resolved.push(synthetic);
    }
  }

  if (fs.existsSync(RESOLVED_FIXTURES_DIR)) {
    for (const entry of fs.readdirSync(RESOLVED_FIXTURES_DIR, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('_')) continue;

      const externalFixture = manifest.fixtures.find((fixture) => fixture.name === entry.name);
      if (!externalFixture) continue;

      const snapshot = resolveExternalFixture(externalFixture, options);
      if (snapshot && !resolved.some((fixture) => fixture.name === snapshot.name)) {
        resolved.push(snapshot);
      }
    }
  }

  for (const ext of manifest.fixtures) {
    if (resolved.some((r) => r.name === ext.name)) continue;

    const fixture = resolveExternalFixture(ext, options);
    if (fixture) resolved.push(fixture);
  }

  return resolved.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Resolve the absolute path for a specific fixture by name.
 */
export function resolveFixture(
  name: string,
  options: ResolveOptions = {}
): ResolvedFixture | null {
  const manifest = loadManifest();
  const ext = manifest.fixtures.find((f) => f.name === name);
  if (ext) return resolveExternalFixture(ext, options);

  const synthetic = resolveSyntheticFixture(name);
  if (synthetic) return synthetic;

  return null;
}

export function resolveFixturePath(name: string, options: ResolveOptions = {}): string | null {
  return resolveFixture(name, options)?.path ?? null;
}

/**
 * List external fixtures that are not yet available on disk.
 */
export function listMissingExternalFixtures(): ExternalFixture[] {
  const manifest = loadManifest();
  return manifest.fixtures.filter((fixture) => resolveExternalFixture(fixture) === null);
}

/** Manifest entry for an external fixture, if `name` is defined in `_external.json`. */
export function getExternalFixtureDefinition(name: string): ExternalFixture | undefined {
  const manifest = loadManifest();
  return manifest.fixtures.find((f) => f.name === name);
}

export { type ExternalFixture, type ExternalManifest };
