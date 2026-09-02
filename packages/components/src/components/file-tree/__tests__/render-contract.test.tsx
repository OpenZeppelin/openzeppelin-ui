/**
 * @vitest-environment jsdom
 *
 * SF-4 · Render contract — INV-1, INV-2, INV-3.
 * SF-1 probe replacement PC-1: Pierre mounts beside React 19 with open shadow root.
 */
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createRef } from 'react';

import { MARKED_PATH, NESTED_PATHS, UNMARKED_PATH } from './fixtures/paths';

import { FileTree } from '../FileTree';
import {
  requireFileTreeHost,
  requireNamedTreeHost,
  requireRow,
  requireShadowRoot,
} from './fileTreeQuery';
import {
  defaultFileTreeProps,
  ReactSiblingCounter,
  renderFileTree,
  requireKitHost,
} from './helpers';

describe('INV-1: paths produce one navigable tree', () => {
  it('renders each distinct file path once under implied folders', async () => {
    const { container } = renderFileTree({ paths: [...NESTED_PATHS] });
    const root = requireShadowRoot(requireFileTreeHost(container));

    await waitFor(() => {
      for (const path of NESTED_PATHS) {
        requireRow(root, path);
      }
    });

    const rows = [...root.querySelectorAll('[data-item-path]')];
    const rowPaths = rows.map((row) => row.getAttribute('data-item-path'));
    expect(new Set(rowPaths).size, 'duplicate rows must not appear').toBe(rowPaths.length);
  });

  it('dedupes duplicate path props before rendering', async () => {
    const { container } = renderFileTree({
      paths: ['README.md', 'src/index.ts', 'README.md', 'src/index.ts'],
    });
    const root = requireShadowRoot(requireFileTreeHost(container));

    await waitFor(() => {
      expect(root.querySelectorAll('[data-item-path="README.md"]')).toHaveLength(1);
      expect(root.querySelectorAll('[data-item-path="src/index.ts"]')).toHaveLength(1);
    });
  });
});

describe('INV-2: the host boundary stays kit-owned', () => {
  it('forwards ref, id, and className to the kit host div', async () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <FileTree
        {...defaultFileTreeProps()}
        ref={ref}
        id="preview-tree"
        className="h-full border-dashed"
      />
    );

    const host = requireKitHost(container);
    expect(ref.current).toBe(host);
    expect(host.id).toBe('preview-tree');
    expect(host.className).toContain('h-full');
    expect(host.className).toContain('border-dashed');

    await waitFor(() => {
      requireRow(requireShadowRoot(requireFileTreeHost(container)), MARKED_PATH);
    });
  });
});

describe('INV-3: empty input is a valid render state', () => {
  it('renders a named empty tree with no treeitems and no throw', async () => {
    const props = defaultFileTreeProps({ paths: [] });
    const { container } = render(<FileTree {...props} />);
    const host = requireFileTreeHost(container);
    requireNamedTreeHost(container);

    expect(requireShadowRoot(host).querySelectorAll('[role="treeitem"]')).toHaveLength(0);
    expect(props.onSelectedPathChange).not.toHaveBeenCalled();
  });

  it('clears prior rows when paths transition to empty without retaining stale files', async () => {
    const props = defaultFileTreeProps();
    const { container, rerender } = render(<FileTree {...props} />);

    await waitFor(() => {
      requireRow(requireShadowRoot(requireFileTreeHost(container)), MARKED_PATH);
    });

    rerender(<FileTree {...props} paths={[]} selectedPath={null} />);

    await waitFor(() => {
      expect(
        requireShadowRoot(requireFileTreeHost(container)).querySelectorAll('[role="treeitem"]')
      ).toHaveLength(0);
    });
  });
});

describe('SF-1 PC-1 replacement: Pierre coexists with React 19 sibling', () => {
  it('mounts the React sibling and Pierre host with open shadow rows', async () => {
    const props = defaultFileTreeProps();
    const { container, getByTestId } = render(
      <>
        <ReactSiblingCounter testId="dual-vdom-react-counter" />
        <FileTree {...props} />
      </>
    );

    expect(getByTestId('dual-vdom-react-counter').textContent).toContain('React count: 0');

    const host = requireFileTreeHost(container);
    expect(host.shadowRoot?.mode).toBe('open');

    await waitFor(() => {
      const root = requireShadowRoot(host);
      requireRow(root, MARKED_PATH);
      requireRow(root, UNMARKED_PATH);
    });
  });
});
