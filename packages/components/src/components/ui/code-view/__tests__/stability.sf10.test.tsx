/**
 * @vitest-environment jsdom
 *
 * SF-10 · Performance / stability — INV-7, INV-8.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import React, { Component, type ReactNode } from 'react';

import { LANGUAGE_SAMPLES } from './fixtures/language-samples';
import { RUST_IMPORT_FIXTURE } from './fixtures/rust-import';

import { CodeView } from '../CodeView';
import * as highlightModule from '../highlight';
import { expectExactSourceText, renderCodeView } from './helpers';

const MODULE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

class TestErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }

  render(): ReactNode {
    if (this.state.error) {
      return <div data-testid="boundary-error">{this.state.error.message}</div>;
    }
    return this.props.children;
  }
}

describe('INV-7: decorator failure falls back per leaf', () => {
  it('keeps the pane up and source intact when decorateToken throws on one leaf', () => {
    const { container, queryByTestId } = render(
      <TestErrorBoundary>
        <CodeView
          source={RUST_IMPORT_FIXTURE}
          language="rust"
          decorateToken={({ token }) => {
            if (token.text === 'use') {
              throw new Error('wizard link mapper fault');
            }
            return undefined;
          }}
        />
      </TestErrorBoundary>
    );
    expect(queryByTestId('boundary-error')).toBeNull();
    expectExactSourceText(container, RUST_IMPORT_FIXTURE);
    expect(container.querySelector('span.hljs-keyword')?.textContent).toBe('use');
  });

  it('does not trip an outer error boundary when decorateToken throws on every leaf', () => {
    const { queryByTestId } = render(
      <TestErrorBoundary>
        <CodeView
          source="fn main() {}\n"
          language="rust"
          decorateToken={() => {
            throw new Error('always throws');
          }}
        />
      </TestErrorBoundary>
    );
    expect(queryByTestId('boundary-error')).toBeNull();
  });
});

describe('INV-8: tokenization depends only on source and language', () => {
  it('does not re-tokenize when only decorateToken identity changes', () => {
    const spy = vi.spyOn(highlightModule, 'highlightSource');
    const source = LANGUAGE_SAMPLES.rust;
    const firstDecorator = () => undefined;
    const view = renderCodeView({ source, language: 'rust', decorateToken: firstDecorator });
    expect(spy).toHaveBeenCalledTimes(1);

    const secondDecorator = () => <mark>decorated</mark>;
    view.rerender(<CodeView source={source} language="rust" decorateToken={secondDecorator} />);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(view.container.querySelector('mark')).not.toBeNull();
    spy.mockRestore();
  });

  it('documents decorateToken is excluded from highlight useMemo dependencies', () => {
    const source = readFileSync(join(MODULE_DIR, 'CodeView.tsx'), 'utf-8');
    expect(source).toMatch(
      /useMemo\(\(\) => highlightSource\(source, language\), \[source, language\]\)/
    );
    expect(source).not.toMatch(/\[source, language, decorateToken\]/);
  });
});
