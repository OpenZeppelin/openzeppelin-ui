/**
 * @vitest-environment jsdom
 *
 * SF-4 · Prop / state contract — INV-6, INV-7, INV-8 (component arm).
 * SF-1 probe replacement PC-2: controlled marks land on exactly the set rows.
 */
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MARKED_PATH, SAMPLE_PATHS, UNMARKED_PATH } from './fixtures/paths';

import { FileTree } from '../FileTree';
import { requireFileTreeHost, requireRow, requireShadowRoot } from './fileTreeQuery';
import { defaultFileTreeProps, renderFileTree, requireKitHost } from './helpers';

describe('INV-6: accessible name XOR and dev diagnostics', () => {
  it('emits one dev diagnostic for a blank accessible name and still mounts', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const props = defaultFileTreeProps({ 'aria-label': '   ' });
    const { container } = render(<FileTree {...props} />);

    expect(requireKitHost(container)).toBeTruthy();
    expect(errorSpy).toHaveBeenCalledWith(
      '[FileTree] Accessible name required: provide a nonblank aria-label or aria-labelledby.'
    );
    errorSpy.mockRestore();
  });

  it('emits one diagnostic when aria-labelledby target is missing', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <FileTree
        {...defaultFileTreeProps({ 'aria-label': undefined, 'aria-labelledby': 'missing-label' })}
      />
    );
    expect(errorSpy).toHaveBeenCalledWith(
      '[FileTree] aria-labelledby="missing-label" does not match any element in the document.'
    );
    errorSpy.mockRestore();
  });
});

describe('INV-7: controlled selection never points outside current files', () => {
  it('emits null once when selectedPath disappears, then stays silent', async () => {
    const onSelectedPathChange = vi.fn<(path: string | null) => void>();
    const props = defaultFileTreeProps({
      selectedPath: MARKED_PATH,
      onSelectedPathChange,
    });
    const { rerender, container } = render(<FileTree {...props} />);

    await waitFor(() => {
      requireRow(requireShadowRoot(requireFileTreeHost(container)), MARKED_PATH);
    });

    onSelectedPathChange.mockClear();

    rerender(
      <FileTree
        {...props}
        paths={SAMPLE_PATHS.filter((p) => p !== MARKED_PATH)}
        selectedPath={MARKED_PATH}
      />
    );

    expect(onSelectedPathChange, 'removed selected path must emit null once').toHaveBeenCalledTimes(
      1
    );
    expect(onSelectedPathChange).toHaveBeenCalledWith(null);

    rerender(
      <FileTree
        {...props}
        paths={SAMPLE_PATHS.filter((p) => p !== MARKED_PATH)}
        selectedPath={MARKED_PATH}
      />
    );
    expect(
      onSelectedPathChange,
      'repeated absent selection must stay silent'
    ).toHaveBeenCalledTimes(1);
  });

  it('allows a new null emission after the path returns and disappears again', async () => {
    const onSelectedPathChange = vi.fn<(path: string | null) => void>();
    const props = defaultFileTreeProps({
      selectedPath: MARKED_PATH,
      onSelectedPathChange,
    });
    const withoutMarked = SAMPLE_PATHS.filter((p) => p !== MARKED_PATH);
    const { rerender, container } = render(<FileTree {...props} />);

    await waitFor(() => {
      requireRow(requireShadowRoot(requireFileTreeHost(container)), MARKED_PATH);
    });

    rerender(<FileTree {...props} paths={[...withoutMarked]} selectedPath={MARKED_PATH} />);
    expect(onSelectedPathChange).toHaveBeenCalledWith(null);

    onSelectedPathChange.mockClear();
    rerender(<FileTree {...props} paths={[...SAMPLE_PATHS]} selectedPath={MARKED_PATH} />);
    rerender(<FileTree {...props} paths={[...withoutMarked]} selectedPath={MARKED_PATH} />);

    expect(onSelectedPathChange, 'second disappearance may emit null again').toHaveBeenCalledWith(
      null
    );
  });
});

describe('INV-8 / SF-1 PC-2: change marks equal the valid changed-path set', () => {
  it(`sets data-item-git-status="modified" on ${MARKED_PATH} only`, async () => {
    const { container } = renderFileTree({ changedPaths: [MARKED_PATH] });
    const root = requireShadowRoot(requireFileTreeHost(container));

    await waitFor(() => {
      expect(requireRow(root, MARKED_PATH).getAttribute('data-item-git-status')).toBe('modified');
    });
  });

  it('leaves every other path without git-status when only one path is marked', async () => {
    const { container } = renderFileTree({ changedPaths: [MARKED_PATH] });
    const root = requireShadowRoot(requireFileTreeHost(container));
    const unmarked = SAMPLE_PATHS.filter((path) => path !== MARKED_PATH);

    await waitFor(() => {
      for (const path of unmarked) {
        expect(requireRow(root, path).getAttribute('data-item-git-status')).toBeNull();
      }
      expect(unmarked).toContain(UNMARKED_PATH);
    });
  });

  it('clears prior marks when changedPaths becomes empty', async () => {
    const props = defaultFileTreeProps({ changedPaths: [MARKED_PATH] });
    const { container, rerender } = render(<FileTree {...props} />);
    const root = requireShadowRoot(requireFileTreeHost(container));

    await waitFor(() => {
      expect(requireRow(root, MARKED_PATH).getAttribute('data-item-git-status')).toBe('modified');
    });

    rerender(<FileTree {...props} changedPaths={[]} />);

    await waitFor(() => {
      expect(requireRow(root, MARKED_PATH).getAttribute('data-item-git-status')).toBeNull();
    });
  });

  it('treats omitted and empty changedPaths identically (INV-5)', async () => {
    const omitted = renderFileTree({});
    const empty = renderFileTree({ changedPaths: [] });
    const rootA = requireShadowRoot(requireFileTreeHost(omitted.container));
    const rootB = requireShadowRoot(requireFileTreeHost(empty.container));

    await waitFor(() => {
      for (const path of SAMPLE_PATHS) {
        expect(requireRow(rootA, path).getAttribute('data-item-git-status')).toBeNull();
        expect(requireRow(rootB, path).getAttribute('data-item-git-status')).toBeNull();
      }
    });
  });
});
