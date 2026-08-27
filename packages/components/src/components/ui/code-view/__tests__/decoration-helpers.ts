import { expect } from 'vitest';

import type { CodeViewDecorationContext, CodeViewLanguage, CodeViewProps } from '../types';
import { renderCodeView } from './helpers';

/** INV-1 / INV-14 guard: classified tokens must not be wrapped in duplicate nested hljs spans. */
export function expectNoNestedDuplicateHljsSpans(container: HTMLElement): void {
  const tokenClasses = (className: string): string[] =>
    className.split(/\s+/).filter((value) => value.startsWith('hljs-') && value !== 'hljs');

  const spans = container.querySelectorAll('span[class*="hljs-"]');
  for (const span of spans) {
    const parentTokens = tokenClasses(span.className);
    for (const child of span.querySelectorAll(':scope > span')) {
      const childTokens = tokenClasses(child.className);
      const overlap = parentTokens.filter((token) => childTokens.includes(token));
      expect(
        overlap,
        `INV-14 violated: nested span duplicates hljs token class(es) ${overlap.join(', ')}`
      ).toHaveLength(0);
    }
  }
}

/**
 *
 */
export function captureDecoratorInvocations(
  props: Pick<CodeViewProps, 'source' | 'language'>,
  decorateToken: (context: CodeViewDecorationContext) => undefined
): CodeViewDecorationContext[] {
  const invocations: CodeViewDecorationContext[] = [];
  renderCodeView({
    ...props,
    decorateToken: (context) => {
      invocations.push(context);
      return decorateToken(context);
    },
  });
  return invocations;
}

/**
 *
 */
export function renderParityBaseline(
  source: string,
  language: CodeViewLanguage
): { withoutDecorator: string; withNoOpDecorator: string } {
  const baseline = renderCodeView({ source, language });
  const noop = renderCodeView({
    source,
    language,
    decorateToken: () => undefined,
  });
  return {
    withoutDecorator: baseline.container.innerHTML,
    withNoOpDecorator: noop.container.innerHTML,
  };
}
