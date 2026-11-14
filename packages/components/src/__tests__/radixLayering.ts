import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Packages with module-level state that layered primitives must share. Two
 * copies of any of these split the layer, focus-trap, focus-guard, scroll-lock
 * or aria-hidden stacks, and nested layers stop coordinating: focus ping-pongs,
 * one Escape closes two layers, and `pointer-events: none` is left on the body.
 *
 * Stateless Radix internals (portal, presence, primitive, popper, context) are
 * left out on purpose: a duplicate of those is harmless, and listing them would
 * fail the guard on unrelated drift.
 */
export const LAYERING_PACKAGES = [
  '@radix-ui/react-dismissable-layer',
  '@radix-ui/react-focus-scope',
  '@radix-ui/react-focus-guards',
  'react-remove-scroll',
  'aria-hidden',
] as const;

export type LayeringPackage = (typeof LAYERING_PACKAGES)[number];

/** One resolved copy of a layering package, and the Radix packages that reach it. */
export interface ResolvedCopy {
  readonly version: string;
  readonly realPath: string;
  /** `name@version` of each package that declares this copy, sorted. */
  readonly dependents: readonly string[];
}

export type LayeringReport = Record<LayeringPackage, readonly ResolvedCopy[]>;

/** Result of walking the Radix closure of one package. */
export interface LayeringWalk {
  /** `name@version` of the package the walk started from. */
  readonly root: string;
  readonly report: LayeringReport;
  /** Names of every `@radix-ui/*` package visited, sorted and unique. */
  readonly visitedRadix: readonly string[];
  /** Dependency edges that could not be resolved and were skipped, sorted. */
  readonly unresolved: readonly string[];
}

interface Manifest {
  readonly name: string;
  readonly version: string;
  readonly dependencies: Readonly<Record<string, string>>;
}

const RADIX_SCOPE = '@radix-ui/';

function isLayeringPackage(name: string): name is LayeringPackage {
  return (LAYERING_PACKAGES as readonly string[]).includes(name);
}

function readManifest(packageDir: string): Manifest {
  const raw: unknown = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf-8'));
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`radix-layering: ${packageDir}/package.json is not a JSON object`);
  }
  const { name, version, dependencies } = raw as Record<string, unknown>;
  if (typeof name !== 'string' || typeof version !== 'string') {
    throw new Error(`radix-layering: ${packageDir}/package.json has no name or version`);
  }
  const deps =
    typeof dependencies === 'object' && dependencies !== null
      ? (dependencies as Record<string, string>)
      : {};
  return { name, version, dependencies: deps };
}

/**
 * Resolve `name` the way Node does from code inside `fromDir`: look in each
 * ancestor's `node_modules`. Following the real directory of the parent is what
 * makes this match pnpm's layout, where a package's dependencies are its
 * siblings under `.pnpm/<pkg>@<version>/node_modules`. Reading the directory
 * directly sidesteps `exports` maps that hide `package.json`.
 */
function resolvePackageDir(name: string, fromDir: string): string | undefined {
  let dir = fromDir;
  for (;;) {
    const candidate = join(dir, 'node_modules', name);
    if (existsSync(join(candidate, 'package.json'))) return realpathSync(candidate);
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

function compareVersions(a: string, b: string): number {
  return a.localeCompare(b, 'en', { numeric: true });
}

/**
 * Walk every `@radix-ui/*` package reachable from `packageDir`'s own
 * `dependencies` (each dependency resolved from its parent's real directory)
 * and collect the copies of each layering package the visited packages declare.
 *
 * Reads only the local filesystem. Unresolvable edges are recorded in
 * `unresolved` and skipped, never thrown. Output is sorted, so the same
 * installed tree always yields the same walk.
 */
export function walkRadixClosure(packageDir: string): LayeringWalk {
  const rootDir = realpathSync(packageDir);
  const rootManifest = readManifest(rootDir);
  const root = `${rootManifest.name}@${rootManifest.version}`;

  // layering package → realPath → { version, dependents }
  const copies = new Map<
    LayeringPackage,
    Map<string, { version: string; dependents: Set<string> }>
  >(LAYERING_PACKAGES.map((name) => [name, new Map()]));
  const visitedDirs = new Set<string>([rootDir]);
  const visitedRadix = new Set<string>();
  const unresolved = new Set<string>();

  const queue: Array<{ dir: string; manifest: Manifest }> = [
    { dir: rootDir, manifest: rootManifest },
  ];
  for (let item = queue.shift(); item !== undefined; item = queue.shift()) {
    const parent = `${item.manifest.name}@${item.manifest.version}`;

    for (const depName of Object.keys(item.manifest.dependencies)) {
      const layering = isLayeringPackage(depName);
      const radix = depName.startsWith(RADIX_SCOPE);
      if (!layering && !radix) continue;

      const depDir = resolvePackageDir(depName, item.dir);
      if (depDir === undefined) {
        unresolved.add(`${depName} (from ${parent})`);
        continue;
      }
      const depManifest = readManifest(depDir);

      if (layering) {
        const byPath = copies.get(depName);
        // Map is pre-seeded with every LAYERING_PACKAGES member.
        if (byPath === undefined) throw new Error(`radix-layering: no slot for ${depName}`);
        const copy = byPath.get(depDir) ?? { version: depManifest.version, dependents: new Set() };
        copy.dependents.add(parent);
        byPath.set(depDir, copy);
      }

      if (radix && !visitedDirs.has(depDir)) {
        visitedDirs.add(depDir);
        visitedRadix.add(depName);
        queue.push({ dir: depDir, manifest: depManifest });
      }
    }
  }

  const toResolvedCopies = (name: LayeringPackage): ResolvedCopy[] =>
    [...(copies.get(name) ?? [])]
      .map(([realPath, { version, dependents }]) => ({
        version,
        realPath,
        dependents: [...dependents].sort(),
      }))
      .sort(
        (a, b) => compareVersions(a.version, b.version) || a.realPath.localeCompare(b.realPath)
      );

  // Spelled out so a new LAYERING_PACKAGES member is a compile error here, not a silent gap.
  const report: LayeringReport = {
    '@radix-ui/react-dismissable-layer': toResolvedCopies('@radix-ui/react-dismissable-layer'),
    '@radix-ui/react-focus-scope': toResolvedCopies('@radix-ui/react-focus-scope'),
    '@radix-ui/react-focus-guards': toResolvedCopies('@radix-ui/react-focus-guards'),
    'react-remove-scroll': toResolvedCopies('react-remove-scroll'),
    'aria-hidden': toResolvedCopies('aria-hidden'),
  };

  return {
    root,
    report,
    visitedRadix: [...visitedRadix].sort(),
    unresolved: [...unresolved].sort(),
  };
}

function formatDuplicate(
  name: LayeringPackage,
  copies: readonly ResolvedCopy[],
  owner: string
): string {
  const labels = copies.map((copy) => {
    const sameVersion = copies.filter((other) => other.version === copy.version).length > 1;
    // Two directories at one version (different peer sets) are still two module instances.
    return sameVersion ? `${copy.version} (${copy.realPath})` : copy.version;
  });
  const width = Math.max(...labels.map((label) => label.length)) + 2;
  const lines = copies.map(
    (copy, i) => `  ${(labels[i] ?? copy.version).padEnd(width)}← ${copy.dependents.join(', ')}`
  );
  return [
    `radix-layering: ${name} resolves ${copies.length} copies in the kit's Radix closure`,
    ...lines,
    `Bump every @radix-ui/* dependency of ${owner} to the same release (see SF-32).`,
  ].join('\n');
}

/**
 * Turn a walk into human-readable problems; an empty array means the closure
 * is sound. Fails on a duplicated layering package, and on a walk that is
 * vacuous: a required primitive not visited, or a layering package never found.
 */
export function findLayeringProblems(
  walk: LayeringWalk,
  requiredPrimitives: readonly string[]
): string[] {
  const owner = walk.root.slice(0, walk.root.lastIndexOf('@'));
  const problems: string[] = [];

  const missingPrimitives = requiredPrimitives.filter((name) => !walk.visitedRadix.includes(name));
  if (missingPrimitives.length > 0) {
    problems.push(
      `radix-layering: the walk from ${walk.root} did not reach ${missingPrimitives.join(', ')}. ` +
        `Is the package installed, or did the layout change? Unresolved edges: ${
          walk.unresolved.length > 0 ? walk.unresolved.join('; ') : 'none'
        }`
    );
  }

  for (const name of LAYERING_PACKAGES) {
    const copies = walk.report[name];
    if (copies.length === 0) {
      problems.push(
        `radix-layering: ${name} was not found in the kit's Radix closure (empty walk?)`
      );
    } else if (copies.length > 1) {
      problems.push(formatDuplicate(name, copies, owner));
    }
  }

  return problems;
}
