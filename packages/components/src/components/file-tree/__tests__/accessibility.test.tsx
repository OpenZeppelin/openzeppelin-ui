/**
 * @vitest-environment jsdom
 *
 * SF-4 · Accessibility — INV-18, INV-19, INV-20.
 */
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { MARKED_PATH, NESTED_FILE, NESTED_PATHS, SAMPLE_PATHS } from './fixtures/paths';

import { FileTree } from '../FileTree';
import {
  requireFileTreeHost,
  requireNamedTreeHost,
  requireRow,
  requireShadowRoot,
  requireTree,
  visibleTreeItems,
} from './fileTreeQuery';
import { defaultFileTreeProps } from './helpers';
import { focusRow, pressTreeKey } from './keyboard';

describe('INV-18: tree semantics and position metadata remain complete', () => {
  it('exposes one named host and treeitems with hierarchy metadata', async () => {
    const props = defaultFileTreeProps();
    const { container } = render(<FileTree {...props} />);
    const host = requireNamedTreeHost(container);
    expect(host.getAttribute('aria-label')).toBe(props['aria-label']);

    const root = requireShadowRoot(requireFileTreeHost(container));
    await waitFor(() => {
      requireTree(root);
      const items = visibleTreeItems(root);
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        expect(item.getAttribute('role')).toBe('treeitem');
        expect(item.getAttribute('aria-level')).not.toBeNull();
        expect(item.getAttribute('aria-setsize')).not.toBeNull();
        expect(item.getAttribute('aria-posinset')).not.toBeNull();
      }
    });
  });
});

describe('INV-19: tree navigation uses the standard composite keyboard model', () => {
  it('collapses an expanded folder on ArrowLeft without leaving the tree', async () => {
    const props = defaultFileTreeProps({ paths: [...NESTED_PATHS] });
    const { container } = render(<FileTree {...props} />);
    const root = requireShadowRoot(requireFileTreeHost(container));

    await waitFor(() => {
      requireRow(root, NESTED_FILE);
    });

    await focusRow(requireRow(root, 'src/lib/'));
    await pressTreeKey('{ArrowLeft}');

    await waitFor(() => {
      expect(root.querySelector(`[data-item-path="${NESTED_FILE}"]`)).toBeNull();
    });
    expect(container.contains(requireFileTreeHost(container))).toBe(true);
  });

  it('selects a file on Enter from the keyboard (INV-10 + INV-19)', async () => {
    const user = userEvent.setup();
    const props = defaultFileTreeProps();
    const { container } = render(<FileTree {...props} />);
    const root = requireShadowRoot(requireFileTreeHost(container));

    await waitFor(() => {
      requireRow(root, MARKED_PATH);
    });

    const row = requireRow(root, MARKED_PATH);
    props.onSelectedPathChange.mockClear();
    await focusRow(row);
    await user.keyboard('{Enter}');
    expect(props.onSelectedPathChange).toHaveBeenCalledWith(MARKED_PATH);
  });
});

describe('INV-20: change state and full paths are not color-only', () => {
  it(' exposes changed state in row semantics beyond color styling', async () => {
    const props = defaultFileTreeProps({ changedPaths: [MARKED_PATH] });
    const { container } = render(<FileTree {...props} />);
    const root = requireShadowRoot(requireFileTreeHost(container));

    await waitFor(() => {
      const changed = requireRow(root, MARKED_PATH);
      expect(changed.getAttribute('data-item-git-status')).toBe('modified');
      const accessibleName =
        changed.getAttribute('aria-label') ??
        changed.textContent ??
        changed.getAttribute('aria-description');
      expect(accessibleName?.length ?? 0).toBeGreaterThan(0);
    });
  });

  it('does not announce unchanged rows as changed', async () => {
    const props = defaultFileTreeProps({ changedPaths: [MARKED_PATH] });
    const { container } = render(<FileTree {...props} />);
    const root = requireShadowRoot(requireFileTreeHost(container));

    await waitFor(() => {
      for (const path of SAMPLE_PATHS.filter((p) => p !== MARKED_PATH)) {
        expect(requireRow(root, path).getAttribute('data-item-git-status')).toBeNull();
      }
    });
  });

  it('keeps the full path segment in the accessible name for long paths', async () => {
    const longPath = 'src/very/deep/nested/generated-contract-file-name.rs';
    const props = defaultFileTreeProps({ paths: [longPath, ...SAMPLE_PATHS] });
    const { container } = render(<FileTree {...props} />);
    const root = requireShadowRoot(requireFileTreeHost(container));

    await waitFor(() => {
      const row = requireRow(root, longPath);
      const name = row.getAttribute('aria-label') ?? row.textContent ?? '';
      expect(name).toContain('generated-contract-file-name.rs');
    });
  });
});
