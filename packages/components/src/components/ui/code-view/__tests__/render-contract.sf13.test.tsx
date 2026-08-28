/**
 * @vitest-environment jsdom
 *
 * SF-13 · Render Contract — INV-1, INV-2, INV-3.
 */
import { render } from '@testing-library/react';
import type { Root } from 'hast';
import { describe, expect, it } from 'vitest';
import React from 'react';

import { LANGUAGE_SAMPLES, SOURCE_FIDELITY_FIXTURES } from './fixtures/language-samples';
import { RUST_IMPORT_FIXTURE } from './fixtures/rust-import';

import { renderHast } from '../render-hast';
import { resolveRevealRange } from '../reveal';
import {
  CODE_VIEW_REVEAL_MARK_STYLE_CLASSES,
  CODE_VIEW_TOKEN_STYLE_CLASSES,
} from '../token-styles';
import type { CodeViewTokenDecorator } from '../types';
import { expectNoNestedDuplicateHljsSpans } from './decoration-helpers';
import {
  expectExactSourceText,
  expectHighlightedToken,
  getCodeElement,
  renderCodeView,
} from './helpers';
import {
  expectNoKitRevealMark,
  getKitRevealMarks,
  spyScrollIntoView,
  THREE_LINE_RUST,
} from './reveal-helpers';

const splitLeafLinkDecorator: CodeViewTokenDecorator = ({ token }) => {
  const marker = 'acme_lib';
  const index = token.text.indexOf(marker);
  if (index === -1) {
    return undefined;
  }
  const prefix = token.text.slice(0, index);
  const suffix = token.text.slice(index + marker.length);
  return (
    <>
      {prefix}
      <a href="https://example.com/acme_lib">{marker}</a>
      {suffix}
    </>
  );
};

const keywordMarkDecorator: CodeViewTokenDecorator = ({ token }) =>
  token.className?.includes('hljs-keyword') ? <mark>{token.text}</mark> : undefined;

const keywordLinkDecorator: CodeViewTokenDecorator = ({ token }) =>
  token.className?.includes('hljs-keyword') ? (
    <a href="https://example.com/keyword">{token.text}</a>
  ) : undefined;

describe('INV-1: omitting reveal matches SF-10 output', () => {
  it('paints no kit mark and does not call scrollIntoView when reveal is omitted', () => {
    const scroll = spyScrollIntoView();
    const { container } = renderCodeView({
      source: LANGUAGE_SAMPLES.rust,
      language: 'rust',
    });
    expectNoKitRevealMark(container, 'INV-1: omit reveal must not paint a kit mark');
    expect(scroll, 'INV-1: omit reveal must not scroll').not.toHaveBeenCalled();
    expectExactSourceText(container, LANGUAGE_SAMPLES.rust);
    scroll.mockRestore();
  });

  it('keeps code className free of reveal mark paint when reveal is omitted', () => {
    const { container } = renderCodeView({
      source: LANGUAGE_SAMPLES.rust,
      language: 'rust',
    });
    const className = getCodeElement(container).className;
    expect(className).toContain(CODE_VIEW_TOKEN_STYLE_CLASSES);
    expect(className, 'INV-1: omit-reveal class list must not grow [&_mark] paint').not.toContain(
      CODE_VIEW_REVEAL_MARK_STYLE_CLASSES
    );
  });

  it('matches innerHTML of a second omit-reveal render (parity with current SF-10 fixtures)', () => {
    const first = renderCodeView({
      source: LANGUAGE_SAMPLES.rust,
      language: 'rust',
      decorateToken: keywordMarkDecorator,
    });
    const second = renderCodeView({
      source: LANGUAGE_SAMPLES.rust,
      language: 'rust',
      decorateToken: keywordMarkDecorator,
    });
    expect(first.container.innerHTML).toBe(second.container.innerHTML);
    expectNoKitRevealMark(first.container);
  });

  it('omits kit marks on the plaintext path when reveal is absent', () => {
    const { container } = renderCodeView({
      source: 'plain only\n',
      language: 'plaintext',
    });
    expectNoKitRevealMark(container);
    expectExactSourceText(container, 'plain only\n');
  });
});

describe('INV-2: source text survives reveal, decoration, and both', () => {
  it('keeps code.textContent === source under reveal alone', () => {
    const { container } = renderCodeView({
      source: THREE_LINE_RUST,
      language: 'rust',
      reveal: { startLine: 2, endLine: 2 },
    });
    expectExactSourceText(container, THREE_LINE_RUST);
    expect(getKitRevealMarks(container).length).toBeGreaterThan(0);
  });

  it('keeps code.textContent === source under decorateToken alone', () => {
    const { container } = renderCodeView({
      source: RUST_IMPORT_FIXTURE,
      language: 'rust',
      decorateToken: splitLeafLinkDecorator,
    });
    expectExactSourceText(container, RUST_IMPORT_FIXTURE);
    expectNoKitRevealMark(container, 'INV-2: decorateToken alone must not mint a kit reveal mark');
    expect(container.querySelector('a[href="https://example.com/acme_lib"]')?.textContent).toBe(
      'acme_lib'
    );
  });

  it('keeps code.textContent === source under reveal and decorateToken together', () => {
    const { container } = renderCodeView({
      source: RUST_IMPORT_FIXTURE,
      language: 'rust',
      decorateToken: splitLeafLinkDecorator,
      reveal: { startLine: 1, endLine: 1 },
    });
    expectExactSourceText(container, RUST_IMPORT_FIXTURE);
    expect(getKitRevealMarks(container).length).toBeGreaterThan(0);
    expect(container.querySelector('a[href="https://example.com/acme_lib"]')?.textContent).toBe(
      'acme_lib'
    );
    expectNoNestedDuplicateHljsSpans(container);
  });

  it.each(SOURCE_FIDELITY_FIXTURES.map((fixture) => [fixture.label, fixture] as const))(
    'preserves %s under a one-line reveal',
    (_label, fixture) => {
      const { container } = renderCodeView({
        source: fixture.source,
        language: fixture.language,
        reveal: { startLine: 1, endLine: 1 },
      });
      expectExactSourceText(container, fixture.source);
    }
  );

  it('preserves source for plaintext plus reveal', () => {
    const source = 'plain\ntext\n';
    const { container } = renderCodeView({
      source,
      language: 'plaintext',
      reveal: { startLine: 1, endLine: 1 },
    });
    expectExactSourceText(container, source);
    expect(getKitRevealMarks(container)[0]?.textContent).toBe('plain\n');
  });

  it('preserves source when a decorator <mark> nests inside a kit reveal mark', () => {
    const { container } = renderCodeView({
      source: THREE_LINE_RUST,
      language: 'rust',
      decorateToken: keywordMarkDecorator,
      reveal: { startLine: 1, endLine: 1 },
    });
    expectExactSourceText(container, THREE_LINE_RUST);
    const kitMark = getKitRevealMarks(container)[0];
    expect(kitMark?.querySelector('mark'), 'nested decorator mark is legal HTML').not.toBeNull();
    expect(
      container.textContent?.includes('Lines '),
      'INV-2: kit must not insert "Lines N-M" text'
    ).toBe(false);
  });

  it('over-highlights a straddling custom node without changing text (paint only)', () => {
    const source = 'AAAA\nBBBB\n';
    const tree: Root = { type: 'root', children: [{ type: 'text', value: source }] };
    const offsets = resolveRevealRange(source, { startLine: 2, endLine: 2 });
    expect(offsets).not.toBeNull();

    const sliced = render(
      <code>
        {renderHast(tree, {
          source,
          language: 'plaintext',
          revealOffsets: offsets,
        })}
      </code>
    );
    expect(sliced.container.textContent).toBe(source);
    expect(
      sliced.container.querySelector('[data-code-view-reveal]')?.textContent,
      'INV-2: default strings may slice; only the overlapping characters are marked'
    ).toBe('BBBB\n');

    const wrapped = render(
      <code>
        {renderHast(tree, {
          source,
          language: 'plaintext',
          revealOffsets: offsets,
          decorateToken: ({ token }) => <a href="https://example.com/leaf">{token.text}</a>,
        })}
      </code>
    );
    expect(wrapped.container.textContent, 'INV-2: over-paint must not change text').toBe(source);
    expect(
      wrapped.container.querySelector('[data-code-view-reveal]')?.textContent,
      'INV-2: a custom node that straddles the interval is wrapped whole'
    ).toBe(source);
    expect(wrapped.container.querySelector('a')?.textContent).toBe(source);
  });
});

describe('INV-3: decorator still runs on the intact leaf', () => {
  it('invokes decorateToken the same number of times with and without reveal', () => {
    const invocationsWithout: string[] = [];
    const invocationsWith: string[] = [];
    renderCodeView({
      source: RUST_IMPORT_FIXTURE,
      language: 'rust',
      decorateToken: ({ token }) => {
        invocationsWithout.push(token.text);
        return undefined;
      },
    });
    renderCodeView({
      source: RUST_IMPORT_FIXTURE,
      language: 'rust',
      reveal: { startLine: 1, endLine: 1 },
      decorateToken: ({ token }) => {
        invocationsWith.push(token.text);
        return undefined;
      },
    });
    expect(
      invocationsWith,
      'INV-3: reveal must not change callback count or slice the leaf first'
    ).toEqual(invocationsWithout);
    expect(invocationsWith.some((text) => text.includes('acme_lib'))).toBe(true);
  });

  it('keeps a classified keyword inside one hljs span with both wrappers', () => {
    const { container } = renderCodeView({
      source: 'fn main() {}\n',
      language: 'rust',
      decorateToken: keywordLinkDecorator,
      reveal: { startLine: 1, endLine: 1 },
    });
    expectExactSourceText(container, 'fn main() {}\n');
    expectNoNestedDuplicateHljsSpans(container);
    const keywordSpan = container.querySelector('span.hljs-keyword');
    expect(keywordSpan?.querySelector('span.hljs-keyword')).toBeNull();
    expect(keywordSpan?.querySelector('[data-code-view-reveal]')).not.toBeNull();
    expect(keywordSpan?.querySelector('a[href="https://example.com/keyword"]')?.textContent).toBe(
      'fn'
    );
    expectHighlightedToken(container, 'hljs-keyword');
  });

  it('does not call decorateToken on plaintext even when reveal is set', () => {
    let callCount = 0;
    const { container } = renderCodeView({
      source: 'plain only\n',
      language: 'plaintext',
      reveal: { startLine: 1, endLine: 1 },
      decorateToken: () => {
        callCount += 1;
        return undefined;
      },
    });
    expect(callCount, 'INV-3: plaintext still never calls decorateToken').toBe(0);
    expectExactSourceText(container, 'plain only\n');
    expect(getKitRevealMarks(container).length).toBeGreaterThan(0);
  });
});

describe('INV-2 / INV-6: empty last line is a zero-character mark', () => {
  it('emits an empty kit mark for the trailing empty line and leaves textContent unchanged', () => {
    const source = 'hello\n';
    const { container } = renderCodeView({
      source,
      language: 'plaintext',
      reveal: { startLine: 2, endLine: 2 },
    });
    expectExactSourceText(container, source);
    const marks = getKitRevealMarks(container);
    expect(marks).toHaveLength(1);
    expect(marks[0]?.textContent).toBe('');
  });
});
