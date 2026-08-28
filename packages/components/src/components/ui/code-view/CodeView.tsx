import React, { useLayoutEffect, useMemo, useRef } from 'react';

import { cn } from '@openzeppelin/ui-utils';

import { highlightSource } from './highlight';
import { renderHast, wrapRevealedSource } from './render-hast';
import { CODE_VIEW_REVEAL_ATTRIBUTE, resolveRevealRange } from './reveal';
import { CODE_VIEW_REVEAL_MARK_STYLE_CLASSES, CODE_VIEW_TOKEN_STYLE_CLASSES } from './token-styles';
import type {
  CodeViewDecorationContext,
  CodeViewLanguage,
  CodeViewProps,
  CodeViewReveal,
  CodeViewToken,
  CodeViewTokenDecorator,
} from './types';

const DEFAULT_ARIA_LABEL = 'Source code';

const REVEAL_SCROLL_OPTIONS = {
  block: 'center',
  inline: 'nearest',
  behavior: 'instant',
} as const;

function renderHighlightResult(
  source: string,
  language: CodeViewLanguage,
  result: ReturnType<typeof highlightSource>,
  decorateToken: CodeViewTokenDecorator | undefined,
  revealOffsets: ReturnType<typeof resolveRevealRange>
): React.ReactNode {
  switch (result.kind) {
    case 'plaintext':
      return wrapRevealedSource(result.source, revealOffsets);
    case 'highlighted':
      try {
        return renderHast(result.tree, { source, language, decorateToken, revealOffsets });
      } catch {
        return wrapRevealedSource(source, revealOffsets);
      }
    default: {
      const _exhaustive: never = result;
      return _exhaustive;
    }
  }
}

/**
 * Renders source as a read-only, syntax-highlighted code region.
 *
 * The component preserves source text exactly. Tokenization failures degrade
 * to escaped plain text and never remove or replace the supplied source.
 * An optional `reveal` range is marked in the source and scrolled into view.
 */
export function CodeView({
  source,
  language,
  className,
  'aria-label': ariaLabel,
  decorateToken,
  reveal,
}: CodeViewProps): React.ReactElement {
  const startLine = reveal?.startLine;
  const endLine = reveal?.endLine;
  const id = reveal?.id;

  const preRef = useRef<HTMLPreElement>(null);

  const highlightResult = useMemo(() => highlightSource(source, language), [source, language]);

  // Rebuilding the React tree from the token tree costs one node per leaf, so a
  // parent that re-renders on every pointer move (a drag-resizable container)
  // would otherwise reconcile the whole file each frame.
  // INV-9: startLine and endLine rebuild marks. id does not. A retrigger is a scroll.
  const codeContent = useMemo(
    () =>
      renderHighlightResult(
        source,
        language,
        highlightResult,
        decorateToken,
        resolveRevealRange(
          source,
          typeof startLine === 'number' && typeof endLine === 'number'
            ? { startLine, endLine }
            : undefined
        )
      ),
    [source, language, highlightResult, decorateToken, startLine, endLine]
  );

  useLayoutEffect(() => {
    const mark = preRef.current?.querySelector(`[${CODE_VIEW_REVEAL_ATTRIBUTE}]`);
    if (!(mark instanceof HTMLElement)) {
      return;
    }
    mark.scrollIntoView(REVEAL_SCROLL_OPTIONS);
    // INV-7: listing `source` would re-scroll on live-preview keystroke regeneration.
  }, [startLine, endLine, id]);

  const revealIsActive =
    typeof startLine === 'number' &&
    typeof endLine === 'number' &&
    resolveRevealRange(source, { startLine, endLine }) !== null;

  return (
    <pre
      ref={preRef}
      tabIndex={0}
      aria-label={ariaLabel ?? DEFAULT_ARIA_LABEL}
      className={cn(
        'overflow-auto rounded-md border border-border bg-background p-3 text-sm text-foreground',
        'font-mono leading-relaxed',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className
      )}
    >
      <code
        className={cn(
          'hljs block min-w-full whitespace-pre',
          'font-[ui-monospace,SFMono-Regular,"SF Mono",Consolas,"Liberation Mono",Menlo,monospace]',
          CODE_VIEW_TOKEN_STYLE_CLASSES,
          revealIsActive ? CODE_VIEW_REVEAL_MARK_STYLE_CLASSES : undefined
        )}
      >
        {codeContent}
      </code>
    </pre>
  );
}

export type {
  CodeViewDecorationContext,
  CodeViewLanguage,
  CodeViewProps,
  CodeViewReveal,
  CodeViewToken,
  CodeViewTokenDecorator,
};
