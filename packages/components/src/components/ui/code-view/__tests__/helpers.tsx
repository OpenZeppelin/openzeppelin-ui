/* eslint-disable react-refresh/only-export-components -- test-only harness; Fast Refresh does not apply */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, type RenderOptions } from '@testing-library/react';
import { expect } from 'vitest';
import { isValidElement, type ReactElement, type ReactNode } from 'react';

import { CodeView, type CodeViewProps } from '../CodeView';

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

let cachedDeploySh: string | undefined;

/**
 *
 */
export function readDeployShFixture(): string {
  cachedDeploySh ??= readFileSync(join(FIXTURES_DIR, 'deploy.sh'), 'utf-8');
  return cachedDeploySh;
}

/**
 *
 */
export function renderCodeView(
  props: CodeViewProps,
  options?: Omit<RenderOptions, 'queries'>
): ReturnType<typeof render> {
  return render(<CodeView {...props} />, options);
}

/**
 *
 */
export function getScrollRegion(container: HTMLElement): HTMLPreElement {
  const pre = container.querySelector('pre');
  if (!pre) {
    throw new Error('INV-1 violated: CodeView must render exactly one focusable pre>code region');
  }
  return pre;
}

/**
 *
 */
export function getCodeElement(container: HTMLElement): HTMLElement {
  const pre = getScrollRegion(container);
  const code = pre.querySelector('code');
  if (!code) {
    throw new Error('INV-1 violated: CodeView pre must contain exactly one code element');
  }
  return code;
}

/**
 *
 */
export function expectExactSourceText(container: HTMLElement, source: string): void {
  const code = getCodeElement(container);
  expect(code.textContent, 'visible code text must equal source byte-for-byte').toBe(source);
}

/**
 *
 */
export function expectHighlightedToken(container: HTMLElement, className: string): void {
  const token = container.querySelector(`.${className}`);
  expect(token, `expected at least one ${className} token span`).not.toBeNull();
}

/**
 *
 */
export function rerenderCodeView(
  rerender: (ui: ReactElement) => void,
  props: CodeViewProps
): ReturnType<typeof render> {
  rerender(<CodeView {...props} />);
  return render(<CodeView {...props} />);
}

/**
 * Assert every element in a mapped sibling array carries a key.
 *
 * `renderHast` returns what `children.map(...)` produced, so React requires a key on
 * each element member. A plain string member needs none, which is why the kit was
 * clean until a leaf started rendering as an element — a `decorateToken` return value
 * (SF-10) or a reveal wrap (SF-13).
 *
 * Asserting the keys directly, rather than watching for React's console warning, is
 * deliberate. React dedupes that warning per component type for the life of the module
 * registry, so only the first offending render in a file ever warns and a later test
 * relying on it would pass vacuously. This check is deterministic and order-independent.
 *
 * Seen to fail: with the `keyTextLeaf` call removed from `renderHastNode`, both callers
 * of this helper fail and React logs `Each child in a list should have a unique "key"
 * prop` naming `CodeView` — the QA A7 defect, reported from a Rust file whose import
 * paths the consumer decorated.
 */
export function expectEveryElementChildKeyed(node: ReactNode, context: string): void {
  expect(
    Array.isArray(node),
    `${context}: expected renderHast to return the mapped sibling array; a single node means this guard is not looking at the array React keys`
  ).toBe(true);

  const unkeyed = (node as ReactNode[])
    .flat(Infinity)
    .filter((member): member is ReactElement => isValidElement(member) && member.key === null);

  expect(
    unkeyed.map((member) => String(member.type)),
    `${context}: every element in a mapped sibling array needs a key`
  ).toEqual([]);
}

export { FIXTURES_DIR };
