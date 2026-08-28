/**
 * SF-10 · The language id is a contract, so it ships with a way to check it.
 *
 * A consumer that receives a language id from data rather than writing it as a
 * literal — a generator reporting the language of the sources it emits, say —
 * cannot use the `CodeViewLanguage` union to validate it, because the union is
 * erased before its value ever exists. Without an exported guard the only
 * options are a cast, which turns an unrenderable id into a silent plaintext
 * fallback, or a second copy of the list, which drifts.
 */
import { describe, expect, it } from 'vitest';

import { LANGUAGE_SAMPLES } from './fixtures/language-samples';

import { CODE_VIEW_LANGUAGES, isCodeViewLanguage } from '../../../../code-view';

describe('INV-4: the exported language guard matches what CodeView renders', () => {
  it('accepts every language the component highlights, plus plaintext', () => {
    const highlighted = Object.keys(LANGUAGE_SAMPLES).sort();

    expect(
      [...CODE_VIEW_LANGUAGES].sort(),
      'the guard and the grammars it fronts are the same set'
    ).toEqual([...highlighted, 'plaintext'].sort());

    for (const language of CODE_VIEW_LANGUAGES) {
      expect(isCodeViewLanguage(language), language).toBe(true);
    }
  });

  it('rejects the near misses a reporting package would plausibly produce', () => {
    for (const value of ['Rust', 'rs', 'RUST', 'rust-lang', '', 'text']) {
      expect(isCodeViewLanguage(value), value).toBe(false);
    }
  });
});
