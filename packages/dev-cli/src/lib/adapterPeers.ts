import fs from 'node:fs';
import path from 'node:path';

import { collectWorkspacePackageDirs } from './localDev';

/**
 * Static guard for the one adapter/peer mismatch that no build step catches.
 *
 * `@openzeppelin/adapter-*` packages declare peerDependencies on `@openzeppelin/ui-*`
 * and enforce them only at runtime: each adapter calls `validatePeerVersions()` from
 * `@openzeppelin/ui-utils` while building an ecosystem runtime, and throws
 *
 *   [@openzeppelin/adapter-evm] Incompatible @openzeppelin/ui-types version.
 *     Installed: 3.3.0
 *     Required:  >=3.5.0
 *
 * Nothing before that point notices. Typecheck passes (the types are compatible),
 * unit tests pass (they never construct a real runtime), the app builds, and lint is
 * indifferent -- the failure surfaces only in a browser, where the network runtime is
 * marked failed and never retried, leaving the UI spinning. That is how bumping the
 * adapters to a new major while leaving the `ui-*` pins behind reaches staging.
 *
 * Error semantics deliberately mirror `validatePeerVersions`. Each adapter bakes its
 * peer minimums at build time as `range.replace(/^\^/, '')`, so the runtime compares
 * against the *minimum* the range admits, not the range itself: `ui-utils` 4.0.0
 * against a declared `^2.0.0` passes, because the adapter only asks for `>=2.0.0`.
 * Enforcing the caret strictly as an error here would report failures the adapters do
 * not have.
 *
 * That floor-only comparison leaves the opposite drift invisible, which is its own
 * defect: an adapter declaring `^2.0.0` against an installed 4.0.1 satisfies its own
 * runtime check and still cannot be installed by anything on the current major, because
 * a package manager reads the declared range and not the baked minimum. Nothing warned
 * about that, so it survived two majors. Such pairs are reported as warnings -- named,
 * but not fatal, so an existing `check-peers` in CI keeps its exit code.
 */

const ADAPTER_PREFIX = 'adapter-';
const PEER_SCOPE_PREFIX = '@openzeppelin/ui-';
const SCOPE_DIR_SEGMENTS = ['node_modules', '@openzeppelin'] as const;
const MANIFEST_DEPENDENCY_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies'] as const;

/** One resolved adapter/peer comparison. */
export interface AdapterPeerPair {
  /** Adapter that declares the peer, e.g. `@openzeppelin/adapter-evm`. */
  adapter: string;
  /** Peer being checked, e.g. `@openzeppelin/ui-types`. */
  peer: string;
  /** Range as the adapter declares it, e.g. `^3.5.0`. */
  range: string;
  /** Lowest peer version the declared range admits, e.g. `3.5.0`. */
  minimum: string;
  /** Peer version actually installed and therefore loaded at runtime. */
  installed: string;
  satisfied: boolean;
  /**
   * Whether the declared range itself admits the installed version, as a package
   * manager reads it. `null` when the range syntax is not one this module models, so
   * an unrecognised range is never reported as drift.
   */
  rangeSatisfied: boolean | null;
  /** Scope directory the adapter was found in, relative to the project root. */
  scopeDir: string;
}

export interface AdapterPeerIssue {
  severity: 'error' | 'warning';
  code: 'stale-peer' | 'outdated-range' | 'no-scope-dirs' | 'no-adapters' | 'no-peers-resolved';
  message: string;
}

export interface AdapterPeerResult {
  ok: boolean;
  projectRoot: string;
  /** Scanned `node_modules/@openzeppelin` directories, relative to the project root. */
  scopeDirs: string[];
  /** Workspace package.json files declaring `@openzeppelin/ui-*` ranges, project-relative. */
  declaringManifests: string[];
  /** `@openzeppelin/ui-*` keys pinned by pnpm-workspace.yaml overrides, if any. */
  overriddenPeers: string[];
  pairs: AdapterPeerPair[];
  issues: AdapterPeerIssue[];
  /** Actionable guidance for the issues above; travels with the result so `--json` keeps it. */
  remediation: string[];
}

/**
 * Lists the `node_modules/@openzeppelin` directories a project can load packages from.
 *
 * Composed the same way as `clearProjectNodeModules`: the project root plus every
 * workspace package root that `pnpm-workspace.yaml` declares. pnpm installs a
 * package's dependencies next to that package, so an app's copies are not necessarily
 * hoisted to the root -- and with `shamefullyHoist` they may exist in both places at
 * different versions.
 */
export function collectAdapterScopeDirs(projectRoot: string): string[] {
  const candidates = [
    path.join(projectRoot, ...SCOPE_DIR_SEGMENTS),
    ...collectWorkspacePackageDirs(projectRoot).map((packageDir) =>
      path.join(packageDir, ...SCOPE_DIR_SEGMENTS)
    ),
  ];

  return candidates.filter((candidate) => fs.existsSync(candidate));
}

interface ScopedManifest {
  version?: string;
  peerDependencies?: Record<string, string>;
}

function readScopedManifest(scopeDir: string, packageName: string): ScopedManifest | null {
  const manifestPath = path.join(scopeDir, packageName, 'package.json');
  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as ScopedManifest;
  } catch {
    return null;
  }
}

/**
 * Names of installed `adapter-*` packages in a scope directory.
 *
 * pnpm links packages in as symlinks, so `isDirectory()` is false -- match on name.
 */
function listInstalledAdapters(scopeDir: string): string[] {
  return fs
    .readdirSync(scopeDir)
    .filter((entry) => entry.startsWith(ADAPTER_PREFIX))
    .sort();
}

/**
 * Resolves the peer version an adapter in `scopeDir` would load, preferring the
 * adapter's own scope directory and falling back to the remaining ones in order.
 */
function resolveInstalledPeerVersion(
  peerName: string,
  scopeDir: string,
  scopeDirs: string[]
): string | null {
  const unscopedName = peerName.slice('@openzeppelin/'.length);
  const searchOrder = [scopeDir, ...scopeDirs.filter((dir) => dir !== scopeDir)];

  for (const dir of searchOrder) {
    const version = readScopedManifest(dir, unscopedName)?.version;
    if (version) {
      return version;
    }
  }

  return null;
}

/**
 * Lowest version a range admits: `^3.5.0`, `~3.5.0`, `>=3.5.0` and `3.5.0` all give `3.5.0`.
 */
export function minimumVersionOf(range: string): string | null {
  return /(\d+)\.(\d+)\.(\d+)/.exec(range)?.[0] ?? null;
}

/**
 * Three-segment comparison with prereleases stripped, matching `validatePeerVersions`.
 */
export function compareSemver(a: string, b: string): number {
  const left = a.replace(/-.+$/, '').split('.').map(Number);
  const right = b.replace(/-.+$/, '').split('.').map(Number);

  for (let index = 0; index < 3; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) {
      return difference;
    }
  }

  return 0;
}

/** Parsed `major.minor.patch`, prerelease stripped. */
function segmentsOf(version: string): [number, number, number] | null {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version.replace(/^[vV]/, ''));
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

/**
 * Whether one comparator admits `version`, or `null` for syntax this module does not
 * model. Covers what the adapters and the kit actually declare: `^`, `~`, exact pins,
 * the four inequalities, and the any-version wildcards.
 */
function comparatorAdmits(comparator: string, version: string): boolean | null {
  const trimmed = comparator.trim();
  if (trimmed === '' || trimmed === '*' || trimmed === 'x') {
    return true;
  }

  const installed = segmentsOf(version);
  if (!installed) {
    return null;
  }

  const match = /^(\^|~|>=|<=|>|<|=)?\s*(\d+\.\d+\.\d+[^\s]*)$/.exec(trimmed);
  if (!match) {
    return null;
  }

  const bound = segmentsOf(match[2]);
  if (!bound) {
    return null;
  }

  const order = compareSemver(version, match[2]);

  switch (match[1]) {
    case '^':
      // npm's caret pins the leftmost non-zero segment: ^0.5.x stays on 0.5, ^0.0.3
      // admits only 0.0.3.
      if (order < 0) {
        return false;
      }
      if (bound[0] !== 0) {
        return installed[0] === bound[0];
      }
      if (bound[1] !== 0) {
        return installed[0] === 0 && installed[1] === bound[1];
      }
      return order === 0;
    case '~':
      return order >= 0 && installed[0] === bound[0] && installed[1] === bound[1];
    case '>=':
      return order >= 0;
    case '<=':
      return order <= 0;
    case '>':
      return order > 0;
    case '<':
      return order < 0;
    default:
      return order === 0;
  }
}

/**
 * Whether the declared range admits `version` the way a package manager reads it,
 * or `null` when the range is not modelled here.
 *
 * Unlike `minimumVersionOf`, this respects the range's upper bound, which is what
 * decides whether an install succeeds. Only `||` unions and single comparators are
 * understood; a range this returns `null` for is left unreported rather than guessed at.
 */
export function rangeAdmits(range: string, version: string): boolean | null {
  const alternatives = range.split('||');
  let admitted = false;

  for (const alternative of alternatives) {
    const verdict = comparatorAdmits(alternative, version);
    if (verdict === null) {
      return null;
    }
    admitted = admitted || verdict;
  }

  return admitted;
}

/**
 * Project-relative package.json paths that declare a range for one of `peerNames`.
 *
 * These are the files a maintainer has to edit, so the failure message names them
 * instead of guessing at a layout. `peerNames` is the set of peers the installed
 * adapters actually declare, not everything under `@openzeppelin/ui-*`: a repository
 * whose root manifest only depends on `@openzeppelin/ui-dev-cli` declares no adapter
 * peer, and naming it would send maintainers to the wrong file.
 */
export function collectPeerDeclaringManifests(
  projectRoot: string,
  peerNames: Iterable<string>
): string[] {
  const peers = new Set(peerNames);
  if (peers.size === 0) {
    return [];
  }

  const manifestPaths = [
    path.join(projectRoot, 'package.json'),
    ...collectWorkspacePackageDirs(projectRoot).map((packageDir) =>
      path.join(packageDir, 'package.json')
    ),
  ];

  return manifestPaths
    .filter((manifestPath) => declaresAnyPeer(manifestPath, peers))
    .map((manifestPath) => path.relative(projectRoot, manifestPath));
}

function declaresAnyPeer(manifestPath: string, peers: Set<string>): boolean {
  if (!fs.existsSync(manifestPath)) {
    return false;
  }

  let manifest: Record<string, unknown>;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;
  } catch {
    return false;
  }

  return MANIFEST_DEPENDENCY_FIELDS.some((field) => {
    const dependencies = manifest[field];
    if (!dependencies || typeof dependencies !== 'object') {
      return false;
    }

    return Object.keys(dependencies).some((name) => peers.has(name));
  });
}

/**
 * `@openzeppelin/ui-*` keys pinned by the pnpm-workspace.yaml `overrides` block.
 *
 * Overrides pin exact versions and force declared ranges back down, so raising a
 * package.json range without raising the override achieves nothing. Detected rather
 * than assumed: repositories without overrides should not be told to edit them.
 */
export function collectOverriddenPeers(projectRoot: string): string[] {
  const workspacePath = path.join(projectRoot, 'pnpm-workspace.yaml');
  if (!fs.existsSync(workspacePath)) {
    return [];
  }

  const overridden: string[] = [];
  let insideOverrides = false;

  for (const line of fs.readFileSync(workspacePath, 'utf8').split('\n')) {
    if (/^overrides:\s*$/.test(line)) {
      insideOverrides = true;
      continue;
    }

    // The block ends at the next line that is neither indented nor blank.
    if (insideOverrides && line.trim() !== '' && !/^\s/.test(line)) {
      insideOverrides = false;
      continue;
    }

    if (!insideOverrides) {
      continue;
    }

    const key = /^\s+['"]?(@openzeppelin\/ui-[^'":\s]+)['"]?\s*:/.exec(line)?.[1];
    if (key) {
      overridden.push(key);
    }
  }

  return overridden;
}

function buildRemediation(declaringManifests: string[], overriddenPeers: string[]): string[] {
  const lines = [
    'The adapters throw on this at runtime, not at build time, so the app compiles and',
    'tests cleanly and then fails in the browser with the network runtime stuck failed.',
    '',
    'Fix: raise the @openzeppelin/ui-* ranges in the package.json files that declare them,',
    'then reinstall so the lockfile resolves the newer versions.',
  ];

  if (declaringManifests.length > 0) {
    lines.push('', 'Declared in:');
    for (const manifest of declaringManifests) {
      lines.push(`  - ${manifest}`);
    }
  }

  lines.push(
    '',
    'Note a caret range alone may not move the install: ^3.3.0 already permits 3.5.1, so a',
    'stale lockfile entry stays stale until it is re-resolved.'
  );

  if (overriddenPeers.length > 0) {
    lines.push(
      '',
      'pnpm-workspace.yaml also pins these via overrides. Raise them too -- they pin exact',
      'versions and would otherwise force the declared ranges straight back down:'
    );
    for (const peer of overriddenPeers) {
      lines.push(`  - ${peer}`);
    }
  }

  return lines;
}

function buildOutdatedRangeRemediation(
  outdatedRangePairs: AdapterPeerPair[],
  declaringManifests: string[]
): string[] {
  const lines = [
    '',
    'These declared ranges are behind the versions installed beside them. The adapters',
    'run fine here because their runtime check only enforces the range minimum, so this',
    'stays quiet until a consumer app tries to install an adapter against the current',
    'kit and the package manager rejects the peer.',
    '',
    'Fix: raise the range in the adapter manifest to the major that is actually installed.',
  ];

  for (const pair of outdatedRangePairs) {
    lines.push(`  - ${pair.adapter}: ${pair.peer} ${pair.range} -> ^${pair.installed}`);
  }

  if (declaringManifests.length > 0) {
    lines.push('', 'Also declared in this repository:');
    for (const manifest of declaringManifests) {
      lines.push(`  - ${manifest}`);
    }
  }

  return lines;
}

/**
 * Compares every installed adapter's `@openzeppelin/ui-*` peer minimum against the
 * `@openzeppelin/ui-*` version actually installed alongside it.
 *
 * An installed version below the minimum is an error, matching what the adapter throws
 * at runtime. An installed version the *declared range* does not admit is a warning:
 * harmless in this tree, fatal for a consumer whose package manager reads the range.
 *
 * Missing packages are treated as configuration errors rather than a silent pass: in
 * CI, "no adapters installed" almost always means the install did not run or the
 * command points at the wrong root, and passing there would be a false green.
 */
export function checkAdapterPeers(projectRootInput: string): AdapterPeerResult {
  const projectRoot = path.resolve(projectRootInput);
  const scopeDirs = collectAdapterScopeDirs(projectRoot);
  const overriddenPeers = collectOverriddenPeers(projectRoot);
  const relativeScopeDirs = scopeDirs.map((dir) => path.relative(projectRoot, dir));

  const nothingChecked = (issue: AdapterPeerIssue): AdapterPeerResult => ({
    ok: false,
    projectRoot,
    scopeDirs: relativeScopeDirs,
    declaringManifests: [],
    overriddenPeers,
    pairs: [],
    issues: [issue],
    remediation: [],
  });

  if (scopeDirs.length === 0) {
    return nothingChecked({
      severity: 'error',
      code: 'no-scope-dirs',
      message:
        'No node_modules/@openzeppelin directory found in the project root or any workspace package -- run an install first.',
    });
  }

  const pairs = collectPairs(projectRoot, scopeDirs);

  if (pairs.length === 0) {
    const adaptersFound = scopeDirs.some((dir) => listInstalledAdapters(dir).length > 0);

    return nothingChecked(
      adaptersFound
        ? {
            severity: 'error',
            code: 'no-peers-resolved',
            message:
              'Found @openzeppelin/adapter-* packages but resolved no @openzeppelin/ui-* peers -- the check is not working.',
          }
        : {
            severity: 'error',
            code: 'no-adapters',
            message:
              'No @openzeppelin/adapter-* packages installed -- nothing to validate. Point --project at the repository that installs the adapters.',
          }
    );
  }

  const stalePairs = pairs.filter((pair) => !pair.satisfied);

  // Only pairs the floor check already passes: a stale peer is reported once, as the
  // error it is, rather than twice.
  const outdatedRangePairs = pairs.filter(
    (pair) => pair.satisfied && pair.rangeSatisfied === false
  );

  const issues: AdapterPeerIssue[] = [
    ...stalePairs.map((pair) => ({
      severity: 'error' as const,
      code: 'stale-peer' as const,
      message: `${pair.adapter} requires ${pair.peer} >=${pair.minimum}, but ${pair.installed} is installed.`,
    })),
    ...outdatedRangePairs.map((pair) => ({
      severity: 'warning' as const,
      code: 'outdated-range' as const,
      message: `${pair.adapter} declares ${pair.peer} ${pair.range}, which does not admit the installed ${pair.installed}. The adapter's own runtime check passes, but a package manager reads the range and refuses the install.`,
    })),
  ];

  const declaringManifests = collectPeerDeclaringManifests(
    projectRoot,
    pairs.map((pair) => pair.peer)
  );

  return {
    ok: issues.every((issue) => issue.severity !== 'error'),
    projectRoot,
    scopeDirs: relativeScopeDirs,
    declaringManifests,
    overriddenPeers,
    pairs,
    issues,
    remediation: [
      ...(stalePairs.length === 0
        ? []
        : buildRemediation(
            collectPeerDeclaringManifests(
              projectRoot,
              stalePairs.map((pair) => pair.peer)
            ),
            overriddenPeers
          )),
      ...(outdatedRangePairs.length === 0
        ? []
        : buildOutdatedRangeRemediation(
            outdatedRangePairs,
            collectPeerDeclaringManifests(
              projectRoot,
              outdatedRangePairs.map((pair) => pair.peer)
            )
          )),
    ],
  };
}

/**
 * Builds the comparison set across every scope directory.
 *
 * Deduplicated on adapter/peer/installed-version rather than on adapter name alone:
 * with `shamefullyHoist` the same adapter is linked at the root and next to each app,
 * and collapsing by name would hide an app that resolved an older peer than its
 * siblings. Identical resolutions collapse to one pair, differing ones are all kept.
 */
function collectPairs(projectRoot: string, scopeDirs: string[]): AdapterPeerPair[] {
  const pairs = new Map<string, AdapterPeerPair>();

  for (const scopeDir of scopeDirs) {
    for (const adapterDirName of listInstalledAdapters(scopeDir)) {
      const adapterManifest = readScopedManifest(scopeDir, adapterDirName);
      if (!adapterManifest) {
        continue;
      }

      for (const [peer, range] of Object.entries(adapterManifest.peerDependencies ?? {})) {
        if (!peer.startsWith(PEER_SCOPE_PREFIX)) {
          continue;
        }

        const minimum = minimumVersionOf(range);
        if (!minimum) {
          continue;
        }

        // Not installed here: this workspace may legitimately not use that peer.
        const installed = resolveInstalledPeerVersion(peer, scopeDir, scopeDirs);
        if (!installed) {
          continue;
        }

        const adapter = `@openzeppelin/${adapterDirName}`;
        const key = `${adapter}|${peer}|${installed}`;
        if (pairs.has(key)) {
          continue;
        }

        pairs.set(key, {
          adapter,
          peer,
          range,
          minimum,
          installed,
          satisfied: compareSemver(installed, minimum) >= 0,
          rangeSatisfied: rangeAdmits(range, installed),
          scopeDir: path.relative(projectRoot, scopeDir),
        });
      }
    }
  }

  return [...pairs.values()].sort(
    (a, b) => a.adapter.localeCompare(b.adapter) || a.peer.localeCompare(b.peer)
  );
}
