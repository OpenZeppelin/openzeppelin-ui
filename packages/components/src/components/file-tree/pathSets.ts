import type { ChangeStatusEntry, FileTreePath } from './types';

/**
 *
 */
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

/**
 *
 */
export function pathsToSet(paths: readonly FileTreePath[]): ReadonlySet<FileTreePath> {
  return new Set(dedupePaths(paths));
}

/**
 *
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
 *
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
