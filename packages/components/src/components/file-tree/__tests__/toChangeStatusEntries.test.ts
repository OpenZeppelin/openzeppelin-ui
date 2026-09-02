/**
 * SF-4 · toChangeStatusEntries — INV-8 pure adapter.
 */
import { describe, expect, it } from 'vitest';

import { MARKED_PATH, SAMPLE_PATHS } from './fixtures/paths';

import { changeEntriesEqual, pathsToSet } from '../pathSets';
import { toChangeStatusEntries } from '../toChangeStatusEntries';

describe('toChangeStatusEntries (INV-8)', () => {
  const pathSet = pathsToSet(SAMPLE_PATHS);

  it('maps known changed paths to modified status entries', () => {
    expect(toChangeStatusEntries({ paths: pathSet, changedPaths: [MARKED_PATH] })).toEqual([
      { path: MARKED_PATH, status: 'modified' },
    ]);
  });

  it('drops paths absent from the current path set', () => {
    expect(
      toChangeStatusEntries({ paths: pathSet, changedPaths: ['missing/file.rs', MARKED_PATH] })
    ).toEqual([{ path: MARKED_PATH, status: 'modified' }]);
  });

  it('dedupes duplicate changed paths', () => {
    expect(
      toChangeStatusEntries({
        paths: pathSet,
        changedPaths: [MARKED_PATH, MARKED_PATH, MARKED_PATH],
      })
    ).toEqual([{ path: MARKED_PATH, status: 'modified' }]);
  });

  it('returns an empty list when changedPaths is empty or omitted meaning clear', () => {
    expect(toChangeStatusEntries({ paths: pathSet, changedPaths: [] })).toEqual([]);
  });

  it('is insensitive to changedPaths order for mark-set equality', () => {
    const forward = toChangeStatusEntries({
      paths: pathSet,
      changedPaths: ['README.md', MARKED_PATH],
    });
    const reverse = toChangeStatusEntries({
      paths: pathSet,
      changedPaths: [MARKED_PATH, 'README.md'],
    });
    expect(changeEntriesEqual(forward, reverse)).toBe(true);
    expect(forward).toHaveLength(2);
  });
});
