import type { FileTree as PierreFileTreeModel } from '@pierre/trees';

import type { FileTreePath } from './types';

/**
 * Aligns Pierre selection with controlled `selectedPath` without emitting user
 * selection callbacks.
 *
 * `moveFocus` is separate from selection because focus is the user's, not the
 * model's: re-asserting it on a sync that did not change the selection would
 * throw away the row the user had arrow-keyed to.
 */
export function syncControlledSelection(
  model: PierreFileTreeModel,
  selectedPath: FileTreePath | null,
  pathSet: ReadonlySet<FileTreePath>,
  suppressSelectionEmit: { current: boolean },
  moveFocus: boolean
): void {
  suppressSelectionEmit.current = true;

  try {
    const currentFileSelections = model.getSelectedPaths().filter((path) => pathSet.has(path));

    if (selectedPath === null) {
      for (const path of currentFileSelections) {
        model.getItem(path)?.deselect();
      }
      return;
    }

    if (!pathSet.has(selectedPath)) {
      return;
    }

    for (const path of currentFileSelections) {
      if (path !== selectedPath) {
        model.getItem(path)?.deselect();
      }
    }

    const item = model.getItem(selectedPath);
    if (item != null && !item.isSelected()) {
      item.select();
    }

    if (moveFocus) {
      model.focusPath(selectedPath);
    }
  } finally {
    suppressSelectionEmit.current = false;
  }
}
