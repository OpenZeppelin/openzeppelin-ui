/**
 * @vitest-environment node
 *
 * SF-13 · Range validity — INV-6 (resolveRevealRange table).
 */
import { describe, expect, it } from 'vitest';

import { resolveRevealRange, type RevealOffsets } from '../reveal';
import type { CodeViewReveal } from '../types';
import { TEN_LINE_SOURCE } from './reveal-helpers';

const LINE_1: CodeViewReveal = { startLine: 1, endLine: 1 };

function expectNull(source: string, reveal: CodeViewReveal | undefined, reason: string): void {
  expect(resolveRevealRange(source, reveal), reason).toBeNull();
}

describe('INV-6: resolveRevealRange returns null for every invalid row', () => {
  it('returns null when reveal is omitted', () => {
    expectNull(TEN_LINE_SOURCE, undefined, 'INV-6: omitted reveal must resolve to null');
  });

  it.each([
    ['NaN startLine', { startLine: Number.NaN, endLine: 1 }],
    ['NaN endLine', { startLine: 1, endLine: Number.NaN }],
    ['Infinity startLine', { startLine: Number.POSITIVE_INFINITY, endLine: 1 }],
    ['Infinity endLine', { startLine: 1, endLine: Number.POSITIVE_INFINITY }],
    ['-Infinity startLine', { startLine: Number.NEGATIVE_INFINITY, endLine: 1 }],
    ['fractional startLine 1.5', { startLine: 1.5, endLine: 2 }],
    ['fractional endLine 2.5', { startLine: 1, endLine: 2.5 }],
  ] as const)('returns null for non-integer %s', (_label, reveal) => {
    expectNull(
      TEN_LINE_SOURCE,
      reveal,
      `INV-6: non-integer ${_label} must no-op; flooring would jump to the wrong line`
    );
  });

  it.each([
    ['zero startLine', { startLine: 0, endLine: 1 }],
    ['zero endLine', { startLine: 1, endLine: 0 }],
    ['negative startLine', { startLine: -1, endLine: 1 }],
    ['negative endLine', { startLine: 1, endLine: -3 }],
  ] as const)('returns null for %s', (_label, reveal) => {
    expectNull(
      TEN_LINE_SOURCE,
      reveal,
      `INV-6: ${_label} must no-op; clamping to 1 would look like a successful jump`
    );
  });

  it('returns null for an inverted range and does not swap the bounds', () => {
    const inverted = resolveRevealRange(TEN_LINE_SOURCE, { startLine: 5, endLine: 3 });
    const swapped = resolveRevealRange(TEN_LINE_SOURCE, { startLine: 3, endLine: 5 });
    expect(inverted, 'INV-6: inverted {5,3} must be null, not swapped into {3,5}').toBeNull();
    expect(swapped, 'INV-6: the swapped pair is valid and must resolve').not.toBeNull();
  });

  it('returns null when either bound is past the line count', () => {
    expectNull(
      TEN_LINE_SOURCE,
      { startLine: 1000, endLine: 1001 },
      'INV-6: {1000,1001} on a 10-line file must not paint the last line'
    );
    expectNull(
      TEN_LINE_SOURCE,
      { startLine: 5, endLine: 100 },
      'INV-6: {5,100} on a 10-line file must not clamp to 5-10'
    );
    expectNull(
      TEN_LINE_SOURCE,
      { startLine: 11, endLine: 11 },
      'INV-6: startLine past lineCount invalidates the whole range'
    );
    expectNull(
      TEN_LINE_SOURCE,
      { startLine: 1, endLine: 11 },
      'INV-6: endLine past lineCount invalidates the whole range'
    );
  });

  it('returns null for any reveal against empty source (0 lines, not 1 empty line)', () => {
    expectNull('', LINE_1, 'INV-6: empty source is 0 lines; {1,1} must not paint an empty mark');
    expectNull('', { startLine: 1, endLine: 2 }, 'INV-6: empty source rejects every range');
  });
});

describe('INV-6: line count and valid offsets', () => {
  it('treats a string with no newline as one line', () => {
    const offsets = resolveRevealRange('hello', LINE_1);
    expect(offsets).toEqual<RevealOffsets>({ startOffset: 0, endOffset: 5 });
    expectNull('hello', { startLine: 2, endLine: 2 }, 'INV-6: "hello" is 1 line');
  });

  it('counts a trailing newline as an extra empty line', () => {
    const source = 'hello\n';
    expect(resolveRevealRange(source, LINE_1)).toEqual<RevealOffsets>({
      startOffset: 0,
      endOffset: 6,
    });
    expect(resolveRevealRange(source, { startLine: 2, endLine: 2 })).toEqual<RevealOffsets>({
      startOffset: 6,
      endOffset: 6,
    });
  });

  it('counts "hello\\nworld" as two lines', () => {
    const source = 'hello\nworld';
    expect(resolveRevealRange(source, { startLine: 1, endLine: 2 })).toEqual<RevealOffsets>({
      startOffset: 0,
      endOffset: 11,
    });
    expect(resolveRevealRange(source, { startLine: 2, endLine: 2 })).toEqual<RevealOffsets>({
      startOffset: 6,
      endOffset: 11,
    });
    expectNull(source, { startLine: 3, endLine: 3 }, 'INV-6: two lines, no third');
  });

  it('does not treat \\r as a line break', () => {
    const source = 'hello\rworld';
    expect(resolveRevealRange(source, LINE_1)).toEqual<RevealOffsets>({
      startOffset: 0,
      endOffset: 11,
    });
    expectNull(source, { startLine: 2, endLine: 2 }, 'INV-6: \\r stays on the line');
  });

  it('resolves a single in-bounds line', () => {
    const offsets = resolveRevealRange(TEN_LINE_SOURCE, { startLine: 4, endLine: 4 });
    expect(offsets, 'INV-6: {4,4} on a 10-line file is a one-line hit').not.toBeNull();
    if (offsets === null) {
      return;
    }
    expect(TEN_LINE_SOURCE.slice(offsets.startOffset, offsets.endOffset)).toBe('line-04\n');
  });

  it('uses UTF-16 offsets, matching JavaScript string indices', () => {
    const source = '🛡️\nnext';
    const offsets = resolveRevealRange(source, { startLine: 2, endLine: 2 });
    expect(offsets).toEqual<RevealOffsets>({
      startOffset: '🛡️\n'.length,
      endOffset: source.length,
    });
  });
});
