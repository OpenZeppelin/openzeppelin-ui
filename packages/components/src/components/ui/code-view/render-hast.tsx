import type { Element, Root, Text } from 'hast';
import React from 'react';

import { CODE_VIEW_REVEAL_ATTRIBUTE, type RevealOffsets } from './reveal';
import type { CodeViewDecorationContext, CodeViewLanguage, CodeViewTokenDecorator } from './types';

const ALLOWED_SPAN_PROPERTIES = new Set(['className']);

const REVEAL_MARK_PROPS = { [CODE_VIEW_REVEAL_ATTRIBUTE]: '' } as const;

export interface RenderHastOptions {
  readonly source: string;
  readonly language: CodeViewLanguage;
  readonly decorateToken?: CodeViewTokenDecorator;
  readonly revealOffsets?: RevealOffsets | null;
}

interface OffsetState {
  offset: number;
}

function isTextNode(node: Root['children'][number]): node is Text {
  return node.type === 'text';
}

function isSpanElement(node: Root['children'][number]): node is Element {
  return node.type === 'element' && node.tagName === 'span';
}

function revealMark(children?: React.ReactNode): React.ReactElement {
  return <mark {...REVEAL_MARK_PROPS}>{children}</mark>;
}

function leafOverlapsReveal(leafStart: number, leafEnd: number, offsets: RevealOffsets): boolean {
  return leafStart < offsets.endOffset && offsets.startOffset < leafEnd;
}

function wrapDefaultString(
  text: string,
  leafStart: number,
  offsets: RevealOffsets
): React.ReactNode {
  const from = Math.max(0, offsets.startOffset - leafStart);
  const to = Math.min(text.length, offsets.endOffset - leafStart);
  const prefix = text.slice(0, from);
  const highlighted = text.slice(from, to);
  const suffix = text.slice(to);

  if (prefix.length === 0 && suffix.length === 0) {
    return revealMark(highlighted);
  }

  return (
    <>
      {prefix.length > 0 ? prefix : null}
      {revealMark(highlighted)}
      {suffix.length > 0 ? suffix : null}
    </>
  );
}

function applyRevealWrap(
  leafContent: React.ReactNode,
  originalText: string,
  leafStart: number,
  revealOffsets: RevealOffsets | null | undefined
): React.ReactNode {
  if (!revealOffsets || revealOffsets.startOffset === revealOffsets.endOffset) {
    return leafContent;
  }

  const leafEnd = leafStart + originalText.length;
  if (!leafOverlapsReveal(leafStart, leafEnd, revealOffsets)) {
    return leafContent;
  }

  // Default string (omit / nullish / throw-fallback) may slice. Custom nodes wrap whole.
  if (leafContent === originalText) {
    return wrapDefaultString(originalText, leafStart, revealOffsets);
  }

  return revealMark(leafContent);
}

function appendEmptyRevealMark(
  content: React.ReactNode,
  source: string,
  revealOffsets: RevealOffsets | null | undefined
): React.ReactNode {
  if (
    !revealOffsets ||
    revealOffsets.startOffset !== revealOffsets.endOffset ||
    revealOffsets.startOffset !== source.length
  ) {
    return content;
  }

  return (
    <>
      {content}
      {revealMark()}
    </>
  );
}

/**
 * Wrap plaintext (requested or tokenizer-error fallback) with the same reveal
 * interval used on the highlighted path. Null offsets return `source` unchanged.
 */
export function wrapRevealedSource(
  source: string,
  revealOffsets: RevealOffsets | null | undefined
): React.ReactNode {
  if (!revealOffsets) {
    return source;
  }

  if (revealOffsets.startOffset === revealOffsets.endOffset) {
    return (
      <>
        {source}
        {revealMark()}
      </>
    );
  }

  return wrapDefaultString(source, 0, revealOffsets);
}

function assertSpanProperties(properties: Element['properties']): string | undefined {
  if (!properties) {
    return undefined;
  }

  for (const key of Object.keys(properties)) {
    if (!ALLOWED_SPAN_PROPERTIES.has(key)) {
      throw new Error(`Unexpected HAST property: ${key}`);
    }
  }

  const className = properties.className;
  if (className === undefined) {
    return undefined;
  }

  if (!Array.isArray(className) || className.some((value) => typeof value !== 'string')) {
    throw new Error('Invalid HAST className');
  }

  return className.join(' ');
}

function invokeDecorator(
  decorateToken: CodeViewTokenDecorator,
  context: CodeViewDecorationContext
): React.ReactNode | null | undefined {
  try {
    return decorateToken(context);
  } catch {
    // INV-7: per-leaf fail-soft — one throwing decorator must not blank the pane.
    return undefined;
  }
}

function renderTextLeaf(
  node: Text,
  options: RenderHastOptions,
  state: OffsetState,
  parentSpanClassName: string | undefined
): React.ReactNode {
  const token = {
    text: node.value,
    offset: state.offset,
    className: parentSpanClassName,
  };

  let leafContent: React.ReactNode = node.value;

  if (options.decorateToken) {
    const decorated = invokeDecorator(options.decorateToken, {
      source: options.source,
      language: options.language,
      token,
    });
    if (decorated !== undefined && decorated !== null) {
      leafContent = decorated;
    }
  }

  // INV-3: decorate on the intact leaf, then advance, then wrap. Do not slice first.
  state.offset += node.value.length;

  return applyRevealWrap(leafContent, node.value, token.offset, options.revealOffsets);
}

function renderHastChildren(
  children: Root['children'],
  path: readonly number[],
  options: RenderHastOptions,
  state: OffsetState,
  parentSpanClassName?: string
): React.ReactNode {
  return children.map((child, index) =>
    renderHastNode(child, [...path, index], options, state, parentSpanClassName)
  );
}

function renderHastNode(
  node: Root['children'][number],
  path: readonly number[],
  options: RenderHastOptions,
  state: OffsetState,
  parentSpanClassName?: string
): React.ReactNode {
  if (isTextNode(node)) {
    return renderTextLeaf(node, options, state, parentSpanClassName);
  }

  if (isSpanElement(node)) {
    const className = assertSpanProperties(node.properties);
    return (
      <span key={path.join('.')} className={className}>
        {renderHastChildren(node.children, path, options, state, className)}
      </span>
    );
  }

  throw new Error(`Unexpected HAST node: ${node.type}`);
}

/**
 * Convert Lowlight's root tree into React nodes. Accepts only text and span children.
 */
export function renderHast(tree: Root, options: RenderHastOptions): React.ReactNode {
  const state: OffsetState = { offset: 0 };
  const children = renderHastChildren(tree.children, [], options, state);
  return appendEmptyRevealMark(children, options.source, options.revealOffsets);
}
