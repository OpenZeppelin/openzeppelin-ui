/**
 * @vitest-environment jsdom
 *
 * SF-4 · INV-9 integration — equal-set-new-reference updates must not churn Pierre.
 */
import { FileTree as PierreFileTreeModel } from '@pierre/trees';
import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MARKED_PATH, NESTED_FILE, NESTED_PATHS, SAMPLE_PATHS } from './fixtures/paths';

import { FileTree } from '../FileTree';
import { requireFileTreeHost, requireRow, requireShadowRoot } from './fileTreeQuery';
import { defaultFileTreeProps } from './helpers';

describe('INV-9: prop sync gates on set content, never array identity', () => {
  let resetPathsSpy: ReturnType<typeof vi.spyOn>;
  let setGitStatusSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetPathsSpy = vi.spyOn(PierreFileTreeModel.prototype, 'resetPaths');
    setGitStatusSpy = vi.spyOn(PierreFileTreeModel.prototype, 'setGitStatus');
  });

  afterEach(() => {
    resetPathsSpy.mockRestore();
    setGitStatusSpy.mockRestore();
  });

  it('does not call resetPaths or setGitStatus when paths and changedPaths are fresh arrays with identical sets', async () => {
    const props = defaultFileTreeProps({
      changedPaths: [MARKED_PATH],
    });
    const { rerender, container } = render(<FileTree {...props} />);

    await waitFor(() => {
      requireRow(requireShadowRoot(requireFileTreeHost(container)), MARKED_PATH);
    });

    const resetCallsAfterMount = resetPathsSpy.mock.calls.length;
    const statusCallsAfterMount = setGitStatusSpy.mock.calls.length;

    rerender(
      <FileTree {...props} paths={[...SAMPLE_PATHS].reverse()} changedPaths={[MARKED_PATH]} />
    );

    expect(
      resetPathsSpy.mock.calls.length,
      'INV-9 violated: reordering paths with the same set must not resetPaths'
    ).toBe(resetCallsAfterMount);
    expect(
      setGitStatusSpy.mock.calls.length,
      'INV-9 violated: identical mark set from a fresh changedPaths array must not setGitStatus'
    ).toBe(statusCallsAfterMount);
  });

  it('calls resetPaths exactly once when the path set actually changes', async () => {
    const props = defaultFileTreeProps();
    const { rerender, container } = render(<FileTree {...props} />);

    await waitFor(() => {
      requireRow(requireShadowRoot(requireFileTreeHost(container)), MARKED_PATH);
    });

    resetPathsSpy.mockClear();
    setGitStatusSpy.mockClear();

    rerender(<FileTree {...props} paths={[...SAMPLE_PATHS, 'Cargo.toml']} />);

    expect(resetPathsSpy, 'a new path must trigger resetPaths once').toHaveBeenCalledTimes(1);
    expect(setGitStatusSpy, 'path-only change must not replace git status').not.toHaveBeenCalled();
  });

  it('calls setGitStatus exactly once when only the mark set changes', async () => {
    const props = defaultFileTreeProps();
    const { rerender, container } = render(<FileTree {...props} />);

    await waitFor(() => {
      requireRow(requireShadowRoot(requireFileTreeHost(container)), MARKED_PATH);
    });

    resetPathsSpy.mockClear();
    setGitStatusSpy.mockClear();

    rerender(<FileTree {...props} changedPaths={[MARKED_PATH]} />);

    expect(
      resetPathsSpy,
      'mark-only change must not resetPaths (INV-9 + INV-12)'
    ).not.toHaveBeenCalled();
    expect(setGitStatusSpy, 'a new mark set must replace git status once').toHaveBeenCalledTimes(1);
  });

  it('preserves folder expansion across equal-set path rerenders (INV-9 + INV-12)', async () => {
    const props = defaultFileTreeProps({ paths: [...NESTED_PATHS] });
    const { rerender, container } = render(<FileTree {...props} />);
    const host = requireFileTreeHost(container);

    await waitFor(() => {
      requireRow(requireShadowRoot(host), NESTED_FILE);
    });

    const libFolder = requireRow(requireShadowRoot(host), 'src/lib/');
    libFolder.click();

    await waitFor(() => {
      expect(requireShadowRoot(host).querySelector(`[data-item-path="${NESTED_FILE}"]`)).toBeNull();
    });

    resetPathsSpy.mockClear();

    rerender(
      <FileTree
        {...props}
        paths={Object.keys(Object.fromEntries(NESTED_PATHS.map((p) => [p, ''])))}
      />
    );

    expect(
      resetPathsSpy,
      'equal path set rerender must not collapse user expansion'
    ).not.toHaveBeenCalled();
    expect(requireShadowRoot(host).querySelector(`[data-item-path="${NESTED_FILE}"]`)).toBeNull();
  });
});
