/**
 * @vitest-environment jsdom
 *
 * SF-13 · HAST traversal under reveal — INV-2, INV-11, and the reveal half of QA A7.
 *
 * SF-13's other render duties live in `render-contract.sf13.test.tsx`, which asserts
 * the rendered DOM. This file asserts the React nodes `renderHast` returns, because
 * a missing key is invisible in the DOM.
 *
 * QA A7 background. `renderHastChildren` returns `children.map(...)`, so every element
 * member needs a key. The kit's default leaf is a raw string and needs none, so the
 * defect only surfaced once a leaf started rendering as an element. A reveal wrap is
 * one such element — and because a range resolves to one `<mark>` per token run rather
 * than one per line (see `token-styles.ts`), a single revealed line can produce several.
 *
 * Seen to fail: with the `keyTextLeaf` call removed from `renderHastNode`, the two key
 * assertions below fail and React logs `Each child in a list should have a unique "key"
 * prop` naming `CodeView`. React dedupes that warning per component type for the life
 * of the module registry, which is why the guard asserts the keys directly instead of
 * spying on `console.error`: only the first offending render in a file would ever warn.
 */
import { describe, expect, it } from 'vitest';
import React from 'react';

import { RUST_IMPORT_FIXTURE } from './fixtures/rust-import';

import { highlightSource } from '../highlight';
import { renderHast } from '../render-hast';
import { resolveRevealRange } from '../reveal';
import type { CodeViewReveal, CodeViewTokenDecorator } from '../types';
import { expectEveryElementChildKeyed } from './helpers';

const MULTI_TOKEN_RUST = `${RUST_IMPORT_FIXTURE}fn main() {\n    let total = 1;\n}\n`;

function revealedTree(
  reveal: CodeViewReveal,
  decorateToken?: CodeViewTokenDecorator
): React.ReactNode {
  const result = highlightSource(MULTI_TOKEN_RUST, 'rust');
  expect(result.kind, 'rust fixture must tokenize').toBe('highlighted');
  if (result.kind !== 'highlighted') {
    throw new Error('unreachable');
  }

  const revealOffsets = resolveRevealRange(MULTI_TOKEN_RUST, reveal);
  expect(
    revealOffsets,
    'the fixture range must resolve, or this guard proves nothing'
  ).not.toBeNull();

  return renderHast(result.tree, {
    source: MULTI_TOKEN_RUST,
    language: 'rust',
    decorateToken,
    revealOffsets,
  });
}

describe('QA A7 / INV-2: a reveal wrap is keyed like any other mapped sibling', () => {
  it('keys every element for a range spanning several token runs', () => {
    const node = revealedTree({ startLine: 2, endLine: 3 });

    expectEveryElementChildKeyed(node, 'QA A7 / SF-13: reveal wrap');
  });

  it('keys every element when a decorator and a reveal both wrap the same leaf', () => {
    const node = revealedTree({ startLine: 1, endLine: 2 }, ({ token }) =>
      token.text.includes('acme_lib') ? (
        <a href="https://example.test/acme_lib">{token.text}</a>
      ) : undefined
    );

    expectEveryElementChildKeyed(node, 'QA A7 / SF-13: decorate + reveal on one leaf');
  });

  it('leaves leaves outside the range as unkeyed strings, which need no key', () => {
    const node = revealedTree({ startLine: 3, endLine: 3 });

    expect(
      (node as React.ReactNode[]).some((member) => typeof member === 'string'),
      'a leaf outside the range must stay a raw string: keying it would cost a wrapper per leaf'
    ).toBe(true);
    expectEveryElementChildKeyed(node, 'QA A7 / SF-13: leaves outside the range');
  });
});
