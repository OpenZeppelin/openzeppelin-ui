#!/usr/bin/env npx tsx
/**
 * Fetches external fixtures defined in fixtures/_external.json.
 *
 * Resolution order per fixture:
 *   1. Already in fixtures/<name>/ → skip
 *   2. Env var FIXTURE_<NAME>_PATH → symlink
 *   3. Sibling repo next to monorepo root → symlink
 *   4. Remote repo → sparse clone at pinned commit
 *
 * Usage:
 *   npx tsx autoresearch/fetch-fixtures.ts           # fetch all missing
 *   npx tsx autoresearch/fetch-fixtures.ts --status   # show resolution status
 *   npx tsx autoresearch/fetch-fixtures.ts --clean    # remove fetched/linked external fixtures
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const MANIFEST_PATH = path.join(FIXTURES_DIR, '_external.json');

interface ExternalFixture {
  name: string;
  repo: string;
  commit: string;
  siblingRepo: string;
  subPath?: string;
  sparsePaths?: string[];
  description?: string;
}

interface Manifest {
  fixtures: ExternalFixture[];
}

function loadManifest(): Manifest {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
}

function findMonorepoRoot(): string {
  try {
    return execSync('git rev-parse --show-toplevel', { cwd: __dirname, encoding: 'utf8' }).trim();
  } catch {
    return path.resolve(__dirname, '..', '..', '..');
  }
}

function envVarName(fixtureName: string): string {
  return `FIXTURE_${fixtureName.replace(/-/g, '_').toUpperCase()}_PATH`;
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

type FixtureStatus = 'in-tree' | 'env-override' | 'sibling-available' | 'needs-fetch' | 'linked';

function getStatus(fixture: ExternalFixture): { status: FixtureStatus; resolvedPath?: string } {
  const inTree = path.join(FIXTURES_DIR, fixture.name);

  if (fs.existsSync(inTree)) {
    const stat = fs.lstatSync(inTree);
    if (stat.isSymbolicLink()) {
      return { status: 'linked', resolvedPath: fs.realpathSync(inTree) };
    }
    return { status: 'in-tree', resolvedPath: inTree };
  }

  const envPath = process.env[envVarName(fixture.name)];
  if (envPath && isPopulatedDir(envPath)) {
    return { status: 'env-override', resolvedPath: envPath };
  }

  const monorepoRoot = findMonorepoRoot();
  const parentDir = path.dirname(monorepoRoot);
  const grandparentDir = path.dirname(parentDir);

  for (const searchDir of [parentDir, grandparentDir]) {
    const siblingRoot = path.join(searchDir, fixture.siblingRepo);
    const candidate = fixture.subPath ? path.join(siblingRoot, fixture.subPath) : siblingRoot;
    if (isPopulatedDir(candidate)) {
      return { status: 'sibling-available', resolvedPath: candidate };
    }
  }

  return { status: 'needs-fetch' };
}

function showStatus(manifest: Manifest): void {
  const monorepoRoot = findMonorepoRoot();
  console.log(`Monorepo root: ${monorepoRoot}`);
  console.log(`Sibling search: ${path.dirname(monorepoRoot)}/\n`);
  console.log('External fixture status:\n');
  for (const fixture of manifest.fixtures) {
    const { status, resolvedPath } = getStatus(fixture);
    const icon =
      status === 'in-tree' || status === 'linked'
        ? '✓'
        : status === 'sibling-available' || status === 'env-override'
          ? '~'
          : '✗';
    const suffix = resolvedPath ? ` → ${resolvedPath}` : '';
    const envHint = status === 'needs-fetch' ? ` (or set ${envVarName(fixture.name)})` : '';
    console.log(`  ${icon} ${fixture.name} [${status}]${suffix}${envHint}`);
  }
  console.log();
}

function linkFromLocal(fixture: ExternalFixture, localPath: string): void {
  const target = path.join(FIXTURES_DIR, fixture.name);
  console.log(`  Linking ${fixture.name} → ${localPath}`);
  fs.symlinkSync(localPath, target, 'dir');
}

function fetchFromRemote(fixture: ExternalFixture): void {
  const target = path.join(FIXTURES_DIR, fixture.name);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `fixture-fetch-${fixture.name}-`));

  try {
    console.log(`  Cloning ${fixture.repo} @ ${fixture.commit.slice(0, 8)}...`);

    execSync(`git clone --no-checkout --filter=blob:none ${fixture.repo} ${tmpDir}/repo`, {
      stdio: 'pipe',
    });

    execSync(`git checkout ${fixture.commit}`, { cwd: `${tmpDir}/repo`, stdio: 'pipe' });

    if (fixture.subPath) {
      const sourceRoot = path.join(tmpDir, 'repo', fixture.subPath);
      if (fs.existsSync(sourceRoot)) {
        copyDirSync(sourceRoot, target);
      } else {
        copyDirSync(path.join(tmpDir, 'repo'), target);
      }
    } else {
      copyDirSync(path.join(tmpDir, 'repo'), target);
    }

    console.log(`  Fetched ${fixture.name} (${fixture.commit.slice(0, 8)})`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function copyDirSync(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function cleanExternal(manifest: Manifest): void {
  for (const fixture of manifest.fixtures) {
    const target = path.join(FIXTURES_DIR, fixture.name);
    if (fs.existsSync(target)) {
      const stat = fs.lstatSync(target);
      if (stat.isSymbolicLink()) {
        console.log(`  Removing symlink: ${fixture.name}`);
        fs.unlinkSync(target);
      } else {
        console.log(`  Removing directory: ${fixture.name}`);
        fs.rmSync(target, { recursive: true, force: true });
      }
    }
  }
}

function fetchAll(manifest: Manifest): void {
  let resolved = 0;
  let skipped = 0;

  for (const fixture of manifest.fixtures) {
    const { status, resolvedPath } = getStatus(fixture);

    if (status === 'in-tree' || status === 'linked') {
      console.log(`  ✓ ${fixture.name} already available`);
      skipped++;
      continue;
    }

    if ((status === 'sibling-available' || status === 'env-override') && resolvedPath) {
      linkFromLocal(fixture, resolvedPath);
      resolved++;
      continue;
    }

    try {
      fetchFromRemote(fixture);
      resolved++;
    } catch (err) {
      console.error(`  ✗ Failed to fetch ${fixture.name}: ${err}`);
    }
  }

  console.log(`\nDone: ${resolved} resolved, ${skipped} already available`);
}

const args = process.argv.slice(2);
const manifest = loadManifest();

if (args.includes('--status')) {
  showStatus(manifest);
} else if (args.includes('--clean')) {
  cleanExternal(manifest);
} else {
  console.log('Resolving external fixtures...\n');
  fetchAll(manifest);
}
