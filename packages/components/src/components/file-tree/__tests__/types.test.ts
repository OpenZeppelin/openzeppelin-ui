/**
 * SF-4 · INV-5 type surface — kit-owned public contract only.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import type { FileTreeAccessibleName, FileTreePath, FileTreeProps } from '../../types';

const TYPES_FILE = join(dirname(fileURLToPath(import.meta.url)), '../types.ts');

describe('INV-5: public contract contains only kit types', () => {
  it('uses string paths and omits Pierre status enums from FileTreeProps', () => {
    const path: FileTreePath = 'src/contract.rs';
    const props: FileTreeProps = {
      'aria-label': 'Generated project files',
      paths: [path],
      selectedPath: path,
      onSelectedPathChange: () => undefined,
      changedPaths: [path],
    };
    expect(props.changedPaths?.[0]).toBe(path);
  });

  it('treats omitted changedPaths as valid input', () => {
    const props: FileTreeProps = {
      'aria-label': 'Generated project files',
      paths: ['README.md'],
      selectedPath: null,
      onSelectedPathChange: () => undefined,
    };
    expect(props.changedPaths).toBeUndefined();
  });

  it('enforces XOR accessible naming at the type level', () => {
    const byLabel: FileTreeAccessibleName = { 'aria-label': 'Tree' };
    const byLabelledBy: FileTreeAccessibleName = { 'aria-labelledby': 'tree-label' };
    expect(byLabel['aria-label']).toBe('Tree');
    expect(byLabelledBy['aria-labelledby']).toBe('tree-label');

    // @ts-expect-error INV-6: cannot supply both naming sources
    const invalidBoth: FileTreeAccessibleName = { 'aria-label': 'a', 'aria-labelledby': 'b' };
    expect(invalidBoth).toBeDefined();
  });

  it('does not export Pierre or Preact symbols from the types module source', () => {
    const source = readFileSync(TYPES_FILE, 'utf-8');
    expect(source).not.toContain('@pierre/trees');
    expect(source).not.toMatch(/\bpreact\b/i);
  });
});
