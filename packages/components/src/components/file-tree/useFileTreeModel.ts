import { FileTree as PierreFileTreeModel } from '@pierre/trees';
import { useEffect, useRef, useState, type RefObject } from 'react';

import { dedupePaths } from './pathSets';
import type { FileTreePath } from './types';

interface CleanUpState {
  timeout: ReturnType<typeof setTimeout> | null;
  model: PierreFileTreeModel;
}

/**
 * One Pierre model per mount. Identity stays stable across prop updates within
 * an open drawer; `cleanUp()` runs on unmount (delayed one tick for Strict Mode).
 */
export function useFileTreeModel(
  initialPaths: readonly FileTreePath[],
  onSelectedPathChangeRef: RefObject<(path: FileTreePath | null) => void>,
  filePathSetRef: RefObject<ReadonlySet<FileTreePath>>,
  suppressSelectionEmitRef: RefObject<boolean>
): PierreFileTreeModel {
  const isCleanedUpRef = useRef(false);
  const cleanUpRef = useRef<CleanUpState>(null as unknown as CleanUpState);

  const [model] = useState(() => {
    const createdModel = new PierreFileTreeModel({
      paths: dedupePaths(initialPaths),
      initialExpansion: 'open',
      onSelectionChange: (selectedPaths) => {
        if (isCleanedUpRef.current || suppressSelectionEmitRef.current) {
          return;
        }

        const filePaths = selectedPaths.filter((path) => filePathSetRef.current.has(path));
        if (filePaths.length === 0) {
          return;
        }

        const selectedFile = filePaths[filePaths.length - 1];
        onSelectedPathChangeRef.current(selectedFile);
      },
    });

    cleanUpRef.current = { timeout: null, model: createdModel };
    return createdModel;
  });

  useEffect(() => {
    const current = cleanUpRef.current;
    if (current.timeout != null) {
      clearTimeout(current.timeout);
      current.timeout = null;
    }

    return () => {
      current.timeout = setTimeout(() => {
        isCleanedUpRef.current = true;
        current.model.cleanUp();
      }, 1);
    };
  }, []);

  return model;
}
