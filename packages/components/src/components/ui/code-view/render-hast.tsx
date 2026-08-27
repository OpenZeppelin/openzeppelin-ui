import type { Element, Root, Text } from 'hast';
import React from 'react';

import type { CodeViewDecorationContext, CodeViewLanguage, CodeViewTokenDecorator } from './types';

const ALLOWED_SPAN_PROPERTIES = new Set(['className']);

export interface RenderHastOptions {
  readonly source: string;
  readonly language: CodeViewLanguage;
  readonly decorateToken?: CodeViewTokenDecorator;
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

  state.offset += node.value.length;

  return leafContent;
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
  return renderHastChildren(tree.children, [], options, state);
}
