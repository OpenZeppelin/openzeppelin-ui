import { FileTree as PierreFileTree } from '@pierre/trees/react';
import { forwardRef, useCallback, useRef } from 'react';

import { cn } from '@openzeppelin/ui-utils';

import { dedupePaths } from './pathSets';
import type { FileTreeProps } from './types';
import { useAccessibleNameDiagnostics } from './useAccessibleNameDiagnostics';
import { useFileTreeModel } from './useFileTreeModel';
import { useSyncFileTreeModel } from './useSyncFileTreeModel';

/**
 * Kit-owned file tree for generated project previews. Wraps `@pierre/trees`
 * behind a flat path list, controlled file selection, and optional change marks.
 *
 * Install `@pierre/trees@1.0.0-beta.6` (exact) before importing this subpath.
 */
export const FileTree = forwardRef<HTMLElement, FileTreeProps>(
  function FileTree(props, ref): React.ReactElement {
    const {
      paths,
      selectedPath,
      onSelectedPathChange,
      changedPaths,
      className,
      id,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
    } = props;

    const onSelectedPathChangeRef = useRef(onSelectedPathChange);
    onSelectedPathChangeRef.current = onSelectedPathChange;

    const suppressSelectionEmitRef = useRef(false);
    const filePathSetRef = useRef<ReadonlySet<string>>(new Set());

    const model = useFileTreeModel(
      dedupePaths(paths),
      onSelectedPathChangeRef,
      filePathSetRef,
      suppressSelectionEmitRef
    );

    useAccessibleNameDiagnostics({
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
    });

    useSyncFileTreeModel({
      model,
      paths,
      selectedPath,
      changedPaths,
      onSelectedPathChangeRef,
      filePathSetRef,
      suppressSelectionEmitRef,
    });

    const mergeRef = useCallback(
      (node: HTMLElement | null) => {
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref != null) {
          ref.current = node;
        }
      },
      [ref]
    );

    const pierreAccessibleName =
      ariaLabel != null
        ? { 'aria-label': ariaLabel }
        : ariaLabelledBy != null
          ? { 'aria-labelledby': ariaLabelledBy }
          : {};

    return (
      <div ref={mergeRef} id={id} className={cn('flex min-h-0 min-w-0 flex-col', className)}>
        <PierreFileTree model={model} className="h-full min-h-0 w-full" {...pierreAccessibleName} />
      </div>
    );
  }
);

export type { FileTreeAccessibleName, FileTreePath, FileTreeProps } from './types';
