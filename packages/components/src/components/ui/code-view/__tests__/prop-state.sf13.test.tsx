/**
 * @vitest-environment jsdom
 *
 * SF-13 · Prop / State Contract — INV-4, INV-5, INV-6.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import React from 'react';

import { CodeView } from '../CodeView';
import * as renderHastModule from '../render-hast';
import {
  CODE_VIEW_REVEAL_MARK_STYLE_CLASSES,
  CODE_VIEW_TOKEN_STYLE_CLASSES,
} from '../token-styles';
import type { CodeViewReveal } from '../types';
import { expectExactSourceText, getCodeElement, renderCodeView } from './helpers';
import {
  expectNoKitRevealMark,
  getKitRevealMarks,
  spyScrollIntoView,
  TEN_LINE_SOURCE,
  THREE_LINE_RUST,
} from './reveal-helpers';

const MODULE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY_FILE = join(dirname(fileURLToPath(import.meta.url)), '../../../../code-view.ts');

const DOMAIN_VOCABULARY = [
  /\bstellar[_-]/i,
  /\bCargo\.toml\b/,
  /\brev\s*=/,
  /\bgithub\.com\/openzeppelin\b/i,
  /\bstellar-contracts\b/i,
  /\bRWA\b/,
  /field[- ]impact/i,
] as const;

const PRODUCT_FILES = [
  'types.ts',
  'CodeView.tsx',
  'render-hast.tsx',
  'highlight.ts',
  'token-styles.ts',
  'reveal.ts',
  'line-numbers.tsx',
] as const;

const INVALID_REVEALS: ReadonlyArray<{ label: string; reveal: CodeViewReveal }> = [
  { label: 'NaN', reveal: { startLine: Number.NaN, endLine: 1 } },
  { label: 'Infinity', reveal: { startLine: 1, endLine: Number.POSITIVE_INFINITY } },
  { label: 'fractional 1.5', reveal: { startLine: 1.5, endLine: 2 } },
  { label: 'zero', reveal: { startLine: 0, endLine: 1 } },
  { label: 'negative', reveal: { startLine: -1, endLine: 2 } },
  { label: 'inverted', reveal: { startLine: 5, endLine: 3 } },
  { label: 'both bounds past the end', reveal: { startLine: 1000, endLine: 1001 } },
  { label: 'end bound past the end', reveal: { startLine: 5, endLine: 100 } },
];

describe('INV-4: public API stays one optional prop and one type', () => {
  it('re-exports CodeViewReveal from the subpath entry and hides private offset types', () => {
    const entrySource = readFileSync(ENTRY_FILE, 'utf-8');
    expect(entrySource).toContain('CodeViewReveal');
    expect(entrySource).not.toMatch(/export\s+\{[^}]*resolveRevealRange/);
    expect(entrySource).not.toContain('RevealOffsets');
    expect(entrySource).not.toContain('RenderHastOptions');
    expect(entrySource).not.toContain('useImperativeHandle');
    expect(entrySource).not.toContain('forwardRef');
  });

  /**
   * INV-4 restated, not relaxed.
   *
   * The original assertion here was `types).not.toMatch(/\blineNumbers\b/)`, standing
   * for SF-3 design decision 8 and SF-13's "out of scope: a visible line-number gutter,
   * `lineNumbers` prop, or CSS counter". SF-14 reverses that one item on the consumer's
   * request: a reveal that lands you on line 207 in a pane with no numbers cannot tell
   * you it is line 207, which is the whole point of jumping there.
   *
   * What INV-4 was actually protecting survives and is asserted below: no handle, no
   * imperative reveal, no second alignment API, and — the part that matters most — the
   * gutter is opt-in, so a consumer that does not ask for it gets the DOM it had.
   *
   * Note the original regex would have gone on passing untouched: `showLineNumbers`
   * contains no word boundary before `lineNumbers`, and the dist scan's
   * `toContain('lineNumbers')` is case-sensitive against `LineNumbers`. Leaving them in
   * place would have left two assertions that read as a ban on a feature that ships.
   */
  it('does not grow a handle or a second reveal API, and keeps the gutter opt-in', () => {
    const codeView = readFileSync(join(MODULE_DIR, 'CodeView.tsx'), 'utf-8');
    const types = readFileSync(join(MODULE_DIR, 'types.ts'), 'utf-8');
    expect(codeView).not.toMatch(/useImperativeHandle/);
    expect(codeView).not.toMatch(/forwardRef/);
    expect(types).not.toMatch(/\bhighlightClassName\b/);
    expect(types).not.toMatch(/\bscrollBehavior\b/);
    expect(types).not.toMatch(/\bIfOutsideViewport\b/);
    expect(codeView).not.toMatch(/reveal\s*\(/);

    expect(types, 'the gutter is one optional boolean, not an options object').toMatch(
      /readonly showLineNumbers\?: boolean;/
    );
    expect(codeView, 'INV-4: off unless asked for, so an existing consumer sees no change').toMatch(
      /showLineNumbers = false/
    );
    expect(
      types,
      'INV-4: reveal alignment stays the pane\u2019s business, gutter or not'
    ).not.toMatch(/\bcontextLines\b|\bscrollMargin\b|\brevealBlock\b/);
  });

  it.each(PRODUCT_FILES)('keeps %s free of Stellar/RWA/field-impact vocabulary', (fileName) => {
    const source = readFileSync(join(MODULE_DIR, fileName), 'utf-8');
    for (const pattern of DOMAIN_VOCABULARY) {
      expect(source, `${fileName} must not match ${pattern}`).not.toMatch(pattern);
    }
  });

  it('keeps the token-style class list free of always-on mark paint', () => {
    expect(
      CODE_VIEW_TOKEN_STYLE_CLASSES,
      'INV-1 / INV-4: omit-reveal class list must not contain [&_mark]'
    ).not.toContain('[&_mark]');
    expect(CODE_VIEW_REVEAL_MARK_STYLE_CLASSES).toContain('[&_mark]:bg-selected/15');
    expect(CODE_VIEW_REVEAL_MARK_STYLE_CLASSES).toContain('[&_mark]:text-inherit');
  });
});

describe('INV-5: retrigger compares primitives, never the object', () => {
  it('does not re-scroll when a fresh inline object carries the same startLine, endLine, and omitted id', () => {
    const scroll = spyScrollIntoView();
    const source = THREE_LINE_RUST;
    const view = renderCodeView({
      source,
      language: 'rust',
      reveal: { startLine: 2, endLine: 2 },
    });
    expect(scroll).toHaveBeenCalledTimes(1);
    scroll.mockClear();

    view.rerender(
      <CodeView source={source} language="rust" reveal={{ startLine: 2, endLine: 2 }} />
    );
    view.rerender(
      <CodeView source={source} language="rust" reveal={{ startLine: 2, endLine: 2 }} />
    );

    expect(
      scroll,
      'INV-5: drawer-drag allocates a new reveal object every frame; same primitives must not re-scroll'
    ).not.toHaveBeenCalled();
    scroll.mockRestore();
  });

  it('re-scrolls when only id changes, and treats a stable omitted id as undefined', () => {
    const scroll = spyScrollIntoView();
    const source = THREE_LINE_RUST;
    const view = renderCodeView({
      source,
      language: 'rust',
      reveal: { startLine: 2, endLine: 2 },
    });
    expect(scroll).toHaveBeenCalledTimes(1);

    scroll.mockClear();
    view.rerender(
      <CodeView source={source} language="rust" reveal={{ startLine: 2, endLine: 2, id: 0 }} />
    );
    expect(scroll, 'INV-5: undefined then 0 must retrigger').toHaveBeenCalledTimes(1);

    scroll.mockClear();
    view.rerender(
      <CodeView source={source} language="rust" reveal={{ startLine: 2, endLine: 2, id: 0 }} />
    );
    expect(scroll, 'INV-5: 0 then 0 must not retrigger').not.toHaveBeenCalled();

    scroll.mockClear();
    view.rerender(
      <CodeView source={source} language="rust" reveal={{ startLine: 2, endLine: 2, id: 1 }} />
    );
    expect(scroll, 'INV-5: 0 then 1 must retrigger').toHaveBeenCalledTimes(1);
    scroll.mockRestore();
  });

  it('does not rebuild the token tree when only id changes or the reveal object is new', () => {
    const renderSpy = vi.spyOn(renderHastModule, 'renderHast');
    const source = THREE_LINE_RUST;
    const view = renderCodeView({
      source,
      language: 'rust',
      reveal: { startLine: 2, endLine: 2, id: 3 },
    });
    expect(renderSpy).toHaveBeenCalledTimes(1);

    view.rerender(
      <CodeView source={source} language="rust" reveal={{ startLine: 2, endLine: 2, id: 4 }} />
    );
    expect(
      renderSpy,
      'INV-5 / INV-9: changing only id is a scroll, not a token-tree rebuild'
    ).toHaveBeenCalledTimes(1);

    view.rerender(
      <CodeView source={source} language="rust" reveal={{ startLine: 2, endLine: 2, id: 4 }} />
    );
    expect(
      renderSpy,
      'INV-5 / INV-9: a new object with the same primitives must not call renderHast again'
    ).toHaveBeenCalledTimes(1);

    view.rerender(
      <CodeView source={source} language="rust" reveal={{ startLine: 1, endLine: 1, id: 4 }} />
    );
    expect(renderSpy, 'INV-9: startLine change rebuilds marks').toHaveBeenCalledTimes(2);
    renderSpy.mockRestore();
  });
});

describe('INV-6: invalid ranges are no-ops on the pane', () => {
  it.each(INVALID_REVEALS)('does not throw, mark, or scroll for $label', ({ reveal }) => {
    const scroll = spyScrollIntoView();
    expect(() =>
      renderCodeView({
        source: TEN_LINE_SOURCE,
        language: 'plaintext',
        reveal,
      })
    ).not.toThrow();
    const { container } = renderCodeView({
      source: TEN_LINE_SOURCE,
      language: 'plaintext',
      reveal,
    });
    expectNoKitRevealMark(container, `INV-6: ${reveal.startLine},${reveal.endLine} must not paint`);
    expect(scroll).not.toHaveBeenCalled();
    expectExactSourceText(container, TEN_LINE_SOURCE);
    expect(getCodeElement(container).className).not.toContain(CODE_VIEW_REVEAL_MARK_STYLE_CLASSES);
    scroll.mockRestore();
  });

  it('does not throw, mark, or scroll when source is empty', () => {
    const scroll = spyScrollIntoView();
    const { container } = renderCodeView({
      source: '',
      language: 'plaintext',
      reveal: { startLine: 1, endLine: 1 },
    });
    expectNoKitRevealMark(container, 'INV-6: empty source with a reveal must leave no mark');
    expect(scroll).not.toHaveBeenCalled();
    expectExactSourceText(container, '');
    scroll.mockRestore();
  });

  it('drops the previous mark when a later reveal is invalid (no residue)', () => {
    const view = renderCodeView({
      source: TEN_LINE_SOURCE,
      language: 'plaintext',
      reveal: { startLine: 2, endLine: 3 },
    });
    expect(getKitRevealMarks(view.container).length).toBeGreaterThan(0);

    view.rerender(
      <CodeView
        source={TEN_LINE_SOURCE}
        language="plaintext"
        reveal={{ startLine: 1000, endLine: 1001 }}
      />
    );
    expectNoKitRevealMark(
      view.container,
      'INV-6: a later invalid reveal must remove the previous mark; there is no leftover ref'
    );
    expectExactSourceText(view.container, TEN_LINE_SOURCE);
  });

  it('marks the line numbers in the text on screen when a reused range stays in bounds', () => {
    const other = Array.from(
      { length: 10 },
      (_, index) => `other-${String(index + 1).padStart(2, '0')}`
    ).join('\n');
    const view = renderCodeView({
      source: TEN_LINE_SOURCE,
      language: 'plaintext',
      reveal: { startLine: 5, endLine: 6 },
    });
    expect(
      getKitRevealMarks(view.container)
        .map((mark) => mark.textContent)
        .join('')
    ).toContain('line-05');

    view.rerender(
      <CodeView source={other} language="plaintext" reveal={{ startLine: 5, endLine: 6 }} />
    );
    const marked = getKitRevealMarks(view.container)
      .map((mark) => mark.textContent)
      .join('');
    expect(marked, 'INV-6: in-bounds stale range marks those lines of the new text').toContain(
      'other-05'
    );
    expect(marked).toContain('other-06');
    expect(marked).not.toContain('line-05');
    expectExactSourceText(view.container, other);
  });

  it('leaves no mark and no residue when source shrinks under a still-set reveal', () => {
    const view = renderCodeView({
      source: TEN_LINE_SOURCE,
      language: 'plaintext',
      reveal: { startLine: 5, endLine: 6 },
    });
    expect(getKitRevealMarks(view.container).length).toBeGreaterThan(0);

    const short = 'a\nb\nc';
    view.rerender(
      <CodeView source={short} language="plaintext" reveal={{ startLine: 5, endLine: 6 }} />
    );
    expectNoKitRevealMark(
      view.container,
      'INV-6: range past the new line count must not clamp or stick'
    );
    expectExactSourceText(view.container, short);
    expect(getCodeElement(view.container).className).not.toContain(
      CODE_VIEW_REVEAL_MARK_STYLE_CLASSES
    );
  });

  it('applies reveal mark paint only when the range resolved', () => {
    const active = renderCodeView({
      source: TEN_LINE_SOURCE,
      language: 'plaintext',
      reveal: { startLine: 2, endLine: 2 },
    });
    expect(getCodeElement(active.container).className).toContain(
      CODE_VIEW_REVEAL_MARK_STYLE_CLASSES
    );

    const inactive = renderCodeView({
      source: TEN_LINE_SOURCE,
      language: 'plaintext',
      reveal: { startLine: 100, endLine: 101 },
    });
    expect(getCodeElement(inactive.container).className).not.toContain(
      CODE_VIEW_REVEAL_MARK_STYLE_CLASSES
    );
  });
});
