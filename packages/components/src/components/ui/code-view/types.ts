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

/**
 * A 1-indexed inclusive line range to mark and scroll into view.
 * Invalid ranges are a no-op: no mark, no scroll, no throw.
 */
export interface CodeViewReveal {
  /** First line to include. 1 is the first line of `source`. */
  readonly startLine: number;
  /** Last line to include. Must be >= startLine. */
  readonly endLine: number;
  /**
   * Retrigger token. Compared with Object.is.
   * Change this value to scroll again when the line numbers did not change.
   * Omit it if you never need to re-reveal the same range.
   */
  readonly id?: number | string;
}

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
  /**
   * Optional range to mark and bring into view.
   * Omit for the same highlighted output as a pane without the feature: no mark, no scroll.
   */
  readonly reveal?: CodeViewReveal;
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

/** Narrows an arbitrary string to a grammar CodeView can render. */
export function isCodeViewLanguage(value: string): value is CodeViewLanguage {
  return (CODE_VIEW_LANGUAGES as readonly string[]).includes(value);
}
