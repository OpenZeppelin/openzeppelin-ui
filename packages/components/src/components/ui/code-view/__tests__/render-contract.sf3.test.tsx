/**
 * @vitest-environment jsdom
 *
 * SF-3 · Render Contract — INV-1, INV-2, INV-3, INV-12.
 */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  EXPECTED_TOKEN_CLASS,
  LANGUAGE_SAMPLES,
  RUST_KEYWORD_FIXTURE,
  SOURCE_FIDELITY_FIXTURES,
} from './fixtures/language-samples';

import { CodeView } from '../CodeView';
import * as highlightModule from '../highlight';
import {
  expectExactSourceText,
  expectHighlightedToken,
  getCodeElement,
  getScrollRegion,
  readDeployShFixture,
  renderCodeView,
} from './helpers';

describe('INV-1: one semantic code document preserves the source', () => {
  it.each(SOURCE_FIDELITY_FIXTURES.map((fixture) => [fixture.label, fixture] as const))(
    'preserves %s byte-for-byte in code.textContent',
    (_label, fixture) => {
      const { container } = renderCodeView({
        source: fixture.source,
        language: fixture.language,
      });
      expectExactSourceText(container, fixture.source);
    }
  );

  it('renders exactly one focusable pre containing exactly one code element', () => {
    const { container } = renderCodeView({
      source: 'fn main() {}\n',
      language: 'rust',
    });
    expect(container.querySelectorAll('pre')).toHaveLength(1);
    expect(container.querySelectorAll('code')).toHaveLength(1);
    expect(getScrollRegion(container).tabIndex).toBe(0);
  });
});

describe('INV-2: every declared language has deterministic rendering', () => {
  it.each(
    Object.entries(LANGUAGE_SAMPLES).map(([language, source]) => [language, source] as const)
  )('highlights %s with a representative hljs-* token span', (language, source) => {
    const { container } = renderCodeView({
      source,
      language: language as keyof typeof LANGUAGE_SAMPLES,
    });
    expectHighlightedToken(
      container,
      EXPECTED_TOKEN_CLASS[language as keyof typeof EXPECTED_TOKEN_CLASS]
    );
    expect(getCodeElement(container).className).toContain('hljs');
  });

  it('bypasses tokenization for plaintext and keeps one React text path', () => {
    const source = 'plain text only\n';
    const highlightSpy = vi.spyOn(highlightModule, 'highlightSource');
    const { container } = renderCodeView({ source, language: 'plaintext' });
    expectExactSourceText(container, source);
    expect(container.querySelector('span[class*="hljs-"]')).toBeNull();
    expect(highlightSpy.mock.results.at(-1)?.value).toMatchObject({
      kind: 'plaintext',
      cause: 'requested',
    });
    highlightSpy.mockRestore();
  });
});

describe('INV-3: highlighting failure reveals source, never markup', () => {
  it('falls back to escaped plaintext when tokenization throws', () => {
    vi.spyOn(highlightModule, 'highlightSource').mockReturnValueOnce({
      kind: 'plaintext',
      source: RUST_KEYWORD_FIXTURE,
      cause: 'tokenizer-error',
    });
    const { container } = renderCodeView({ source: RUST_KEYWORD_FIXTURE, language: 'rust' });
    expectExactSourceText(container, RUST_KEYWORD_FIXTURE);
    expect(container.querySelector('script')).toBeNull();
    vi.restoreAllMocks();
  });

  it('does not inject HTML from script-like source on plaintext fallback', () => {
    const source = '<img src=x onerror=alert(1)>';
    const { container } = renderCodeView({ source, language: 'plaintext' });
    expectExactSourceText(container, source);
    expect(container.querySelector('img')).toBeNull();
  });

  it('falls back to source when renderHast rejects unexpected HAST', () => {
    vi.spyOn(highlightModule, 'highlightSource').mockReturnValueOnce({
      kind: 'highlighted',
      tree: {
        type: 'root',
        children: [{ type: 'element', tagName: 'div', properties: {}, children: [] }],
      },
    });
    const source = 'safe source\n';
    const { container } = render(<CodeView source={source} language="rust" />);
    expectExactSourceText(container, source);
    vi.restoreAllMocks();
  });
});

describe('INV-12: every synchronous outcome still renders the code region', () => {
  it('renders the named focusable region for empty source', () => {
    const { container, getByLabelText } = renderCodeView({ source: '', language: 'plaintext' });
    expect(getByLabelText('Source code')).toBe(getScrollRegion(container));
    expectExactSourceText(container, '');
  });

  it('replaces displayed text on prop update without stale previous source', () => {
    const first = renderCodeView({ source: 'first', language: 'plaintext' });
    expectExactSourceText(first.container, 'first');
    first.rerender(<CodeView source="second" language="plaintext" />);
    expectExactSourceText(first.container, 'second');
    expect(first.container.textContent).not.toContain('first');
  });

  it('never renders loading, error, or spinner chrome on tokenizer failure', () => {
    vi.spyOn(highlightModule, 'highlightSource').mockImplementation(() => ({
      kind: 'plaintext',
      source: 'broken but visible\n',
      cause: 'tokenizer-error',
    }));
    const { container, queryByRole } = renderCodeView({
      source: 'broken but visible\n',
      language: 'rust',
    });
    expect(queryByRole('status')).toBeNull();
    expect(queryByRole('alert')).toBeNull();
    expect(container.textContent).toContain('broken but visible');
    vi.restoreAllMocks();
  });
});

describe('INV-9 (render arm): the real generated deploy.sh stays on the highlighted path', () => {
  it('renders token spans for the full deploy.sh fixture without a size cutoff', () => {
    const source = readDeployShFixture();
    expect(source.length).toBeGreaterThan(5_000);
    const { container } = renderCodeView({ source, language: 'shell' });
    expectExactSourceText(container, source);
    expectHighlightedToken(container, 'hljs-built_in');
    expectHighlightedToken(container, 'hljs-string');
  });
});
