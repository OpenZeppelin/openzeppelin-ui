import { describe, expect, it } from 'vitest';

import { PACKAGE_ROOT } from './distArtifact';
import { findLayeringProblems, walkRadixClosure } from './radixLayering';

/**
 * Kit primitives that open a dismissable layer. The walk must reach each of
 * them, so a path or layout change can't turn the guard into a silent pass.
 * Remove an entry here only when the primitive is removed from package.json.
 */
const LAYERING_PRIMITIVES = [
  '@radix-ui/react-dialog',
  '@radix-ui/react-dropdown-menu',
  '@radix-ui/react-popover',
  '@radix-ui/react-select',
  '@radix-ui/react-tooltip',
  '@radix-ui/react-toast',
] as const;

/**
 * Nested layers (a popover or menu inside a Dialog) only coordinate when every
 * kit Radix primitive shares one copy of the layering internals. A single-package
 * Radix bump splits them again; this fails CI before that ships (SF-32).
 */
describe('Radix layering packages (SF-32)', () => {
  it('resolve exactly one copy each across the kit Radix closure', () => {
    const problems = findLayeringProblems(walkRadixClosure(PACKAGE_ROOT), LAYERING_PRIMITIVES);

    expect(problems, `\n${problems.join('\n\n')}\n`).toEqual([]);
  });
});
