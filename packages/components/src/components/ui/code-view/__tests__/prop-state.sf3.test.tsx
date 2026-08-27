/**
 * @vitest-environment jsdom
 *
 * SF-3 · Prop / State Contract — INV-4, INV-5, INV-6, INV-8.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

import { LANGUAGE_SAMPLES } from './fixtures/language-samples';

import { CodeView, type CodeViewLanguage } from '../CodeView';
import * as highlightModule from '../highlight';
import { highlightSource } from '../highlight';
import { CODE_VIEW_LANGUAGES } from '../types';
import { getScrollRegion, renderCodeView } from './helpers';

const MODULE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY_FILE = join(dirname(fileURLToPath(import.meta.url)), '../../../../code-view.ts');

describe('INV-4: the public prop set stays narrow and explicit', () => {
  it('accepts only source, language, className, and aria-label on CodeViewProps', () => {
    const { container, getByLabelText } = renderCodeView({
      source: 'x',
      language: 'plaintext',
      className: 'custom-pane',
      'aria-label': 'Generated deploy script',
    });
    expect(getByLabelText('Generated deploy script')).toBe(getScrollRegion(container));
    expect(getScrollRegion(container).className).toContain('custom-pane');
  });

  it('exports only CodeView and its prop types from the subpath entry', () => {
    const entrySource = readFileSync(ENTRY_FILE, 'utf-8');
    expect(entrySource).toContain('export {');
    expect(entrySource).toContain('CodeView');
    expect(entrySource).toContain('CodeViewLanguage');
    expect(entrySource).toContain('CodeViewProps');
    expect(entrySource).not.toMatch(/export\s+\{[^}]*highlightSource/);
    expect(entrySource).not.toMatch(/export\s+\{[^}]*renderHast/);
  });
});

describe('INV-5: CodeView is controlled, read-only, and stateless', () => {
  it('replaces the document when source and language change without editable controls', () => {
    const view = renderCodeView({ source: LANGUAGE_SAMPLES.rust, language: 'rust' });
    expect(view.container.querySelector('textarea, input, [contenteditable="true"]')).toBeNull();
    view.rerender(<CodeView source={LANGUAGE_SAMPLES.shell} language="shell" />);
    expect(view.container.textContent).toContain('deploy');
    expect(view.container.querySelector('[role="textbox"]')).toBeNull();
  });

  it('imports no form or editor packages from the code-view module tree', () => {
    const productFiles = readdirSync(MODULE_DIR).filter(
      (file) => /\.(ts|tsx)$/.test(file) && !/\.test\./.test(file)
    );
    const forbidden = ['react-hook-form', '@uiw/react-textarea-code-editor', 'CodeEditorField'];
    for (const file of productFiles) {
      const source = readFileSync(join(MODULE_DIR, file), 'utf-8');
      for (const token of forbidden) {
        expect(source, `${file} must not import ${token}`).not.toContain(token);
      }
    }
  });
});

describe('INV-6: private highlighted state is exhaustive and contained', () => {
  it.each(CODE_VIEW_LANGUAGES.map((language) => [language] as const))(
    'highlightSource returns exactly one HighlightResult variant for %s',
    (language) => {
      const result = highlightSource('sample', language);
      expect(['highlighted', 'plaintext']).toContain(result.kind);
      if (result.kind === 'highlighted') {
        expect(result.tree.type).toBe('root');
      } else {
        expect(result.source).toBe('sample');
        expect(['requested', 'tokenizer-error']).toContain(result.cause);
      }
    }
  );

  it('routes invalid runtime language strings to plaintext tokenizer-error', () => {
    const invalidLanguage = 'yaml' as CodeViewLanguage;
    const result = highlightSource('still here', invalidLanguage);
    expect(result).toEqual({
      kind: 'plaintext',
      source: 'still here',
      cause: 'tokenizer-error',
    });
  });
});

describe('INV-8: tokenization depends only on source and language', () => {
  it('does not re-tokenize when only className or aria-label change', () => {
    const spy = vi.spyOn(highlightModule, 'highlightSource');
    const view = renderCodeView({
      source: LANGUAGE_SAMPLES.json,
      language: 'json',
      className: 'first',
      'aria-label': 'first label',
    });
    expect(spy).toHaveBeenCalledTimes(1);
    view.rerender(
      <CodeView
        source={LANGUAGE_SAMPLES.json}
        language="json"
        className="second"
        aria-label="second label"
      />
    );
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('tokenizes again when source or language change and never shows stale tokens', () => {
    const spy = vi.spyOn(highlightModule, 'highlightSource');
    const view = renderCodeView({ source: 'echo one', language: 'shell' });
    view.rerender(<CodeView source="echo two" language="shell" />);
    view.rerender(<CodeView source='{"a":1}' language="json" />);
    expect(spy).toHaveBeenCalledTimes(3);
    expect(view.container.textContent).toContain('"a"');
    spy.mockRestore();
  });
});
