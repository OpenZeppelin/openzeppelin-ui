import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DIST_DIR = join(PACKAGE_ROOT, 'dist');
const SRC_DIR = join(PACKAGE_ROOT, 'src');

const REBUILD_HINT = 'run `pnpm --filter @openzeppelin/ui-components build` and re-run this suite';

function newestSourceMtimeMs(directory: string): number {
  let newest = 0;

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '__tests__' || entry.name === 'node_modules') {
      continue;
    }

    const entryPath = join(directory, entry.name);
    newest = Math.max(
      newest,
      entry.isDirectory() ? newestSourceMtimeMs(entryPath) : statSync(entryPath).mtimeMs
    );
  }

  return newest;
}

/**
 * Read a built artifact, refusing to assert against one that predates the
 * sources it was built from.
 *
 * Boundary suites check the shipped bundle rather than source, so without this
 * a stale `dist/` lets them pass while describing a build nobody has made since
 * the source changed.
 */
export function readDistArtifact(fileName: string): string {
  const artifactPath = join(DIST_DIR, fileName);

  let artifactMtimeMs: number;
  try {
    artifactMtimeMs = statSync(artifactPath).mtimeMs;
  } catch {
    throw new Error(`dist/${fileName} is missing — ${REBUILD_HINT}`);
  }

  const newestSourceMs = newestSourceMtimeMs(SRC_DIR);
  if (artifactMtimeMs < newestSourceMs) {
    throw new Error(
      `dist/${fileName} is older than src/ (built ${new Date(artifactMtimeMs).toISOString()}, ` +
        `newest source ${new Date(newestSourceMs).toISOString()}) — ${REBUILD_HINT}`
    );
  }

  return readFileSync(artifactPath, 'utf-8');
}

export { DIST_DIR, PACKAGE_ROOT };
