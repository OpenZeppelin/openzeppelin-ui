import type { Root } from 'hast';
import type React from 'react';

export type CodeViewLanguage = 'rust' | 'toml' | 'shell' | 'json' | 'markdown' | 'plaintext';

/**
 * One syntax-highlighted text leaf during HAST traversal.
 * Offsets are UTF-16 code units, matching JavaScript string indices and `source.length`.
 */
export interface CodeViewToken {
  /** Exact substring of `source` rendered by this leaf. */
  readonly text: string;
  /** Start offset of this leaf in the full `source` string. */
  readonly offset: number;
  /**
   * `hljs-*` classes from the immediate parent `span`, if the leaf sits inside one.
   * Undefined for unclassified text (common for Rust import paths in generated output).
   */
  readonly className?: string;
}

export interface CodeViewDecorationContext {
  readonly source: string;
  readonly language: CodeViewLanguage;
  readonly token: CodeViewToken;
}

/**
 * Return `undefined` or `null` to keep the kit's default rendering for this leaf.
 * Return a React node to replace only this leaf's default output.
 */
export type CodeViewTokenDecorator = (
  context: CodeViewDecorationContext
) => React.ReactNode | null | undefined;

export interface CodeViewProps {
  /** Source text to render. Whitespace and trailing newlines are preserved. */
  readonly source: string;
  /** Explicit grammar selection. CodeView does not infer from a filename. */
  readonly language: CodeViewLanguage;
  /** Classes applied to the focusable, scrolling pre element. */
  readonly className?: string;
  /** Accessible name for the scrolling code region. Defaults to "Source code". */
  readonly 'aria-label'?: string;
  /**
   * Optional callback to customize how individual highlighted tokens render.
   * When omitted, output matches standard syntax highlighting with no added decoration.
   */
  readonly decorateToken?: CodeViewTokenDecorator;
}

export type HighlightResult =
  | { readonly kind: 'highlighted'; readonly tree: Root }
  | {
      readonly kind: 'plaintext';
      readonly source: string;
      readonly cause: 'requested' | 'tokenizer-error';
    };

export const CODE_VIEW_LANGUAGES: readonly CodeViewLanguage[] = [
  'rust',
  'toml',
  'shell',
  'json',
  'markdown',
  'plaintext',
] as const;

/**
 *
 */
export function isCodeViewLanguage(value: string): value is CodeViewLanguage {
  return (CODE_VIEW_LANGUAGES as readonly string[]).includes(value);
}
