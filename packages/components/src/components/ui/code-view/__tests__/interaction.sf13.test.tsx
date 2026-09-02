/**
 * @vitest-environment jsdom
 *
 * SF-13 · Interaction — INV-10, INV-11.
 */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import React from 'react';

import { CodeView } from '../CodeView';
import type { CodeViewTokenDecorator } from '../types';
import { getScrollRegion, renderCodeView } from './helpers';
import { getKitRevealMarks, spyScrollIntoView, THREE_LINE_RUST } from './reveal-helpers';

const firstKeywordMarkDecorator: CodeViewTokenDecorator = ({ token }) => {
  if (token.text === 'fn' && token.offset === 0) {
    return <mark data-testid="decorator-mark">{token.text}</mark>;
  }
  return undefined;
};

describe('INV-10: reveal does not steal focus or intercept scroll', () => {
  it('does not call focus() and leaves document.activeElement unchanged', () => {
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    const host = render(
      <div>
        <input data-testid="wizard-field" />
        <CodeView source={THREE_LINE_RUST} language="rust" />
      </div>
    );
    const field = host.getByTestId('wizard-field');
    field.focus();
    focus.mockClear();
    expect(document.activeElement).toBe(field);

    host.rerender(
      <div>
        <input data-testid="wizard-field" />
        <CodeView source={THREE_LINE_RUST} language="rust" reveal={{ startLine: 2, endLine: 2 }} />
      </div>
    );

    expect(document.activeElement, 'INV-10: form field must keep the caret').toBe(field);
    expect(
      focus,
      'INV-10: reveal must not call focus() on the pre or the mark'
    ).not.toHaveBeenCalled();
    focus.mockRestore();
  });

  it('gives the kit mark no tabIndex and no aria-label', () => {
    const { container } = renderCodeView({
      source: THREE_LINE_RUST,
      language: 'rust',
      reveal: { startLine: 1, endLine: 1 },
    });
    const marks = getKitRevealMarks(container);
    expect(marks.length).toBeGreaterThan(0);
    for (const mark of marks) {
      expect(mark.getAttribute('tabIndex')).toBeNull();
      expect(mark.getAttribute('tabindex')).toBeNull();
      expect(mark.tabIndex).toBe(-1);
      expect(mark.getAttribute('aria-label')).toBeNull();
    }
    expect(getScrollRegion(container).tabIndex).toBe(0);
  });

  it('still installs no scroll or keyboard listeners on the pre', () => {
    const listenerProps = [
      'onKeyDown',
      'onKeyUp',
      'onCopy',
      'onCut',
      'onPaste',
      'onScroll',
      'onWheel',
      'onPointerDown',
      'onFocus',
      'onBlur',
    ] as const;
    const { container } = renderCodeView({
      source: THREE_LINE_RUST,
      language: 'rust',
      reveal: { startLine: 1, endLine: 2 },
    });
    const pre = getScrollRegion(container);
    for (const prop of listenerProps) {
      expect(pre[prop] ?? null, `${prop} must not be attached by reveal`).toBeNull();
    }
  });
});

describe('INV-11: the first kit mark is the scroll target', () => {
  it('calls scrollIntoView on the first [data-code-view-reveal], not a decorator mark above it', () => {
    const calledOn: HTMLElement[] = [];
    const scroll = spyScrollIntoView();
    scroll.mockImplementation(function (this: HTMLElement) {
      calledOn.push(this);
    });

    const { container } = renderCodeView({
      source: THREE_LINE_RUST,
      language: 'rust',
      decorateToken: firstKeywordMarkDecorator,
      reveal: { startLine: 2, endLine: 2 },
    });

    const decoratorMark = container.querySelector('[data-testid="decorator-mark"]');
    const kitMarks = getKitRevealMarks(container);
    expect(decoratorMark, 'decorator mark sits on line 1, above the reveal').not.toBeNull();
    expect(kitMarks.length).toBeGreaterThan(0);
    expect(decoratorMark?.hasAttribute('data-code-view-reveal')).toBe(false);
    expect(calledOn[0], 'INV-11: first kit mark is the scroll target').toBe(kitMarks[0]);
    expect(calledOn[0]).not.toBe(decoratorMark);
    // INV-11 restated, not relaxed: the first kit mark is still the sole scroll
    // target, and it is aligned to the START of the pane. `block: 'center'` put
    // that first line at the pane's midpoint, so only half the pane height was
    // left for the rest of the range and anything taller ran off the bottom
    // (measured in a consuming app: 56% of an 18-line range visible, 29% of a
    // 34-line range). `start` gives the range the full pane height,
    // so a range that fits is fully visible and one that cannot fit starts at
    // the top. Changing this back to 'center' reopens QA A3.
    expect(scroll.mock.calls[0]?.[0]).toEqual({
      block: 'start',
      inline: 'nearest',
      behavior: 'instant',
    });
    scroll.mockRestore();
  });

  it('does not call scrollIntoView when offsets are null', () => {
    const scroll = spyScrollIntoView();
    renderCodeView({
      source: THREE_LINE_RUST,
      language: 'rust',
      reveal: { startLine: 99, endLine: 99 },
    });
    expect(scroll, 'INV-11: no kit mark means no scroll').not.toHaveBeenCalled();
    scroll.mockRestore();
  });

  /**
   * INV-11 restated for SF-14, with every assertion kept.
   *
   * The statement used to be "the pane has no line-number gutter" full stop. It is now
   * "reveal does not add one" — the gutter is a separate opt-in prop, and asking for a
   * range to be revealed still never conjures a column the consumer did not request.
   * That is the part of INV-11 reveal owns, and it is what this case pins: the reveal
   * arguments below are the only props passed, and nothing numbered appears.
   *
   * The opt-in side is `line-numbers.sf14.test.tsx`, which asserts the mirror property:
   * with `showLineNumbers`, the numbers exist and still contribute no characters to
   * `textContent`, so this file's last assertion holds in both modes for the same
   * reason — the numbers are generated content, never text nodes.
   */
  it('does not add a line-number gutter or line-number text when only reveal is set', () => {
    const { container } = renderCodeView({
      source: THREE_LINE_RUST,
      language: 'rust',
      reveal: { startLine: 2, endLine: 2 },
    });
    expect(container.querySelector('[class*="gutter"]')).toBeNull();
    expect(container.querySelector('[data-code-view-gutter]')).toBeNull();
    expect(container.querySelector('[id="n2"]')).toBeNull();
    expect(container.textContent).not.toMatch(/^\s*2\s/);
    expect(getScrollRegion(container).textContent).toBe(THREE_LINE_RUST);
  });
});
