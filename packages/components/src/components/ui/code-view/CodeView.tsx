import React, { useLayoutEffect, useMemo, useRef } from 'react';

import { cn } from '@openzeppelin/ui-utils';

import { highlightSource } from './highlight';
import { LineNumberGutter } from './line-numbers';
import { renderHast, wrapRevealedSource } from './render-hast';
import { CODE_VIEW_REVEAL_ATTRIBUTE, countSourceLines, resolveRevealRange } from './reveal';
import {
  CODE_VIEW_FONT_STACK,
  CODE_VIEW_REVEAL_MARK_STYLE_CLASSES,
  CODE_VIEW_TOKEN_STYLE_CLASSES,
} from './token-styles';
import type {
  CodeViewDecorationContext,
  CodeViewLanguage,
  CodeViewProps,
  CodeViewReveal,
  CodeViewToken,
  CodeViewTokenDecorator,
} from './types';

const DEFAULT_ARIA_LABEL = 'Source code';

/**
 * INV-11 restated: the first kit mark is still the one and only scroll target, and
 * it is aligned to the *start* of the pane, not its centre.
 *
 * `block: 'center'` anchored the range's first line to the pane's midpoint, which
 * leaves only half the pane height for everything after it. Fraction of the range
 * actually visible, measured in a consuming app: 6 lines 100%, 18 lines 56%,
 * 25 lines 40%, 34 lines 29%, with the pane's top half empty throughout. Reveal
 * exists to show a range, so the geometry has to be driven by the whole range and
 * not by its first line.
 *
 * `start` gives the range the full pane height below its first line. Any range at
 * most as tall as the pane is therefore fully visible, and a range too tall to fit
 * begins at the top of the pane instead of the middle. The mark's top edge is the
 * top edge of line `startLine`, because the interval starts at that line's first
 * offset.
 *
 * `inline: 'nearest'` leaves horizontal scroll alone for a long line already in
 * view. `behavior: 'instant'` keeps the jump inside the layout effect, before paint,
 * so no intermediate scroll position is ever painted.
 *
 * The options are still exactly these three. The couple of lines of context now
 * left above the range are `scroll-margin-top` on the mark itself
 * (`CODE_VIEW_REVEAL_CONTEXT_CLASS`), which widens the box `block: 'start'` aligns
 * without this call learning any geometry. `'center'` is still the thing that must
 * not come back: the gap is a fixed two lines, not half a pane.
 */
const REVEAL_SCROLL_OPTIONS = {
  block: 'start',
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
  showLineNumbers = false,
}: CodeViewProps): React.ReactElement {
  const startLine = reveal?.startLine;
  const endLine = reveal?.endLine;
  const id = reveal?.id;

  const preRef = useRef<HTMLPreElement>(null);

  const highlightResult = useMemo(() => highlightSource(source, language), [source, language]);

  // Same count `reveal` addresses, so a row can never name a line the range cannot.
  // Zero when the gutter is off, and zero for empty source, which is 0 lines: both
  // render no column at all rather than an empty one holding its padding open.
  const gutterLineCount = useMemo(
    () => (showLineNumbers ? countSourceLines(source) : 0),
    [showLineNumbers, source]
  );

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

  const hasGutter = gutterLineCount > 0;

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
        // Only when there is a column to sit beside, so the default DOM and its
        // computed layout stay byte-for-byte what a pane without the feature had.
        hasGutter ? 'flex items-start' : undefined,
        className
      )}
    >
      {hasGutter ? <LineNumberGutter lineCount={gutterLineCount} /> : null}
      <code
        className={cn(
          // `min-w-full` fills the pane when the code is the only child. As a flex
          // item it would resolve to 100% of the pane *beside* the gutter and force
          // a permanent horizontal scroll of exactly the gutter's width, so the flex
          // row uses `flex-1` to fill the remainder instead. `min-w-0` is deliberately
          // absent: the auto min-width is what stops a long line being squeezed and
          // keeps it scrolling under the sticky column. The gutter-off string is left
          // byte-identical to the one a pane without the feature emitted.
          hasGutter ? 'hljs block flex-1 whitespace-pre' : 'hljs block min-w-full whitespace-pre',
          CODE_VIEW_FONT_STACK,
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
