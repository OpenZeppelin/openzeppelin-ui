/**
 * @vitest-environment jsdom
 *
 * SF-3 · Accessibility — INV-13, INV-14, INV-15.
 */
import { describe, expect, it } from 'vitest';

import { LANGUAGE_SAMPLES } from './fixtures/language-samples';

import { CODE_VIEW_TOKEN_STYLE_CLASSES } from '../token-styles';
import { getCodeElement, getScrollRegion, renderCodeView } from './helpers';

describe('INV-13: the scroll region always has a usable name and focus treatment', () => {
  it('defaults aria-label to "Source code" on the focusable pre', () => {
    const { getByLabelText, container } = renderCodeView({
      source: 'x',
      language: 'plaintext',
    });
    expect(getByLabelText('Source code')).toBe(getScrollRegion(container));
  });

  it('forwards a custom aria-label and className to the same pre element', () => {
    const { getByLabelText, container } = renderCodeView({
      source: LANGUAGE_SAMPLES.rust,
      language: 'rust',
      className: 'h-full border-dashed',
      'aria-label': 'rwa-token contract source code',
    });
    const pre = getByLabelText('rwa-token contract source code');
    expect(pre).toBe(getScrollRegion(container));
    expect(pre.className).toContain('h-full');
    expect(pre.className).toContain('border-dashed');
    expect(pre.className).toContain('focus-visible:ring-2');
  });
});

describe('INV-14: highlight tokens add no accessibility noise', () => {
  it('keeps token spans free of roles, aria attributes, handlers, and extra tab stops', () => {
    const { container } = renderCodeView({
      source: LANGUAGE_SAMPLES.markdown,
      language: 'markdown',
    });
    for (const span of container.querySelectorAll('span')) {
      expect(span.getAttribute('role')).toBeNull();
      expect(span.getAttribute('aria-live')).toBeNull();
      expect(span.tabIndex).toBe(-1);
    }
    expect(container.querySelector('[aria-live]')).toBeNull();
    expect(container.querySelector('[role="status"]')).toBeNull();
  });
});

describe('INV-15: styling never carries source meaning', () => {
  it('preserves standard hljs-* classes on highlighted tokens', () => {
    const { container } = renderCodeView({ source: LANGUAGE_SAMPLES.json, language: 'json' });
    expect(getCodeElement(container).className).toContain('hljs');
    expect(container.querySelector('[class*="hljs-"]')).not.toBeNull();
  });

  it('maps token classes to kit-owned descendant selectors without a theme import', () => {
    expect(CODE_VIEW_TOKEN_STYLE_CLASSES).toContain('[&_.hljs-keyword]:text-primary');
    expect(CODE_VIEW_TOKEN_STYLE_CLASSES).toContain('[&_.hljs-string]:text-success');
    const { container } = renderCodeView({ source: LANGUAGE_SAMPLES.rust, language: 'rust' });
    expect(getCodeElement(container).className).toContain('[&_.hljs-keyword]:text-primary');
  });

  it('keeps the complete source readable when token classes are ignored', () => {
    const { container } = renderCodeView({ source: LANGUAGE_SAMPLES.toml, language: 'toml' });
    expect(getCodeElement(container).textContent).toBe(LANGUAGE_SAMPLES.toml);
  });
});
