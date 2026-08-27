/**
 * SF-3 · Tokenizer unit tests — INV-2, INV-3, INV-6, INV-9, INV-10, INV-12.
 */
import { describe, expect, it } from 'vitest';

import {
  EXPECTED_TOKEN_CLASS,
  LANGUAGE_SAMPLES,
  RUST_KEYWORD_FIXTURE,
} from './fixtures/language-samples';

import { highlightSource } from '../highlight';
import { CODE_VIEW_LANGUAGES, type CodeViewLanguage } from '../types';
import { readDeployShFixture } from './helpers';

function collectClassNames(node: unknown, classes: Set<string> = new Set()): Set<string> {
  if (!node || typeof node !== 'object') {
    return classes;
  }
  const record = node as {
    type?: string;
    properties?: { className?: string[] };
    children?: unknown[];
  };
  if (record.type === 'element' && Array.isArray(record.properties?.className)) {
    for (const name of record.properties.className) {
      classes.add(name);
    }
  }
  for (const child of record.children ?? []) {
    collectClassNames(child, classes);
  }
  return classes;
}

describe('INV-2: grammar dispatch and representative token classes', () => {
  it.each(
    Object.entries(LANGUAGE_SAMPLES).map(([language, source]) => [language, source] as const)
  )('registers %s and emits standard hljs-* classes', (language, source) => {
    const result = highlightSource(source, language as Exclude<CodeViewLanguage, 'plaintext'>);
    expect(result.kind).toBe('highlighted');
    if (result.kind !== 'highlighted') {
      return;
    }
    const classes = collectClassNames(result.tree);
    expect(classes.has(EXPECTED_TOKEN_CLASS[language as keyof typeof EXPECTED_TOKEN_CLASS])).toBe(
      true
    );
  });
});

describe('INV-3 and INV-6: fail-soft tokenizer boundary', () => {
  it('returns plaintext with tokenizer-error cause for invalid runtime language', () => {
    expect(highlightSource('x', 'yaml' as CodeViewLanguage)).toEqual({
      kind: 'plaintext',
      source: 'x',
      cause: 'tokenizer-error',
    });
  });

  it('returns requested plaintext without calling highlight for plaintext language', () => {
    expect(highlightSource('plain\n', 'plaintext')).toEqual({
      kind: 'plaintext',
      source: 'plain\n',
      cause: 'requested',
    });
  });
});

describe('INV-9 (tokenizer arm): deploy.sh stays highlighted with no length branch', () => {
  it('highlights the full generated deploy.sh fixture synchronously', () => {
    const source = readDeployShFixture();
    const started = performance.now();
    const result = highlightSource(source, 'shell');
    const elapsed = performance.now() - started;
    expect(result.kind).toBe('highlighted');
    if (result.kind === 'highlighted') {
      const classes = collectClassNames(result.tree);
      expect(classes.size).toBeGreaterThan(0);
      expect([...classes].some((name) => name.startsWith('hljs-'))).toBe(true);
    }
    expect(
      elapsed,
      'single deploy.sh tokenization should stay within INV-9 tokenizer budget'
    ).toBeLessThan(50);
  });
});

describe('INV-10: grammar registration is private and stable', () => {
  it('returns stable highlighted output across repeated calls', () => {
    const first = highlightSource(RUST_KEYWORD_FIXTURE, 'rust');
    const second = highlightSource(RUST_KEYWORD_FIXTURE, 'rust');
    expect(first).toEqual(second);
  });

  it('registers only the six declared language paths', () => {
    expect(CODE_VIEW_LANGUAGES).toEqual(['rust', 'toml', 'shell', 'json', 'markdown', 'plaintext']);
  });
});

describe('INV-12: synchronous HighlightResult never nullable', () => {
  it.each(CODE_VIEW_LANGUAGES.map((language) => [language] as const))(
    'returns a HighlightResult synchronously for %s',
    (language) => {
      const result = highlightSource('sync', language);
      expect(result).toBeDefined();
      expect(result.kind === 'highlighted' || result.kind === 'plaintext').toBe(true);
    }
  );
});
