import type { FileTree as PierreFileTreeModel } from '@pierre/trees';
import { useLayoutEffect, useRef, type RefObject } from 'react';

import { changeEntriesEqual, pathsToSet, setsEqual } from './pathSets';
import { syncControlledSelection } from './syncControlledSelection';
import { toChangeStatusEntries } from './toChangeStatusEntries';
import type { ChangeStatusEntry, FileTreePath } from './types';

interface UseSyncFileTreeModelOptions {
  model: PierreFileTreeModel;
  paths: readonly FileTreePath[];
  selectedPath: FileTreePath | null;
  changedPaths?: readonly FileTreePath[];
  onSelectedPathChangeRef: RefObject<(path: FileTreePath | null) => void>;
  filePathSetRef: RefObject<ReadonlySet<FileTreePath>>;
  suppressSelectionEmitRef: RefObject<boolean>;
}

/**
 * Imperative Pierre sync: set-content gates for paths and marks; controlled
 * selection reconciliation without treating prop sync as user intent.
 */
export function useSyncFileTreeModel(options: UseSyncFileTreeModelOptions): void {
  const {
    model,
    paths,
    selectedPath,
    changedPaths,
    onSelectedPathChangeRef,
    filePathSetRef,
    suppressSelectionEmitRef,
  } = options;

  const prevPathsSetRef = useRef<ReadonlySet<FileTreePath>>(new Set());
  const prevChangeEntriesRef = useRef<ChangeStatusEntry[]>([]);
  const disappearedPathRef = useRef<FileTreePath | null>(null);
  /**
   * Selection this hook last moved focus to. Undefined means "never synced", so
   * the first pass always focuses; afterwards focus only follows a selection
   * that actually changed. Without it, any parent re-render re-focused the
   * selected row and discarded the user's arrow-key position.
   */
  const focusedSelectionRef = useRef<FileTreePath | null | undefined>(undefined);

  useLayoutEffect(() => {
    const pathSet = pathsToSet(paths);
    filePathSetRef.current = pathSet;

    if (!setsEqual(pathSet, prevPathsSetRef.current)) {
      model.resetPaths([...pathSet]);
      prevPathsSetRef.current = pathSet;
    }

    const changeEntries = toChangeStatusEntries({
      paths: pathSet,
      changedPaths: changedPaths ?? [],
    });

    if (!changeEntriesEqual(changeEntries, prevChangeEntriesRef.current)) {
      const mutableEntries = [...changeEntries];
      model.setGitStatus(mutableEntries);
      prevChangeEntriesRef.current = mutableEntries;
    }

    if (selectedPath !== null && !pathSet.has(selectedPath)) {
      if (disappearedPathRef.current !== selectedPath) {
        disappearedPathRef.current = selectedPath;
        onSelectedPathChangeRef.current(null);
      }
    } else {
      disappearedPathRef.current = null;
    }

    // A selection that is not in the tree yet was never focused, so re-arm the
    // ref and let the pass that first sees the path move focus to it.
    const selectionIsPresent = selectedPath !== null && pathSet.has(selectedPath);
    const moveFocus = selectionIsPresent && focusedSelectionRef.current !== selectedPath;
    focusedSelectionRef.current = selectionIsPresent ? selectedPath : undefined;

    syncControlledSelection(model, selectedPath, pathSet, suppressSelectionEmitRef, moveFocus);
  });
}
