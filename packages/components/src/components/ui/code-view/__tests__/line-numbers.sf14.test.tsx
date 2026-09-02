/**
 * @vitest-environment jsdom
 *
 * SF-14 · Line-number gutter — render contract and the source-fidelity guarantee.
 *
 * This file owns the opt-in half of the restated INV-11. `interaction.sf13.test.tsx`
 * asserts that `reveal` alone still conjures no column; here the column is asked for,
 * and the property that must survive is the one SF-3 INV-1 / SF-13 INV-2 have always
 * carried: the pane shows exactly `source` and nothing else.
 *
 * Why that holds with numbers on screen: each row is an empty `<span data-line="n">`
 * and the digits are painted by `::before { content: attr(data-line) }`. Generated
 * content is not a text node, so it is absent from `textContent` and cannot be picked
 * up by a selection — which is what stops a user copying a snippet and pasting line
 * numbers with it. jsdom applies no stylesheet, so what these tests actually prove is
 * the structural half: the numbers live in attributes, not in the DOM's text. The
 * painted half (rows land on their code lines, the column stays pinned during
 * horizontal scroll) is layout, and lives in `code-view.browser.test.tsx`.
 */
import { describe, expect, it, vi } from 'vitest';
import React from 'react';

import { CodeView } from '../CodeView';
import * as renderHastModule from '../render-hast';
import { countSourceLines, resolveRevealRange } from '../reveal';
import type { CodeViewTokenDecorator } from '../types';
import { expectExactSourceText, getCodeElement, getScrollRegion, renderCodeView } from './helpers';
import { getKitRevealMarks, TEN_LINE_SOURCE, THREE_LINE_RUST } from './reveal-helpers';

const GUTTER_SELECTOR = '[data-code-view-gutter]';

function getGutter(container: HTMLElement): HTMLElement | null {
  const gutter = getScrollRegion(container).querySelector(GUTTER_SELECTOR);
  return gutter instanceof HTMLElement ? gutter : null;
}

function getRowNumbers(container: HTMLElement): string[] {
  const gutter = getGutter(container);
  if (!gutter) {
    throw new Error('expected a gutter');
  }
  return [...gutter.children].map((row) => row.getAttribute('data-line') ?? '');
}

describe('SF-14: the gutter is opt-in and off by default', () => {
  it.each([
    ['prop omitted', undefined],
    ['explicitly false', false],
  ])('renders no gutter when the prop is %s', (_label, showLineNumbers) => {
    const { container } = renderCodeView({
      source: TEN_LINE_SOURCE,
      language: 'plaintext',
      showLineNumbers,
    });

    expect(getGutter(container)).toBeNull();
  });

  it('emits byte-identical markup with the prop omitted and with it false', () => {
    const omitted = renderCodeView({ source: THREE_LINE_RUST, language: 'rust' });
    const explicit = renderCodeView({
      source: THREE_LINE_RUST,
      language: 'rust',
      showLineNumbers: false,
    });

    expect(
      explicit.container.innerHTML,
      'INV-1: opting out must not be a different render path from never opting in'
    ).toBe(omitted.container.innerHTML);
  });

  it('renders no gutter for empty source, which is zero lines and not one blank row', () => {
    const { container } = renderCodeView({
      source: '',
      language: 'plaintext',
      showLineNumbers: true,
    });

    expect(countSourceLines('')).toBe(0);
    expect(
      getGutter(container),
      'an empty column would still hold its padding open beside an empty pane'
    ).toBeNull();
  });
});

describe('SF-14: rows number exactly the lines reveal can address', () => {
  it('renders one row per line, numbered from 1, in document order', () => {
    const { container } = renderCodeView({
      source: TEN_LINE_SOURCE,
      language: 'plaintext',
      showLineNumbers: true,
    });

    expect(getRowNumbers(container)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
  });

  /**
   * The count comes from `countSourceLines`, the same function `resolveRevealRange`
   * validates against, so the gutter cannot show a line the caller may not reveal or
   * omit one they may. `THREE_LINE_RUST` ends in a newline, which is the case where a
   * second, independently-written count would have drifted: the trailing break opens an
   * empty fourth line that is addressable, and an editor numbers it.
   */
  it('numbers the empty final line opened by a trailing newline, because reveal can address it', () => {
    const source = THREE_LINE_RUST;
    expect(source.endsWith('\n')).toBe(true);
    expect(countSourceLines(source)).toBe(4);

    const { container } = renderCodeView({ source, language: 'rust', showLineNumbers: true });

    expect(getRowNumbers(container)).toEqual(['1', '2', '3', '4']);
    expect(
      resolveRevealRange(source, { startLine: 4, endLine: 4 }),
      'the last numbered row must be a range the caller may reveal'
    ).not.toBeNull();
    expect(resolveRevealRange(source, { startLine: 5, endLine: 5 })).toBeNull();
  });

  it('follows the line count when source is replaced', () => {
    const view = renderCodeView({
      source: 'one\ntwo',
      language: 'plaintext',
      showLineNumbers: true,
    });
    expect(getRowNumbers(view.container)).toEqual(['1', '2']);

    view.rerender(
      <CodeView source={'one\ntwo\nthree\nfour'} language="plaintext" showLineNumbers />
    );

    expect(getRowNumbers(view.container)).toEqual(['1', '2', '3', '4']);
  });
});

describe('SF-14: the gutter adds no characters and no reading order', () => {
  it('keeps code.textContent and pre.textContent equal to source', () => {
    const { container } = renderCodeView({
      source: TEN_LINE_SOURCE,
      language: 'plaintext',
      showLineNumbers: true,
    });

    expectExactSourceText(container, TEN_LINE_SOURCE);
    expect(
      getScrollRegion(container).textContent,
      'the numbers are generated content, so even the pre carries only the source'
    ).toBe(TEN_LINE_SOURCE);
  });

  it('holds source fidelity with reveal and a decorator both active', () => {
    const decorateToken: CodeViewTokenDecorator = ({ token }) =>
      token.text === 'fn' ? <a href="https://example.test/fn">{token.text}</a> : undefined;

    const { container } = renderCodeView({
      source: THREE_LINE_RUST,
      language: 'rust',
      showLineNumbers: true,
      decorateToken,
      reveal: { startLine: 2, endLine: 2 },
    });

    expectExactSourceText(container, THREE_LINE_RUST);
    expect(getKitRevealMarks(container).length).toBeGreaterThan(0);
    expect(container.querySelector('a[href="https://example.test/fn"]')).not.toBeNull();
  });

  it('puts no digits inside the code element and no text inside the gutter', () => {
    const { container } = renderCodeView({
      source: TEN_LINE_SOURCE,
      language: 'plaintext',
      showLineNumbers: true,
    });

    const gutter = getGutter(container);
    expect(gutter?.textContent, 'a text node here would be copyable with the code').toBe('');
    expect(getCodeElement(container).querySelector(GUTTER_SELECTOR)).toBeNull();
  });

  it('hides the column from assistive technology so the reading order stays one document', () => {
    const { container } = renderCodeView({
      source: TEN_LINE_SOURCE,
      language: 'plaintext',
      showLineNumbers: true,
    });

    const gutter = getGutter(container);
    expect(gutter?.getAttribute('aria-hidden')).toBe('true');
    expect(gutter?.getAttribute('role')).toBeNull();
    expect(
      getScrollRegion(container).tabIndex,
      'the pre is still the sole tab stop; the column adds none'
    ).toBe(0);
    for (const row of [...(gutter?.children ?? [])]) {
      expect(row.getAttribute('tabindex')).toBeNull();
    }
  });
});

describe('SF-14: the gutter is outside the tokenizer and the render memo', () => {
  it('does not rebuild the token tree when the prop is toggled', () => {
    const renderHast = vi.spyOn(renderHastModule, 'renderHast');
    const view = renderCodeView({ source: THREE_LINE_RUST, language: 'rust' });
    const before = renderHast.mock.calls.length;

    view.rerender(<CodeView source={THREE_LINE_RUST} language="rust" showLineNumbers />);

    expect(
      renderHast.mock.calls.length,
      'the column is a sibling of the code, so turning it on cannot re-tokenize the file'
    ).toBe(before);
    renderHast.mockRestore();
  });
});
