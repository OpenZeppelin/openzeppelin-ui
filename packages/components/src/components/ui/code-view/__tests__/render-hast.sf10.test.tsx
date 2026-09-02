/**
 * @vitest-environment jsdom
 *
 * SF-10 · HAST traversal — INV-1, INV-5, INV-6, INV-7.
 *
 * Also guards the decorator half of QA A7: a decorator that returns an element puts
 * that element into a mapped sibling array, where React requires a key.
 */
import { render } from '@testing-library/react';
import type { Root } from 'hast';
import { describe, expect, it } from 'vitest';
import React from 'react';

import { RUST_IMPORT_FIXTURE } from './fixtures/rust-import';

import { highlightSource } from '../highlight';
import { renderHast } from '../render-hast';
import type { CodeViewDecorationContext, CodeViewTokenDecorator } from '../types';
import { expectNoNestedDuplicateHljsSpans } from './decoration-helpers';
import { expectEveryElementChildKeyed } from './helpers';

function highlightedTree(children: Root['children']): Root {
  return { type: 'root', children };
}

describe('INV-5: token descriptor matches source slice at offset', () => {
  it('aligns every callback offset with source.slice for a real rust highlight tree', () => {
    const source = RUST_IMPORT_FIXTURE;
    const result = highlightSource(source, 'rust');
    expect(result.kind).toBe('highlighted');
    if (result.kind !== 'highlighted') {
      return;
    }

    const invocations: CodeViewDecorationContext[] = [];
    render(
      <code>
        {renderHast(result.tree, {
          source,
          language: 'rust',
          decorateToken: (context) => {
            invocations.push(context);
            return undefined;
          },
        })}
      </code>
    );

    expect(invocations.length).toBeGreaterThan(0);
    for (const { token } of invocations) {
      expect(source.slice(token.offset, token.offset + token.text.length)).toBe(token.text);
    }
  });

  it('advances offset after decorator returns custom content', () => {
    const source = 'ab';
    const tree = highlightedTree([
      { type: 'text', value: 'a' },
      { type: 'text', value: 'b' },
    ]);
    const offsets: number[] = [];
    render(
      <code>
        {renderHast(tree, {
          source,
          language: 'plaintext',
          decorateToken: ({ token }) => {
            offsets.push(token.offset);
            return token.text === 'a' ? <mark>a</mark> : undefined;
          },
        })}
      </code>
    );
    expect(offsets).toEqual([0, 1]);
  });
});

describe('INV-6: callback granularity is one text leaf', () => {
  it('invokes separately for classified keywords and unclassified path text', () => {
    const source = RUST_IMPORT_FIXTURE;
    const result = highlightSource(source, 'rust');
    expect(result.kind).toBe('highlighted');
    if (result.kind !== 'highlighted') {
      return;
    }

    const invocations: CodeViewDecorationContext[] = [];
    const { container } = render(
      <code>
        {renderHast(result.tree, {
          source,
          language: 'rust',
          decorateToken: (context) => {
            invocations.push(context);
            return undefined;
          },
        })}
      </code>
    );

    const classified = invocations.filter((ctx) => ctx.token.className?.includes('hljs-keyword'));
    const unclassified = invocations.filter((ctx) => ctx.token.className === undefined);
    expect(classified.length).toBeGreaterThan(0);
    expect(unclassified.length).toBeGreaterThan(0);
    expect(classified.some((ctx) => ctx.token.text === 'use')).toBe(true);
    expect(unclassified.some((ctx) => ctx.token.text.includes('acme_lib'))).toBe(true);

    const keywordSpan = container.querySelector('span.hljs-keyword');
    expect(keywordSpan?.textContent).toBe('use');
    expectNoNestedDuplicateHljsSpans(container);
  });

  it('preserves parent span wrapper when decorating classified leaves', () => {
    const tree = highlightedTree([
      {
        type: 'element',
        tagName: 'span',
        properties: { className: ['hljs-keyword'] },
        children: [{ type: 'text', value: 'fn' }],
      },
    ]);
    const { container } = render(
      <code>
        {renderHast(tree, {
          source: 'fn',
          language: 'rust',
          decorateToken: () => <mark>fn</mark>,
        })}
      </code>
    );
    const span = container.querySelector('span.hljs-keyword');
    expect(span).not.toBeNull();
    expect(span?.querySelector('mark')?.textContent).toBe('fn');
    expect(span?.querySelector('span.hljs-keyword')).toBeNull();
  });

  it('allows fragment splits at root for unclassified leaves', () => {
    const tree = highlightedTree([{ type: 'text', value: 'path::segment' }]);
    const { container } = render(
      <code>
        {renderHast(tree, {
          source: 'path::segment',
          language: 'rust',
          decorateToken: () => (
            <>
              path::
              <a href="https://example.com/segment">segment</a>
            </>
          ),
        })}
      </code>
    );
    expect(container.textContent).toBe('path::segment');
    expect(container.querySelector('a')?.textContent).toBe('segment');
  });
});

describe('INV-7: decorator failure falls back per leaf', () => {
  it('renders default leaf output when decorateToken throws for one leaf only', () => {
    const tree = highlightedTree([
      { type: 'text', value: 'ok ' },
      {
        type: 'element',
        tagName: 'span',
        properties: { className: ['hljs-keyword'] },
        children: [{ type: 'text', value: 'fn' }],
      },
    ]);
    const { container } = render(
      <code>
        {renderHast(tree, {
          source: 'ok fn',
          language: 'rust',
          decorateToken: ({ token }) => {
            if (token.text === 'fn') {
              throw new Error('decorator fault');
            }
            return undefined;
          },
        })}
      </code>
    );
    expect(container.textContent).toBe('ok fn');
    expect(container.querySelector('span.hljs-keyword')?.textContent).toBe('fn');
    expectNoNestedDuplicateHljsSpans(container);
  });

  it('does not propagate throws through renderHast', () => {
    const tree = highlightedTree([{ type: 'text', value: 'x' }]);
    expect(() =>
      render(
        <code>
          {renderHast(tree, {
            source: 'x',
            language: 'plaintext',
            decorateToken: () => {
              throw new Error('boom');
            },
          })}
        </code>
      )
    ).not.toThrow();
  });
});

describe('INV-1: a decorator-returned element is keyed like any other mapped sibling', () => {
  const source = RUST_IMPORT_FIXTURE;

  function renderedTree(decorateToken: CodeViewTokenDecorator): React.ReactNode {
    const result = highlightSource(source, 'rust');
    expect(result.kind).toBe('highlighted');
    if (result.kind !== 'highlighted') {
      throw new Error('rust fixture must tokenize');
    }
    return renderHast(result.tree, { source, language: 'rust', decorateToken });
  }

  it('keys a Fragment-returning decorator, the shape a consumer builds link runs with', () => {
    // The reported consumer returns <Fragment>{parts}</Fragment> for an import path.
    // Its inner parts are keyed by the consumer; the Fragment itself is the kit's
    // responsibility, because the kit is what puts it in an array.
    const node = renderedTree(({ token }) =>
      token.text.includes('acme_lib') ? (
        <React.Fragment>
          <a href="https://example.test/acme_lib">{token.text}</a>
        </React.Fragment>
      ) : undefined
    );

    expectEveryElementChildKeyed(node, 'QA A7 / SF-10: Fragment-returning decorator');
  });

  it('keys a decorator that returns a plain element for every leaf', () => {
    const node = renderedTree(({ token }) => <span data-decorated="">{token.text}</span>);

    expectEveryElementChildKeyed(node, 'QA A7 / SF-10: element-returning decorator');
  });

  it('leaves an undecorated leaf as an unkeyed string, which needs no key', () => {
    const node = renderedTree(() => undefined);

    expect(Array.isArray(node)).toBe(true);
    expectEveryElementChildKeyed(node, 'QA A7 / SF-10: no decoration');
    expect(
      (node as React.ReactNode[]).some((member) => typeof member === 'string'),
      'the default leaf must stay a raw string: keying it would cost a wrapper per leaf'
    ).toBe(true);
  });
});
