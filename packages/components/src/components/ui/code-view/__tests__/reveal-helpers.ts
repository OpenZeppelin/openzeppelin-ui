import { expect, vi, type MockInstance } from 'vitest';

import { CODE_VIEW_REVEAL_ATTRIBUTE } from '../reveal';

/**
 * jsdom and happy-dom omit `scrollIntoView`. A valid reveal calls it in
 * `useLayoutEffect`, so every jsdom file that imports this helper needs the
 * no-op in place before the first mount.
 */
if (typeof HTMLElement !== 'undefined') {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    writable: true,
    value: function scrollIntoView(): void {
      return undefined;
    },
  });
}

/** Ten distinct lines, no trailing newline. Line count is 10. */
export const TEN_LINE_SOURCE = Array.from(
  { length: 10 },
  (_, index) => `line-${String(index + 1).padStart(2, '0')}`
).join('\n');

/** Three `fn` lines plus a trailing newline (empty last line). */
export const THREE_LINE_RUST = 'fn one() {}\nfn two() {}\nfn three() {}\n';

export const KIT_REVEAL_SELECTOR = `[${CODE_VIEW_REVEAL_ATTRIBUTE}]`;

/**
 * Kit-owned reveal marks. Decorator `<mark>`s without the private attribute
 * are excluded.
 */
export function getKitRevealMarks(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll(KIT_REVEAL_SELECTOR)].filter(
    (node): node is HTMLElement => node instanceof HTMLElement
  );
}

/**
 * Assert no kit reveal mark is painted. Used for omit and every INV-6 no-op.
 */
export function expectNoKitRevealMark(container: HTMLElement, message?: string): void {
  expect(
    getKitRevealMarks(container),
    message ?? 'INV-6 violated: invalid or omitted reveal must leave no kit mark'
  ).toHaveLength(0);
}

/**
 * Spy `scrollIntoView` on the prototype. jsdom implements it as a no-op;
 * the spy is the assertion, not actual scrolling.
 */
export function spyScrollIntoView(): MockInstance<(options?: ScrollIntoViewOptions) => void> {
  return vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => undefined);
}
