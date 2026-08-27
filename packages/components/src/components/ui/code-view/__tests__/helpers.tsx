/* eslint-disable react-refresh/only-export-components -- test-only harness; Fast Refresh does not apply */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, type RenderOptions } from '@testing-library/react';
import { expect } from 'vitest';
import type { ReactElement } from 'react';

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

export { FIXTURES_DIR };
