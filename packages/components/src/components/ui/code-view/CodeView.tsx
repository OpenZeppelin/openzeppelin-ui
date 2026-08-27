import React, { useMemo } from 'react';

import { cn } from '@openzeppelin/ui-utils';

import { highlightSource } from './highlight';
import { renderHast } from './render-hast';
import { CODE_VIEW_TOKEN_STYLE_CLASSES } from './token-styles';
import type {
  CodeViewDecorationContext,
  CodeViewLanguage,
  CodeViewProps,
  CodeViewToken,
  CodeViewTokenDecorator,
} from './types';

const DEFAULT_ARIA_LABEL = 'Source code';

function renderHighlightResult(
  source: string,
  language: CodeViewLanguage,
  result: ReturnType<typeof highlightSource>,
  decorateToken?: CodeViewTokenDecorator
): React.ReactNode {
  switch (result.kind) {
    case 'plaintext':
      return result.source;
    case 'highlighted':
      try {
        return renderHast(result.tree, { source, language, decorateToken });
      } catch {
        return source;
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
 */
export function CodeView({
  source,
  language,
  className,
  'aria-label': ariaLabel,
  decorateToken,
}: CodeViewProps): React.ReactElement {
  const highlightResult = useMemo(() => highlightSource(source, language), [source, language]);

  const codeContent = renderHighlightResult(source, language, highlightResult, decorateToken);

  return (
    <pre
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
          CODE_VIEW_TOKEN_STYLE_CLASSES
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
  CodeViewToken,
  CodeViewTokenDecorator,
};
