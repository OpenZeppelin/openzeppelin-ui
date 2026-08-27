/* eslint-disable react-refresh/only-export-components -- test-only harness; Fast Refresh does not apply */
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { vi, type Mock } from 'vitest';
import { useState, type ReactElement } from 'react';

import { SAMPLE_PATHS } from './fixtures/paths';

import { FileTree, type FileTreeProps } from '../FileTree';
import type { FileTreeAccessibleName } from '../types';

export const DEFAULT_ARIA_LABEL = 'Generated project files';

export type RenderFileTreeProps = Partial<FileTreeProps> & {
  initialSelectedPath?: FileTreeProps['selectedPath'];
};

type FileTreeTestProps = FileTreeProps & {
  onSelectedPathChange: Mock<(path: string | null) => void>;
};

/**
 *
 */
export function defaultFileTreeProps(overrides: RenderFileTreeProps = {}): FileTreeTestProps {
  const {
    initialSelectedPath,
    onSelectedPathChange: onSelectedPathChangeOverride,
    selectedPath: selectedPathOverride,
    'aria-label': ariaLabelOverride,
    'aria-labelledby': ariaLabelledByOverride,
    paths: pathsOverride,
    changedPaths,
    className,
    id,
  } = overrides;

  const onSelectedPathChange: FileTreeTestProps['onSelectedPathChange'] = vi.fn(
    onSelectedPathChangeOverride
  );

  const accessibleName: FileTreeAccessibleName =
    ariaLabelledByOverride != null
      ? { 'aria-labelledby': ariaLabelledByOverride }
      : { 'aria-label': ariaLabelOverride ?? DEFAULT_ARIA_LABEL };

  return {
    ...accessibleName,
    paths: pathsOverride ?? [...SAMPLE_PATHS],
    selectedPath: selectedPathOverride ?? initialSelectedPath ?? null,
    onSelectedPathChange,
    changedPaths,
    className,
    id,
  };
}

/**
 *
 */
export function renderFileTree(
  props: RenderFileTreeProps = {},
  options?: Omit<RenderOptions, 'queries'>
): RenderResult & { props: FileTreeTestProps } {
  const merged = defaultFileTreeProps(props);
  const result = render(<FileTree {...merged} />, options);
  return { ...result, props: merged };
}

/**
 *
 */
export function ControlledFileTree(
  props: Omit<RenderFileTreeProps, 'selectedPath' | 'onSelectedPathChange'> & {
    initialSelectedPath?: FileTreeProps['selectedPath'];
    onSelectedPathChange?: FileTreeProps['onSelectedPathChange'];
  }
): ReactElement {
  const [selectedPath, setSelectedPath] = useState<FileTreeProps['selectedPath']>(
    props.initialSelectedPath ?? null
  );
  return (
    <FileTree
      aria-label={props['aria-label'] ?? DEFAULT_ARIA_LABEL}
      paths={props.paths ?? [...SAMPLE_PATHS]}
      selectedPath={selectedPath}
      onSelectedPathChange={(path) => {
        props.onSelectedPathChange?.(path);
        setSelectedPath(path);
      }}
      changedPaths={props.changedPaths}
      className={props.className}
      id={props.id}
    />
  );
}

/** React sibling used to prove Pierre coexists with React 19 state updates (SF-1 PC-3). */
export function ReactSiblingCounter(props: { testId?: string }): ReactElement {
  const [count, setCount] = useState(0);
  return (
    <button
      type="button"
      data-testid={props.testId ?? 'react-sibling-counter'}
      onClick={() => setCount((c) => c + 1)}
    >
      React count: {count}
    </button>
  );
}

/**
 *
 */
export function requireKitHost(container: HTMLElement): HTMLDivElement {
  const host = container.firstElementChild;
  if (!(host instanceof HTMLDivElement)) {
    throw new Error('INV-2 violated: FileTree must render a kit-owned host div');
  }
  return host;
}
