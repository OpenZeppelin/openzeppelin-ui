#!/usr/bin/env npx tsx
/**
 * Materializes external fixtures defined in fixtures/_external.json as pinned,
 * deterministic snapshots under resolved-fixtures/<name>/.
 *
 * Resolution order per fixture:
 *   1. Existing snapshot with matching commit → skip
 *   2. Local git source (env override or sibling repo) → clone locally, checkout pinned commit, copy snapshot
 *   3. Remote repo → clone remotely, checkout pinned commit, copy snapshot
 *
 * Usage:
 *   npx tsx autoresearch/fetch-fixtures.ts            # materialize all external fixtures
 *   npx tsx autoresearch/fetch-fixtures.ts --status   # show snapshot/live-source status
 *   npx tsx autoresearch/fetch-fixtures.ts --clean    # remove materialized external fixtures
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getFixtureLockfilePath,
  readFixtureLockfile,
  RESOLVED_FIXTURES_DIR,
  type ExternalFixture,
  type FixtureLockfile,
} from './capabilities/fixture-resolver.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const MANIFEST_PATH = path.join(FIXTURES_DIR, '_external.json');

interface Manifest {
  fixtures: ExternalFixture[];
}

interface LocalGitSource {
  repoRoot: string;
  subPath?: string;
  source: FixtureLockfile['source'];
}

type FixtureStatus =
  | 'snapshot'
  | 'snapshot-stale'
  | 'legacy-live-link'
  | 'local-source-available'
  | 'needs-fetch';

function loadManifest(): Manifest {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
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

function findGitRepoRoot(candidatePath: string): string | null {
  try {
    return execSync('git rev-parse --show-toplevel', {
      cwd: candidatePath,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function deriveSubPath(repoRoot: string, requestedPath: string, manifestSubPath?: string): string | undefined {
  if (manifestSubPath) return manifestSubPath;

  const relativeSubPath = path.relative(repoRoot, fs.realpathSync(requestedPath));
  if (!relativeSubPath || relativeSubPath === '.') return undefined;
  return relativeSubPath;
}

function getLocalGitSource(fixture: ExternalFixture): LocalGitSource | null {
  const envPath = process.env[envVarName(fixture.name)];
  if (envPath && isPopulatedDir(envPath)) {
    const repoRoot = findGitRepoRoot(envPath);
    if (repoRoot) {
      return {
        repoRoot,
        subPath: deriveSubPath(repoRoot, envPath, fixture.subPath),
        source: 'local-env-git',
      };
    }
  }

  const monorepoRoot = findMonorepoRoot();
  const parentDir = path.dirname(monorepoRoot);
  const grandparentDir = path.dirname(parentDir);

  for (const searchDir of [parentDir, grandparentDir]) {
    const siblingRoot = path.join(searchDir, fixture.siblingRepo);
    const candidate = fixture.subPath ? path.join(siblingRoot, fixture.subPath) : siblingRoot;
    if (!isPopulatedDir(candidate)) continue;

    const repoRoot = findGitRepoRoot(siblingRoot);
    if (!repoRoot) continue;

    return {
      repoRoot,
      subPath: fixture.subPath,
      source: 'local-sibling-git',
    };
  }

  return null;
}

function isCurrentSnapshot(fixture: ExternalFixture): boolean {
  const target = path.join(RESOLVED_FIXTURES_DIR, fixture.name);
  if (!isPopulatedDir(target)) return false;
  if (fs.lstatSync(target).isSymbolicLink()) return false;

  const lockfile = readFixtureLockfile(target);
  return lockfile?.fixture === fixture.name && lockfile.commit === fixture.commit;
}

function getStatus(fixture: ExternalFixture): { status: FixtureStatus; resolvedPath?: string } {
  const target = path.join(RESOLVED_FIXTURES_DIR, fixture.name);
  if (fs.existsSync(target)) {
    if (isCurrentSnapshot(fixture)) {
      return { status: 'snapshot', resolvedPath: target };
    }

    if (isPopulatedDir(target)) {
      return { status: 'snapshot-stale', resolvedPath: target };
    }
  }

  const legacyLink = path.join(FIXTURES_DIR, fixture.name);
  if (fs.existsSync(legacyLink) && fs.lstatSync(legacyLink).isSymbolicLink()) {
    return { status: 'legacy-live-link', resolvedPath: fs.realpathSync(legacyLink) };
  }

  const localSource = getLocalGitSource(fixture);
  if (localSource) {
    return { status: 'local-source-available', resolvedPath: localSource.repoRoot };
  }

  return { status: 'needs-fetch' };
}

function removeTarget(target: string): void {
  if (!fs.existsSync(target)) return;

  const stat = fs.lstatSync(target);
  if (stat.isSymbolicLink()) {
    fs.unlinkSync(target);
    return;
  }

  fs.rmSync(target, { recursive: true, force: true });
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

function writeLockfile(target: string, fixture: ExternalFixture, source: FixtureLockfile['source']): void {
  const lockfile: FixtureLockfile = {
    version: 1,
    fixture: fixture.name,
    repo: fixture.repo,
    commit: fixture.commit,
    subPath: fixture.subPath,
    source,
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(getFixtureLockfilePath(target), JSON.stringify(lockfile, null, 2) + '\n');
}

function materializeFromGitSource(
  fixture: ExternalFixture,
  repoSource: string,
  source: FixtureLockfile['source'],
  subPath?: string
): void {
  const target = path.join(RESOLVED_FIXTURES_DIR, fixture.name);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `fixture-fetch-${fixture.name}-`));
  const repoDir = path.join(tmpDir, 'repo');

  try {
    console.log(`  Materializing ${fixture.name} @ ${fixture.commit.slice(0, 8)} from ${repoSource}`);
    execSync(`git clone --no-checkout --filter=blob:none "${repoSource}" "${repoDir}"`, {
      stdio: 'pipe',
    });
    execSync(`git checkout ${fixture.commit}`, { cwd: repoDir, stdio: 'pipe' });

    const sourceRoot = subPath ? path.join(repoDir, subPath) : repoDir;
    if (!fs.existsSync(sourceRoot)) {
      throw new Error(`Snapshot path does not exist at commit ${fixture.commit}: ${subPath}`);
    }

    removeTarget(target);
    copyDirSync(sourceRoot, target);
    writeLockfile(target, fixture, source);
    console.log(`  Snapshot ready: ${fixture.name}`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function fetchFromRemote(fixture: ExternalFixture): void {
  materializeFromGitSource(fixture, fixture.repo, 'remote-clone', fixture.subPath);
}

function materializeFromLocalGit(fixture: ExternalFixture, localSource: LocalGitSource): void {
  materializeFromGitSource(
    fixture,
    localSource.repoRoot,
    localSource.source,
    localSource.subPath
  );
}

function showStatus(manifest: Manifest): void {
  const monorepoRoot = findMonorepoRoot();
  console.log(`Monorepo root: ${monorepoRoot}`);
  console.log(`Sibling search: ${path.dirname(monorepoRoot)}/\n`);
  console.log('External fixture status:\n');

  for (const fixture of manifest.fixtures) {
    const { status, resolvedPath } = getStatus(fixture);
    const icon =
      status === 'snapshot'
        ? '✓'
        : status === 'local-source-available'
          ? '~'
          : status === 'snapshot-stale' || status === 'legacy-live-link'
            ? '!'
            : '✗';
    const suffix = resolvedPath ? ` → ${resolvedPath}` : '';
    const envHint = status === 'needs-fetch' ? ` (or set ${envVarName(fixture.name)})` : '';
    console.log(`  ${icon} ${fixture.name} [${status}]${suffix}${envHint}`);
  }

  console.log();
}

function cleanExternal(manifest: Manifest): void {
  for (const fixture of manifest.fixtures) {
    const target = path.join(RESOLVED_FIXTURES_DIR, fixture.name);
    if (!fs.existsSync(target)) continue;

    console.log(`  Removing ${fixture.name}`);
    removeTarget(target);
  }
}

function fetchAll(manifest: Manifest): void {
  let resolved = 0;
  let skipped = 0;

  for (const fixture of manifest.fixtures) {
    if (isCurrentSnapshot(fixture)) {
      console.log(`  ✓ ${fixture.name} snapshot already current`);
      skipped++;
      continue;
    }

    const localSource = getLocalGitSource(fixture);
    try {
      if (localSource) {
        materializeFromLocalGit(fixture, localSource);
      } else {
        fetchFromRemote(fixture);
      }
      resolved++;
    } catch (error) {
      if (localSource) {
        console.warn(`  ! Local snapshot failed for ${fixture.name}, falling back to remote: ${error}`);
        try {
          fetchFromRemote(fixture);
          resolved++;
          continue;
        } catch (remoteError) {
          console.error(`  ✗ Failed to fetch ${fixture.name}: ${remoteError}`);
        }
      } else {
        console.error(`  ✗ Failed to fetch ${fixture.name}: ${error}`);
      }
    }
  }

  console.log(`\nDone: ${resolved} materialized, ${skipped} already current`);
}

const args = process.argv.slice(2);
const manifest = loadManifest();

if (args.includes('--status')) {
  showStatus(manifest);
} else if (args.includes('--clean')) {
  cleanExternal(manifest);
} else {
  console.log('Materializing external fixture snapshots...\n');
  fetchAll(manifest);
}
