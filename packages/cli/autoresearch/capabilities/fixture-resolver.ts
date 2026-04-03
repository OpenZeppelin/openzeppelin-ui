/**
 * Resolves fixture paths from multiple sources:
 *   1. Committed synthetic fixtures in fixtures/ (radix-app, shadcn-app, etc.)
 *   2. External fixtures resolved from sibling repos or fetched from remote
 *
 * Resolution order for external fixtures:
 *   a. Already present in fixtures/<name>/ (previously fetched/linked)
 *   b. Env var FIXTURE_<NAME>_PATH (explicit override)
 *   c. Sibling repo next to the monorepo root (convention-based)
 *   d. Not resolved — run `fetch-fixtures.ts` to fetch from remote
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __resolverDir = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__resolverDir, '..', 'fixtures');

interface ExternalFixture {
  name: string;
  repo: string;
  commit: string;
  siblingRepo: string;
  subPath?: string;
  sparsePaths?: string[];
  description?: string;
}

interface ExternalManifest {
  fixtures: ExternalFixture[];
}

const MANIFEST_PATH = path.join(FIXTURES_DIR, '_external.json');

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

/**
 * Resolve the on-disk path for a single external fixture.
 * Tries: in-tree → env var → sibling repo convention (parent + grandparent).
 */
function resolveExternalFixture(fixture: ExternalFixture): string | null {
  const inTree = path.join(FIXTURES_DIR, fixture.name);
  if (isPopulatedDir(inTree)) return inTree;

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
  source: 'synthetic' | 'external-local' | 'external-fetched';
}

/**
 * Discover all available fixtures — both synthetic (committed) and external (resolved).
 */
export function discoverAllFixtures(): ResolvedFixture[] {
  const resolved: ResolvedFixture[] = [];
  const manifest = loadManifest();
  const externalByName = new Map(manifest.fixtures.map((f) => [f.name, f]));

  if (fs.existsSync(FIXTURES_DIR)) {
    for (const entry of fs.readdirSync(FIXTURES_DIR, { withFileTypes: true })) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
      if (entry.name.startsWith('_')) continue;

      if (externalByName.has(entry.name)) {
        resolved.push({ name: entry.name, path: path.join(FIXTURES_DIR, entry.name), source: 'external-fetched' });
      } else {
        resolved.push({ name: entry.name, path: path.join(FIXTURES_DIR, entry.name), source: 'synthetic' });
      }
    }
  }

  for (const ext of manifest.fixtures) {
    if (resolved.some((r) => r.name === ext.name)) continue;

    const resolvedPath = resolveExternalFixture(ext);
    if (resolvedPath) {
      resolved.push({ name: ext.name, path: resolvedPath, source: 'external-local' });
    }
  }

  return resolved.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Resolve the absolute path for a specific fixture by name.
 */
export function resolveFixturePath(name: string): string | null {
  const inTree = path.join(FIXTURES_DIR, name);
  if (isPopulatedDir(inTree)) return inTree;

  const manifest = loadManifest();
  const ext = manifest.fixtures.find((f) => f.name === name);
  if (ext) return resolveExternalFixture(ext);

  return null;
}

/**
 * List external fixtures that are not yet available on disk.
 */
export function listMissingExternalFixtures(): ExternalFixture[] {
  const manifest = loadManifest();
  return manifest.fixtures.filter((f) => resolveExternalFixture(f) === null);
}

export { type ExternalFixture, type ExternalManifest };
