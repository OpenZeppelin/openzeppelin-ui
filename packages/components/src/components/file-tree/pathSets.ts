import type { ChangeStatusEntry, FileTreePath } from './types';

/** First occurrence of each path, in input order. Hosts may pass duplicates. */
export function dedupePaths(paths: readonly FileTreePath[]): FileTreePath[] {
  const seen = new Set<FileTreePath>();
  const result: FileTreePath[] = [];

  for (const path of paths) {
    if (seen.has(path)) {
      continue;
    }
    seen.add(path);
    result.push(path);
  }

  return result;
}

/** Membership view of a path list, for the sync effect's set-content gates. */
export function pathsToSet(paths: readonly FileTreePath[]): ReadonlySet<FileTreePath> {
  return new Set(dedupePaths(paths));
}

/**
 * Same members, ignoring order. Lets the sync effect skip a Pierre `resetPaths`
 * when the host hands over a new array holding the same paths.
 */
export function setsEqual<T>(left: ReadonlySet<T>, right: ReadonlySet<T>): boolean {
  if (left.size !== right.size) {
    return false;
  }

  for (const value of left) {
    if (!right.has(value)) {
      return false;
    }
  }

  return true;
}

/**
 * Same marked paths, ignoring order. Every entry the kit builds carries status
 * `modified`, so a differing status means the comparison input was not ours.
 */
export function changeEntriesEqual(
  left: readonly ChangeStatusEntry[],
  right: readonly ChangeStatusEntry[]
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const leftPaths = new Set(left.map((entry) => entry.path));

  for (const entry of right) {
    if (!leftPaths.has(entry.path) || entry.status !== 'modified') {
      return false;
    }
  }

  return true;
}
