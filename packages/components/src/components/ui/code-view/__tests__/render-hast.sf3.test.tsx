/**
 * @vitest-environment jsdom
 *
 * SF-3 · HAST renderer tests — INV-1, INV-3, INV-6, INV-14.
 */
import { render } from '@testing-library/react';
import type { Root } from 'hast';
import { describe, expect, it } from 'vitest';

import { renderHast } from '../render-hast';

function highlightedTree(children: Root['children']): Root {
  return { type: 'root', children };
}

const RENDER_OPTIONS = { source: 'fn main()', language: 'rust' as const };

describe('INV-1 and INV-14: restricted span traversal preserves source text', () => {
  it('renders text nodes verbatim and keeps token spans presentational', () => {
    const tree = highlightedTree([
      { type: 'text', value: 'fn ' },
      {
        type: 'element',
        tagName: 'span',
        properties: { className: ['hljs-keyword'] },
        children: [{ type: 'text', value: 'main' }],
      },
      { type: 'text', value: '()' },
    ]);
    const { container } = render(<code>{renderHast(tree, RENDER_OPTIONS)}</code>);
    expect(container.textContent).toBe('fn main()');
    const span = container.querySelector('span.hljs-keyword');
    expect(span?.getAttribute('role')).toBeNull();
    expect(span?.getAttribute('aria-label')).toBeNull();
    expect(span?.tabIndex).toBe(-1);
  });
});

describe('INV-3: unexpected HAST shapes throw before unsafe markup', () => {
  it('rejects unsupported element nodes', () => {
    const tree = highlightedTree([
      { type: 'element', tagName: 'div', properties: {}, children: [] },
    ]);
    expect(() => renderHast(tree, { source: '', language: 'plaintext' })).toThrow(
      /Unexpected HAST node/
    );
  });

  it('rejects span properties outside className', () => {
    const tree = highlightedTree([
      {
        type: 'element',
        tagName: 'span',
        properties: { id: 'danger' },
        children: [{ type: 'text', value: 'x' }],
      },
    ]);
    expect(() => renderHast(tree, { source: 'x', language: 'plaintext' })).toThrow(
      /Unexpected HAST property/
    );
  });
});

describe('INV-6: renderer accepts only Lowlight root/span/text contract', () => {
  it('accepts nested span trees with standard className arrays', () => {
    const tree = highlightedTree([
      {
        type: 'element',
        tagName: 'span',
        properties: { className: ['hljs-string'] },
        children: [{ type: 'text', value: '"ok"' }],
      },
    ]);
    const { container } = render(
      <code>{renderHast(tree, { source: '"ok"', language: 'rust' })}</code>
    );
    expect(container.querySelector('.hljs-string')?.textContent).toBe('"ok"');
  });
});
