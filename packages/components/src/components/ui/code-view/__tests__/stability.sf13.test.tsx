/**
 * @vitest-environment jsdom
 *
 * SF-13 · Performance / stability — INV-7, INV-8, INV-9.
 *
 * INV-7 is the second standing hazard of this kind: a value that belongs in a
 * closure but must never enter the effect deps. A comment next to the array
 * is not a test. The case that fails a build is: new source, same range,
 * scrollIntoView is not called again.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import React from 'react';

import { LANGUAGE_SAMPLES } from './fixtures/language-samples';

import { CodeView } from '../CodeView';
import * as highlightModule from '../highlight';
import * as renderHastModule from '../render-hast';
import { expectExactSourceText, renderCodeView } from './helpers';
import { getKitRevealMarks, spyScrollIntoView, THREE_LINE_RUST } from './reveal-helpers';

const MODULE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

function readCodeViewSource(): string {
  return readFileSync(join(MODULE_DIR, 'CodeView.tsx'), 'utf-8');
}

function layoutEffectBlock(source: string): { body: string; deps: string } {
  const match = source.match(/useLayoutEffect\(\(\) => \{([\s\S]*?)\}, \[([^\]]*)\]\)/);
  expect(match, 'INV-7: CodeView must have exactly one scroll useLayoutEffect').not.toBeNull();
  return { body: match?.[1] ?? '', deps: match?.[2] ?? '' };
}

describe('INV-7: scroll effect must not list source', () => {
  it('locks the layout-effect dependency array to [startLine, endLine, id]', () => {
    const source = readCodeViewSource();
    const { deps, body } = layoutEffectBlock(source);
    expect(deps, 'INV-7: deps must be exactly the three primitives').toBe('startLine, endLine, id');
    expect(deps.split(',').map((part) => part.trim())).not.toContain('source');
    expect(deps).not.toContain('reveal');
    expect(
      body,
      'INV-7: a comment next to the array must name the invariant and live-preview keystroke regeneration'
    ).toMatch(/INV-7/);
    expect(body).toMatch(/live-preview|keystroke/);
  });

  it('does not call scrollIntoView again when source changes and the range primitives do not', () => {
    const scroll = spyScrollIntoView();
    const reveal = { startLine: 1, endLine: 1 };
    const view = renderCodeView({
      source: 'first file\nsecond line\n',
      language: 'plaintext',
      reveal,
    });
    expect(scroll, 'first valid reveal must scroll once').toHaveBeenCalledTimes(1);
    expect(getKitRevealMarks(view.container).length).toBeGreaterThan(0);
    scroll.mockClear();

    view.rerender(
      <CodeView source={'SECOND FILE\nSECOND LINE\n'} language="plaintext" reveal={reveal} />
    );

    expect(
      scroll,
      'INV-7: live-preview regenerates source on every keystroke; listing source on this effect would yank the pane back to the mark'
    ).not.toHaveBeenCalled();
    expectExactSourceText(view.container, 'SECOND FILE\nSECOND LINE\n');
    expect(
      getKitRevealMarks(view.container)[0]?.textContent,
      'INV-9: marks still follow the text on screen even though the scroll effect does not run'
    ).toBe('SECOND FILE\n');
    scroll.mockRestore();
  });

  it('does call scrollIntoView when only id changes (retriggers without listing source)', () => {
    const scroll = spyScrollIntoView();
    const source = 'first file\nsecond line\n';
    const view = renderCodeView({
      source,
      language: 'plaintext',
      reveal: { startLine: 1, endLine: 1, id: 'row-a' },
    });
    expect(scroll).toHaveBeenCalledTimes(1);
    scroll.mockClear();

    view.rerender(
      <CodeView
        source={source}
        language="plaintext"
        reveal={{ startLine: 1, endLine: 1, id: 'row-b' }}
      />
    );
    expect(
      scroll,
      'INV-7: id is the retrigger; SF-16 bumps it to jump again'
    ).toHaveBeenCalledTimes(1);
    scroll.mockRestore();
  });
});

describe('INV-8: tokenization still depends only on source and language', () => {
  it('documents highlight useMemo lists only [source, language]', () => {
    const source = readCodeViewSource();
    expect(source).toMatch(
      /useMemo\(\(\) => highlightSource\(source, language\), \[source, language\]\)/
    );
    expect(source).not.toMatch(/\[source, language, decorateToken\]/);
    expect(source).not.toMatch(/\[source, language,.*reveal/);
    expect(source).not.toMatch(/\[source, language, startLine/);
  });

  it('does not re-tokenize when only reveal changes', () => {
    const spy = vi.spyOn(highlightModule, 'highlightSource');
    const source = LANGUAGE_SAMPLES.rust;
    const view = renderCodeView({ source, language: 'rust' });
    expect(spy).toHaveBeenCalledTimes(1);

    view.rerender(
      <CodeView source={source} language="rust" reveal={{ startLine: 1, endLine: 2 }} />
    );
    view.rerender(
      <CodeView source={source} language="rust" reveal={{ startLine: 1, endLine: 2, id: 1 }} />
    );
    expect(spy, 'INV-8: changing only reveal must add zero tokenizer calls').toHaveBeenCalledTimes(
      1
    );
    spy.mockRestore();
  });
});

describe('INV-9: token tree rebuilds on line numbers, not on id', () => {
  it('documents the codeContent memo omits id and the reveal object', () => {
    const source = readCodeViewSource();
    expect(source).toMatch(
      /\[source, language, highlightResult, decorateToken, startLine, endLine\]/
    );
    expect(source).not.toMatch(
      /\[source, language, highlightResult, decorateToken, startLine, endLine, id\]/
    );
    expect(source).toMatch(/INV-9/);
  });

  it('rebuilds the token tree when source changes even though the scroll effect does not', () => {
    const renderSpy = vi.spyOn(renderHastModule, 'renderHast');
    const view = renderCodeView({
      source: THREE_LINE_RUST,
      language: 'rust',
      reveal: { startLine: 2, endLine: 2 },
    });
    expect(renderSpy).toHaveBeenCalledTimes(1);

    view.rerender(
      <CodeView
        source={`${THREE_LINE_RUST}// appended\n`}
        language="rust"
        reveal={{ startLine: 2, endLine: 2 }}
      />
    );
    expect(
      renderSpy,
      'INV-9: source is a render-memo input so marks follow the text on screen'
    ).toHaveBeenCalledTimes(2);
    renderSpy.mockRestore();
  });
});
