import bash from 'highlight.js/lib/languages/bash';
import ini from 'highlight.js/lib/languages/ini';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import rust from 'highlight.js/lib/languages/rust';
import { createLowlight } from 'lowlight';

import { isCodeViewLanguage, type CodeViewLanguage, type HighlightResult } from './types';

const lowlight = createLowlight({ bash, ini, json, markdown, rust });

const HIGHLIGHT_LANGUAGE: Record<Exclude<CodeViewLanguage, 'plaintext'>, string> = {
  rust: 'rust',
  toml: 'ini',
  shell: 'bash',
  json: 'json',
  markdown: 'markdown',
};

/**
 * Tokenize source with the private Lowlight registry. Plaintext bypasses the tokenizer.
 * Failures return the original source for escaped rendering at the component boundary.
 */
export function highlightSource(source: string, language: CodeViewLanguage): HighlightResult {
  if (language === 'plaintext') {
    return { kind: 'plaintext', source, cause: 'requested' };
  }

  if (!isCodeViewLanguage(language)) {
    return { kind: 'plaintext', source, cause: 'tokenizer-error' };
  }

  const grammar = HIGHLIGHT_LANGUAGE[language];

  try {
    const tree = lowlight.highlight(grammar, source);
    return { kind: 'highlighted', tree };
  } catch {
    return { kind: 'plaintext', source, cause: 'tokenizer-error' };
  }
}
