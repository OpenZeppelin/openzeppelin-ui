import type { ChangeStatusEntry, FileTreePath } from './types';

/**
 * Maps caller change marks to Pierre git-status entries. Unknown and duplicate
 * paths are dropped; clearing a mark is absence from the next `changedPaths` array.
 */
export function toChangeStatusEntries(input: {
  paths: ReadonlySet<FileTreePath>;
  changedPaths: readonly FileTreePath[];
}): readonly ChangeStatusEntry[] {
  const seen = new Set<FileTreePath>();
  const result: ChangeStatusEntry[] = [];

  for (const path of input.changedPaths) {
    if (!input.paths.has(path) || seen.has(path)) {
      continue;
    }
    seen.add(path);
    result.push({ path, status: 'modified' });
  }

  return result;
}
