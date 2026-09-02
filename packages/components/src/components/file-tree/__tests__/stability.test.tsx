/**
 * @vitest-environment jsdom
 *
 * SF-4 · Performance / stability — INV-13, INV-14, INV-15.
 */
import { FileTree as PierreFileTreeModel } from '@pierre/trees';
import { render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StrictMode } from 'react';

import { MARKED_PATH, SAMPLE_PATHS, syntheticPaths, UNMARKED_PATH } from './fixtures/paths';

import { FileTree } from '../FileTree';
import {
  requireFileTreeHost,
  requireRow,
  requireShadowRoot,
  visibleTreeItems,
} from './fileTreeQuery';
import { defaultFileTreeProps } from './helpers';

describe('INV-13: one mount owns one model and one cleanup', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls cleanUp on unmount and silences callbacks afterward', async () => {
    const cleanUpSpy = vi.spyOn(PierreFileTreeModel.prototype, 'cleanUp');
    const onSelectedPathChange = vi.fn<(path: string | null) => void>();
    const props = defaultFileTreeProps({ onSelectedPathChange });

    const { container, unmount } = render(
      <StrictMode>
        <FileTree {...props} />
      </StrictMode>
    );

    await waitFor(() => {
      requireRow(requireShadowRoot(requireFileTreeHost(container)), MARKED_PATH);
    });

    unmount();
    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(cleanUpSpy, 'unmount must schedule Pierre cleanUp').toHaveBeenCalled();
    onSelectedPathChange.mockClear();

    const remounted = render(<FileTree {...props} />);
    await waitFor(() => {
      requireRow(requireShadowRoot(requireFileTreeHost(remounted.container)), MARKED_PATH);
    });
    requireRow(requireShadowRoot(requireFileTreeHost(remounted.container)), MARKED_PATH).click();
    expect(onSelectedPathChange, 'only the live mount may emit selection').toHaveBeenCalledTimes(1);
  });
});

describe('INV-14: mounted instances are isolated', () => {
  it('does not cross-update selection or marks between two trees', async () => {
    const leftChange = vi.fn<(path: string | null) => void>();
    const rightChange = vi.fn<(path: string | null) => void>();

    const { container } = render(
      <>
        <FileTree
          {...defaultFileTreeProps({
            'aria-label': 'Left tree',
            onSelectedPathChange: leftChange,
            changedPaths: [MARKED_PATH],
          })}
        />
        <FileTree
          {...defaultFileTreeProps({
            'aria-label': 'Right tree',
            onSelectedPathChange: rightChange,
            changedPaths: [],
          })}
        />
      </>
    );

    const hosts = container.querySelectorAll('file-tree-container');
    expect(hosts).toHaveLength(2);
    const leftRoot = requireShadowRoot(hosts[0] as HTMLElement);
    const rightRoot = requireShadowRoot(hosts[1] as HTMLElement);

    await waitFor(() => {
      expect(requireRow(leftRoot, MARKED_PATH).getAttribute('data-item-git-status')).toBe(
        'modified'
      );
      expect(requireRow(rightRoot, MARKED_PATH).getAttribute('data-item-git-status')).toBeNull();
    });

    requireRow(leftRoot, MARKED_PATH).click();
    expect(leftChange).toHaveBeenCalledWith(MARKED_PATH);
    expect(rightChange).not.toHaveBeenCalled();
  });
});

describe('INV-15: focus follows the selection, not the render', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * The sync effect reads four inputs. Each case holds three of them fixed and
   * varies the fourth, so a focus condition that ignores one dimension — or
   * ignores all of them and focuses unconditionally — fails here.
   */
  const RERENDER_CASES = [
    {
      dimension: 'nothing (identical props, new array identities)',
      next: { paths: [...SAMPLE_PATHS], changedPaths: [MARKED_PATH] },
      expectRefocus: false,
    },
    {
      dimension: 'changedPaths only',
      next: { paths: [...SAMPLE_PATHS], changedPaths: [UNMARKED_PATH] },
      expectRefocus: false,
    },
    {
      dimension: 'paths only',
      next: { paths: [...SAMPLE_PATHS, 'src/extra.rs'], changedPaths: [MARKED_PATH] },
      expectRefocus: false,
    },
    {
      dimension: 'selectedPath only',
      next: {
        paths: [...SAMPLE_PATHS],
        changedPaths: [MARKED_PATH],
        selectedPath: UNMARKED_PATH,
      },
      expectRefocus: true,
    },
  ] as const;

  it.each(RERENDER_CASES)(
    're-render varying $dimension refocuses the tree: $expectRefocus',
    async ({ next, expectRefocus }) => {
      const props = defaultFileTreeProps({
        paths: [...SAMPLE_PATHS],
        selectedPath: MARKED_PATH,
        changedPaths: [MARKED_PATH],
      });

      const { container, rerender } = render(<FileTree {...props} />);
      await waitFor(() => {
        requireRow(requireShadowRoot(requireFileTreeHost(container)), MARKED_PATH);
      });

      const focusPathSpy = vi.spyOn(PierreFileTreeModel.prototype, 'focusPath');
      rerender(<FileTree {...props} {...next} />);

      expect(
        focusPathSpy.mock.calls.length > 0,
        expectRefocus
          ? 'a changed selection must move focus to the newly selected row'
          : 'a re-render that does not change the selection must leave keyboard focus where the user put it'
      ).toBe(expectRefocus);
    }
  );
});

describe('INV-15: large trees keep DOM work bounded', () => {
  it('virtualizes 10k paths and still focuses an offscreen controlled selection', async () => {
    const paths = syntheticPaths(10_000);
    const offscreenPath = paths[paths.length - 1];
    const focusPathSpy = vi.spyOn(PierreFileTreeModel.prototype, 'focusPath');
    const props = defaultFileTreeProps({ paths, selectedPath: offscreenPath });

    const { container } = render(
      <div style={{ height: 320, width: 280 }}>
        <FileTree {...props} />
      </div>
    );
    const root = requireShadowRoot(requireFileTreeHost(container));

    await waitFor(
      () => {
        expect(visibleTreeItems(root).length).toBeGreaterThan(0);
      },
      { timeout: 10_000 }
    );

    const mountedCount = visibleTreeItems(root).length;
    expect(mountedCount, 'virtualized tree must not mount one DOM row per input path').toBeLessThan(
      500
    );
    expect(mountedCount).toBeLessThan(paths.length);
    expect(
      focusPathSpy,
      'controlled offscreen selection must still reach Pierre focusPath'
    ).toHaveBeenCalledWith(offscreenPath);

    focusPathSpy.mockRestore();
  }, 15_000);
});
