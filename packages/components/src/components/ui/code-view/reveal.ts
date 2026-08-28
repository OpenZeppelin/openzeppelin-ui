import type { CodeViewReveal } from './types';

/** U+000A. The only character that starts a new line for reveal ranges. */
const LINE_FEED = 10;

/**
 * Private kit-mark hook. Scroll and tests use it to ignore decorator `<mark>`s.
 * Not a published class name and not part of `CodeViewProps`.
 */
export const CODE_VIEW_REVEAL_ATTRIBUTE = 'data-code-view-reveal';

/** Half-open UTF-16 interval into the current `source`. */
export interface RevealOffsets {
  readonly startOffset: number;
  readonly endOffset: number;
}

/**
 * Line count for reveal validity.
 * Empty source is 0 lines. Otherwise one plus the number of U+000A characters.
 */
function countSourceLines(source: string): number {
  if (source.length === 0) {
    return 0;
  }

  let lines = 1;
  for (let index = 0; index < source.length; index += 1) {
    if (source.charCodeAt(index) === LINE_FEED) {
      lines += 1;
    }
  }
  return lines;
}

/**
 * UTF-16 offset immediately after the `nth` U+000A, or 0 when `nth` is 0.
 * Line `n` (1-indexed) starts at `offsetAfterNthLineFeed(source, n - 1)`.
 */
function offsetAfterNthLineFeed(source: string, nth: number): number {
  if (nth <= 0) {
    return 0;
  }

  let seen = 0;
  for (let index = 0; index < source.length; index += 1) {
    if (source.charCodeAt(index) === LINE_FEED) {
      seen += 1;
      if (seen === nth) {
        return index + 1;
      }
    }
  }
  return source.length;
}

/**
 * Convert a 1-indexed inclusive line range into a half-open UTF-16 interval.
 * Every invalid case returns `null`: omit, non-integer, zero/negative, inverted,
 * past either bound, or empty source. No clamp. No swap.
 */
export function resolveRevealRange(
  source: string,
  reveal: CodeViewReveal | undefined
): RevealOffsets | null {
  if (reveal === undefined) {
    return null;
  }

  const { startLine, endLine } = reveal;

  // INV-6 dimensions: each named check is a skip. Tests attach one case per row.
  const startIsInteger = Number.isInteger(startLine);
  const endIsInteger = Number.isInteger(endLine);
  if (!startIsInteger || !endIsInteger) {
    return null;
  }

  const startIsAtLeastOne = startLine >= 1;
  const endIsAtLeastOne = endLine >= 1;
  if (!startIsAtLeastOne || !endIsAtLeastOne) {
    return null;
  }

  const rangeIsOrdered = startLine <= endLine;
  if (!rangeIsOrdered) {
    return null;
  }

  const lineCount = countSourceLines(source);
  const sourceHasLines = lineCount > 0;
  if (!sourceHasLines) {
    return null;
  }

  const startIsInBounds = startLine <= lineCount;
  const endIsInBounds = endLine <= lineCount;
  if (!startIsInBounds || !endIsInBounds) {
    return null;
  }

  const startOffset = offsetAfterNthLineFeed(source, startLine - 1);
  const endOffset = endLine === lineCount ? source.length : offsetAfterNthLineFeed(source, endLine);

  return { startOffset, endOffset };
}
