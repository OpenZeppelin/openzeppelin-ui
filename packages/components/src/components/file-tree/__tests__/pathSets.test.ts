/**
 * SF-4 · pathSets pure helpers — INV-9 content-comparison boundary.
 * SF-8 passes Object.keys(files) on every keystroke; array identity must never gate sync.
 */
import { describe, expect, it } from 'vitest';

import { changeEntriesEqual, dedupePaths, pathsToSet, setsEqual } from '../pathSets';
import type { ChangeStatusEntry } from '../types';

describe('dedupePaths (INV-1)', () => {
  it('preserves first occurrence order and drops duplicates', () => {
    expect(dedupePaths(['b.ts', 'a.ts', 'b.ts', 'c.ts', 'a.ts'])).toEqual(['b.ts', 'a.ts', 'c.ts']);
  });

  it('returns an empty list for empty input', () => {
    expect(dedupePaths([])).toEqual([]);
  });
});

describe('pathsToSet (INV-9)', () => {
  it('builds an order-insensitive set from duplicate-bearing input', () => {
    const left = pathsToSet(['src/a.rs', 'README.md', 'src/a.rs']);
    const right = pathsToSet(['README.md', 'src/a.rs']);
    expect(setsEqual(left, right)).toBe(true);
  });
});

describe('setsEqual (INV-9 boundary)', () => {
  it('returns true for identical contents regardless of construction order', () => {
    const a = new Set(['README.md', 'src/index.ts', 'src/contract.rs']);
    const b = new Set(['src/contract.rs', 'README.md', 'src/index.ts']);
    expect(setsEqual(a, b)).toBe(true);
  });

  it('returns false when one path differs', () => {
    const a = new Set(['README.md', 'src/index.ts']);
    const b = new Set(['README.md', 'src/contract.rs']);
    expect(setsEqual(a, b)).toBe(false);
  });

  it('returns false when sizes differ even if one is a subset', () => {
    expect(setsEqual(new Set(['a']), new Set(['a', 'b']))).toBe(false);
  });

  it('treats fresh Set instances with the same members as equal (keystroke regeneration case)', () => {
    const firstGeneration = Object.keys({ 'src/a.rs': '', 'README.md': '' });
    const secondGeneration = Object.keys({ 'README.md': '', 'src/a.rs': '' });
    expect(firstGeneration).not.toBe(secondGeneration);
    expect(setsEqual(pathsToSet(firstGeneration), pathsToSet(secondGeneration))).toBe(true);
  });
});

describe('changeEntriesEqual (INV-8, INV-9 mark gate)', () => {
  const entry = (path: string): ChangeStatusEntry => ({ path, status: 'modified' });

  it('returns true for the same path set in different array order', () => {
    const left = [entry('src/a.rs'), entry('README.md')];
    const right = [entry('README.md'), entry('src/a.rs')];
    expect(changeEntriesEqual(left, right)).toBe(true);
  });

  it('returns false when a path is added or removed', () => {
    const base = [entry('src/a.rs')];
    expect(changeEntriesEqual(base, [entry('src/a.rs'), entry('README.md')])).toBe(false);
    expect(changeEntriesEqual([entry('src/a.rs'), entry('README.md')], base)).toBe(false);
  });

  it('returns true for fresh array instances carrying the same mark set', () => {
    const first = [{ path: 'src/contract.rs', status: 'modified' as const }];
    const second = [{ path: 'src/contract.rs', status: 'modified' as const }];
    expect(first).not.toBe(second);
    expect(changeEntriesEqual(first, second)).toBe(true);
  });

  it('returns true for empty mark lists from fresh references', () => {
    expect(changeEntriesEqual([], [])).toBe(true);
    expect(changeEntriesEqual([], Object.assign([], []))).toBe(true);
  });
});
