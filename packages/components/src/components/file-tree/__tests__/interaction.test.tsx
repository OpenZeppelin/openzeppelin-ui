/**
 * @vitest-environment jsdom
 *
 * SF-4 · Interaction — INV-10, INV-11, INV-12.
 * SF-1 probe replacement PC-3: React state updates after Pierre mounts.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { MARKED_PATH, NESTED_FILE, NESTED_PATHS, UNMARKED_PATH } from './fixtures/paths';

import { FileTree } from '../FileTree';
import { requireFileTreeHost, requireRow, requireShadowRoot } from './fileTreeQuery';
import { defaultFileTreeProps, ReactSiblingCounter } from './helpers';
import { focusRow } from './keyboard';

const LIB_FOLDER = 'src/lib/';

describe('INV-10: selection reports only user-selected files', () => {
  it('reports the file path on pointer click and ignores folder-only activation', async () => {
    const onSelectedPathChange = vi.fn<(path: string | null) => void>();
    const props = defaultFileTreeProps({
      paths: [...NESTED_PATHS],
      onSelectedPathChange,
    });
    const { container } = render(<FileTree {...props} />);
    const root = requireShadowRoot(requireFileTreeHost(container));

    await waitFor(() => {
      requireRow(root, NESTED_FILE);
    });

    onSelectedPathChange.mockClear();
    requireRow(root, LIB_FOLDER).click();
    expect(
      onSelectedPathChange,
      'folder click must not change selected file'
    ).not.toHaveBeenCalled();

    requireRow(root, NESTED_FILE).click();
    expect(onSelectedPathChange).toHaveBeenCalledWith(NESTED_FILE);
  });

  it('reports the file path on Enter and Space keyboard activation', async () => {
    const user = userEvent.setup();
    const onSelectedPathChange = vi.fn<(path: string | null) => void>();
    const props = defaultFileTreeProps({ onSelectedPathChange });
    const { container } = render(<FileTree {...props} />);
    const root = requireShadowRoot(requireFileTreeHost(container));

    await waitFor(() => {
      requireRow(root, MARKED_PATH);
      requireRow(root, UNMARKED_PATH);
    });

    const markedRow = requireRow(root, MARKED_PATH);
    const unmarkedRow = requireRow(root, UNMARKED_PATH);

    await focusRow(markedRow);
    await user.keyboard('{Enter}');
    expect(onSelectedPathChange, 'Enter must select the focused file row').toHaveBeenCalledWith(
      MARKED_PATH
    );

    onSelectedPathChange.mockClear();
    await focusRow(unmarkedRow);
    await user.keyboard('[Space]');
    expect(onSelectedPathChange, 'Space must select the focused file row').toHaveBeenCalledWith(
      UNMARKED_PATH
    );
  });
});

describe('INV-11: the current callback receives every later selection', () => {
  it('routes user selection to the latest onSelectedPathChange after rerender', async () => {
    const first = vi.fn<(path: string | null) => void>();
    const second = vi.fn<(path: string | null) => void>();
    const props = defaultFileTreeProps({ onSelectedPathChange: first });
    const { container, rerender } = render(<FileTree {...props} />);
    const root = requireShadowRoot(requireFileTreeHost(container));

    await waitFor(() => {
      requireRow(root, MARKED_PATH);
    });

    rerender(<FileTree {...props} onSelectedPathChange={second} />);
    requireRow(root, MARKED_PATH).click();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith(MARKED_PATH);
  });
});

describe('INV-12: expansion starts open and remains internal', () => {
  it('resets expansion after unmount and remount', async () => {
    const props = defaultFileTreeProps({ paths: [...NESTED_PATHS] });
    const { container, unmount } = render(<FileTree {...props} />);
    const host = requireFileTreeHost(container);

    await waitFor(() => {
      requireRow(requireShadowRoot(host), NESTED_FILE);
    });

    requireRow(requireShadowRoot(host), LIB_FOLDER).click();
    await waitFor(() => {
      expect(requireShadowRoot(host).querySelector(`[data-item-path="${NESTED_FILE}"]`)).toBeNull();
    });

    unmount();
    const remounted = render(<FileTree {...props} />);
    const remountHost = requireFileTreeHost(remounted.container);

    await waitFor(() => {
      requireRow(requireShadowRoot(remountHost), NESTED_FILE);
    });
  });
});

describe('SF-1 PC-3 replacement: React sibling survives Pierre mount and re-render', () => {
  it('increments the React counter after Pierre rows are present', async () => {
    const props = defaultFileTreeProps();
    const { container } = render(
      <>
        <ReactSiblingCounter testId="dual-vdom-react-counter" />
        <FileTree {...props} />
      </>
    );
    const host = requireFileTreeHost(container);

    await waitFor(() => {
      requireRow(requireShadowRoot(host), MARKED_PATH);
    });

    const reactButton = screen.getByTestId('dual-vdom-react-counter');
    fireEvent.click(reactButton);
    expect(reactButton.textContent).toContain('React count: 1');
  });

  it('keeps the Pierre host mounted after a React click', async () => {
    const props = defaultFileTreeProps();
    const { container } = render(
      <>
        <ReactSiblingCounter testId="dual-vdom-react-counter" />
        <FileTree {...props} />
      </>
    );
    const host = requireFileTreeHost(container);

    await waitFor(() => {
      requireRow(requireShadowRoot(host), MARKED_PATH);
    });

    fireEvent.click(screen.getByTestId('dual-vdom-react-counter'));
    expect(container.querySelector('file-tree-container')).toBe(host);
  });
});
