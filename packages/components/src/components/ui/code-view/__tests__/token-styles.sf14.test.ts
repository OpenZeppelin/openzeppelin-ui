/**
 * @vitest-environment node
 *
 * SF-14 · Reveal context gap — the drift guards a static class string needs.
 *
 * The gap that keeps the revealed range off the top edge is a Tailwind class,
 * `[&_[data-code-view-reveal]]:scroll-mt-[2lh]`, and Tailwind reads source text
 * statically: interpolating the attribute name or the line count would produce a class
 * no stylesheet ever contains, and the pane would silently go back to sitting flush
 * against the edge with nothing failing. The literal therefore has to be spelled out,
 * and these are the assertions that stop the spelling drifting from the constants it
 * duplicates.
 *
 * The measured behaviour of the gap itself — how much pane it actually leaves, and what
 * it costs a range that is taller than the pane — is layout, and lives in
 * `code-view.browser.test.tsx`.
 */
import { describe, expect, it } from 'vitest';

import { CODE_VIEW_REVEAL_ATTRIBUTE } from '../reveal';
import {
  CODE_VIEW_GUTTER_ROW_CLASSES,
  CODE_VIEW_LINE_ATTRIBUTE,
  CODE_VIEW_REVEAL_CONTEXT_CLASS,
  CODE_VIEW_REVEAL_CONTEXT_LINES,
  CODE_VIEW_REVEAL_MARK_STYLE_CLASSES,
  CODE_VIEW_TOKEN_STYLE_CLASSES,
} from '../token-styles';

describe('SF-14: the context-gap class matches the constants it hard-codes', () => {
  it('selects the private kit-mark attribute, not every mark', () => {
    expect(CODE_VIEW_REVEAL_CONTEXT_CLASS).toContain(`[${CODE_VIEW_REVEAL_ATTRIBUTE}]`);
    expect(
      CODE_VIEW_REVEAL_CONTEXT_CLASS,
      'INV-11: a decorateToken <mark> is not a scroll target and must not acquire a margin'
    ).not.toMatch(/\[&_mark\]/);
  });

  it('offsets by exactly CODE_VIEW_REVEAL_CONTEXT_LINES lines, in lh', () => {
    expect(CODE_VIEW_REVEAL_CONTEXT_CLASS).toContain(
      `scroll-mt-[${CODE_VIEW_REVEAL_CONTEXT_LINES}lh]`
    );
    expect(
      CODE_VIEW_REVEAL_CONTEXT_CLASS,
      'px would stop being a line count the moment the consumer changes the font size'
    ).not.toMatch(/scroll-mt-\[\d+px\]/);
  });

  it('applies only when a range resolved, so omitting reveal adds no scroll margin', () => {
    expect(CODE_VIEW_REVEAL_MARK_STYLE_CLASSES).toContain(CODE_VIEW_REVEAL_CONTEXT_CLASS);
    expect(
      CODE_VIEW_TOKEN_STYLE_CLASSES,
      'INV-1: the omit-reveal class list must be what it was before the feature'
    ).not.toContain('scroll-mt');
  });
});

describe('SF-14: the gutter row class matches the attribute the rows carry', () => {
  it('paints the attribute the component actually sets', () => {
    expect(CODE_VIEW_GUTTER_ROW_CLASSES).toContain(`content-[attr(${CODE_VIEW_LINE_ATTRIBUTE})]`);
  });

  it('paints it as generated content rather than expecting a text node', () => {
    expect(
      CODE_VIEW_GUTTER_ROW_CLASSES,
      'a text node would be copyable with a selection of the code, which is the whole point'
    ).toMatch(/\bbefore:content-\[/);
  });
});
