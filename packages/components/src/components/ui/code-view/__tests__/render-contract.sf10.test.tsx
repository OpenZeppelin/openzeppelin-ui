/**
 * @vitest-environment jsdom
 *
 * SF-10 · Render Contract — INV-1, INV-2, INV-3.
 */
import { describe, expect, it } from 'vitest';
import React from 'react';

import { LANGUAGE_SAMPLES, SOURCE_FIDELITY_FIXTURES } from './fixtures/language-samples';
import { RUST_IMPORT_FIXTURE } from './fixtures/rust-import';

import type { CodeViewTokenDecorator } from '../types';
import { expectNoNestedDuplicateHljsSpans, renderParityBaseline } from './decoration-helpers';
import {
  expectExactSourceText,
  expectHighlightedToken,
  getCodeElement,
  renderCodeView,
} from './helpers';

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

describe('INV-1: decoration preserves exact source text', () => {
  it('keeps code.textContent byte-identical when a leaf is split into prefix, link, and suffix', () => {
    const { container } = renderCodeView({
      source: RUST_IMPORT_FIXTURE,
      language: 'rust',
      decorateToken: splitLeafLinkDecorator,
    });
    expectExactSourceText(container, RUST_IMPORT_FIXTURE);
    expect(container.querySelector('a[href="https://example.com/acme_lib"]')?.textContent).toBe(
      'acme_lib'
    );
  });

  it.each(SOURCE_FIDELITY_FIXTURES.map((fixture) => [fixture.label, fixture] as const))(
    'preserves %s with an active mark decorator on classified tokens',
    (_label, fixture) => {
      const decorateToken: CodeViewTokenDecorator = ({ token }) => {
        if (token.className?.includes('hljs-keyword')) {
          return <mark data-testid="decorated-keyword">{token.text}</mark>;
        }
        return undefined;
      };
      const { container } = renderCodeView({
        source: fixture.source,
        language: fixture.language,
        decorateToken,
      });
      expectExactSourceText(container, fixture.source);
    }
  );

  it('does not nest duplicate hljs spans around classified keywords (double-span regression)', () => {
    const { container } = renderCodeView({
      source: 'fn main() {}\n',
      language: 'rust',
      decorateToken: ({ token }) =>
        token.className?.includes('hljs-keyword') ? <mark>{token.text}</mark> : undefined,
    });
    expectExactSourceText(container, 'fn main() {}\n');
    expectNoNestedDuplicateHljsSpans(container);
    const keywordSpan = container.querySelector('span.hljs-keyword');
    expect(keywordSpan?.childNodes).toHaveLength(1);
    expect(keywordSpan?.querySelector('span.hljs-keyword')).toBeNull();
  });
});

describe('INV-2: omitted decorator matches SF-3 highlighting', () => {
  it.each(
    Object.entries(LANGUAGE_SAMPLES).map(([language, source]) => [language, source] as const)
  )('matches SF-3 DOM for %s when decorateToken is omitted', (language, source) => {
    const { withoutDecorator, withNoOpDecorator } = renderParityBaseline(
      source,
      language as keyof typeof LANGUAGE_SAMPLES
    );
    expect(withNoOpDecorator, 'noop decorator must not alter highlighted output').toBe(
      withoutDecorator
    );
  });

  it('does not invoke decorateToken on plaintext language', () => {
    const source = 'plain only\n';
    let callCount = 0;
    const { container } = renderCodeView({
      source,
      language: 'plaintext',
      decorateToken: () => {
        callCount += 1;
        return undefined;
      },
    });
    expect(callCount).toBe(0);
    expectExactSourceText(container, source);
    expect(container.querySelector('span[class*="hljs-"]')).toBeNull();
  });

  it('matches SF-3 highlighted structure for rust without a decorator', () => {
    const { container } = renderCodeView({
      source: LANGUAGE_SAMPLES.rust,
      language: 'rust',
    });
    expectHighlightedToken(container, 'hljs-keyword');
    expect(getCodeElement(container).className).toContain('hljs');
    expectNoNestedDuplicateHljsSpans(container);
  });
});

describe('INV-3: nullish decorator return keeps default leaf rendering', () => {
  it('leaves skipped tokens unlinked and highlighted when decorator returns undefined', () => {
    const { container } = renderCodeView({
      source: RUST_IMPORT_FIXTURE,
      language: 'rust',
      decorateToken: () => undefined,
    });
    expect(container.querySelector('a')).toBeNull();
    expectHighlightedToken(container, 'hljs-keyword');
    expectExactSourceText(container, RUST_IMPORT_FIXTURE);
  });

  it('treats null the same as undefined for default leaf rendering', () => {
    const { withoutDecorator } = renderParityBaseline(LANGUAGE_SAMPLES.json, 'json');
    const withNullDecorator = renderCodeView({
      source: LANGUAGE_SAMPLES.json,
      language: 'json',
      decorateToken: () => null,
    });
    expect(withNullDecorator.container.innerHTML).toBe(withoutDecorator);
  });
});
