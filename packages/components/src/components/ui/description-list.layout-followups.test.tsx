/**
 * @vitest-environment jsdom
 *
 * DescriptionList label width, five columns, span and optional dividers. Low stakes, so
 * the properties are the acceptance scenarios (S1–S4). jsdom pins the class contract;
 * Chromium geometry lives in examples/basic-react-app/e2e/description-list.layout-followups.spec.ts.
 *   S1 content-sized inline label track (not a fixed third)
 *   S2 five columns + full-row span + vertical column rules
 *   S3 single-column dividers off vs default
 *   S4 span in a one-column list is a no-op; untyped columns still degrade
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  DescriptionList,
  type DescriptionListColumns,
  type DescriptionListItem,
} from './description-list';

const items: DescriptionListItem[] = [
  { label: 'Network', value: 'Ethereum Mainnet' },
  { label: 'Amount', value: '1,250.00 USDC' },
  { label: 'Memo', value: '' },
];

const fiveItems: DescriptionListItem[] = [
  { label: 'A', value: '1' },
  { label: 'B', value: '2' },
  { label: 'C', value: '3' },
  { label: 'D', value: '4' },
  { label: 'E', value: '5' },
  { label: 'Note', value: 'full row', span: true },
  { label: 'F', value: '6' },
  { label: 'G', value: '7' },
];

function parts(container: HTMLElement) {
  const dl = container.querySelector('dl') as HTMLDListElement;
  const pairs = Array.from(dl.children) as HTMLElement[];
  return {
    dl,
    pairs,
    dts: pairs.map((p) => p.querySelector('dt') as HTMLElement),
    dds: pairs.map((p) => p.querySelector('dd') as HTMLElement),
  };
}

const classes = (el: HTMLElement): string[] => Array.from(el.classList);

describe('DescriptionList layout follow-ups', () => {
  describe('S1 content-sized inline label', () => {
    it('uses an auto label track and a flexible value track from sm', () => {
      const { pairs, dds } = parts(render(<DescriptionList items={items} />).container);
      for (const pair of pairs) {
        expect(classes(pair)).toContain('sm:grid-cols-[auto_minmax(0,1fr)]');
        expect(classes(pair)).not.toContain('sm:grid-cols-3');
      }
      for (const dd of dds) expect(classes(dd)).not.toContain('sm:col-span-2');
    });

    it('keeps the content-sized track when valueAlign is end (boundary)', () => {
      const { pairs } = parts(render(<DescriptionList items={items} valueAlign="end" />).container);
      for (const pair of pairs) {
        expect(classes(pair)).toContain('sm:grid-cols-[auto_minmax(0,1fr)]');
        expect(classes(pair)).not.toContain('sm:grid-cols-3');
      }
    });
  });

  describe('S2 five columns, span and column rules', () => {
    it.each<[DescriptionListColumns, string[]]>([
      [4, ['grid-cols-1', 'sm:grid-cols-2', 'md:grid-cols-3', 'lg:grid-cols-4']],
      [5, ['grid-cols-1', 'sm:grid-cols-2', 'md:grid-cols-3', 'lg:grid-cols-5']],
    ])('columns=%s steps through progressive tracks', (cols, expected) => {
      const { dl } = parts(render(<DescriptionList items={items} columns={cols} />).container);
      expect(classes(dl)).toEqual(expect.arrayContaining(expected));
      expect(classes(dl)).not.toContain('divide-y');
      expect(classes(dl).filter((c) => /^grid-cols-\d+$/.test(c) && c !== 'grid-cols-1')).toEqual(
        []
      );
    });

    it('marks a spanning pair col-span-full and leaves neighbours unspanned', () => {
      const { pairs } = parts(
        render(<DescriptionList items={fiveItems} layout="stacked" columns={5} />).container
      );
      expect(classes(pairs[5])).toContain('col-span-full');
      for (const i of [0, 1, 2, 3, 4, 6, 7]) {
        expect(classes(pairs[i])).not.toContain('col-span-full');
      }
    });

    it('draws a vertical rule on non-first columns at the full-count breakpoint', () => {
      const { pairs } = parts(
        render(<DescriptionList items={fiveItems} layout="stacked" columns={5} />).container
      );
      // A–E fill the first row: B–E get lg:before rules; the span and F (col 0 of next row) do not.
      expect(classes(pairs[0])).not.toContain('lg:before:bg-border');
      for (const i of [1, 2, 3, 4]) {
        expect(classes(pairs[i])).toEqual(
          expect.arrayContaining([
            'relative',
            'lg:before:absolute',
            'lg:before:inset-y-0',
            'lg:before:-left-4',
            'lg:before:w-px',
            'lg:before:bg-border',
          ])
        );
      }
      expect(classes(pairs[5])).not.toContain('lg:before:bg-border');
      expect(classes(pairs[6])).not.toContain('lg:before:bg-border');
      expect(classes(pairs[7])).toContain('lg:before:bg-border');
    });

    it('uses sm:before rules for two columns (full count from sm)', () => {
      const { pairs } = parts(render(<DescriptionList items={items} columns={2} />).container);
      expect(classes(pairs[0])).not.toContain('sm:before:bg-border');
      expect(classes(pairs[1])).toEqual(
        expect.arrayContaining([
          'relative',
          'sm:before:absolute',
          'sm:before:inset-y-0',
          'sm:before:-left-4',
          'sm:before:w-px',
          'sm:before:bg-border',
        ])
      );
      expect(classes(pairs[1])).not.toContain('lg:before:bg-border');
    });

    it('resets column index after a mid-row span so the next pair has no rule (boundary)', () => {
      const midSpan: DescriptionListItem[] = [
        { label: 'A', value: '1' },
        { label: 'B', value: '2', span: true },
        { label: 'C', value: '3' },
      ];
      const { pairs } = parts(render(<DescriptionList items={midSpan} columns={3} />).container);
      expect(classes(pairs[0])).not.toContain('lg:before:bg-border');
      expect(classes(pairs[1])).toContain('col-span-full');
      expect(classes(pairs[1])).not.toContain('lg:before:bg-border');
      expect(classes(pairs[2])).not.toContain('lg:before:bg-border');
    });
  });

  describe('S3 single-column dividers', () => {
    it('keeps divide-y when dividers is omitted or true', () => {
      const omitted = parts(render(<DescriptionList items={items} />).container);
      const explicit = parts(render(<DescriptionList items={items} dividers />).container);
      expect(omitted.dl.className).toBe('divide-y');
      expect(explicit.dl.className).toBe('divide-y');
    });

    it('drops divide-y when dividers is false', () => {
      const { dl, pairs } = parts(
        render(<DescriptionList items={items} dividers={false} />).container
      );
      expect(classes(dl)).not.toContain('divide-y');
      expect(dl.className).toBe('');
      for (const pair of pairs) {
        expect(classes(pair)).toContain('sm:grid-cols-[auto_minmax(0,1fr)]');
        expect(classes(pair)).toContain('py-3');
      }
    });

    it('ignores dividers on a multi-column list (still no row rules)', () => {
      const { dl } = parts(
        render(<DescriptionList items={items} columns={2} dividers />).container
      );
      expect(classes(dl)).not.toContain('divide-y');
      expect(classes(dl)).toEqual(expect.arrayContaining(['grid', 'sm:grid-cols-2']));
    });
  });

  describe('S4 edges and failures', () => {
    it('treats span as a no-op in a single-column list', () => {
      const spanned: DescriptionListItem[] = [
        { label: 'Network', value: 'Ethereum Mainnet', span: true },
        { label: 'Amount', value: '1,250.00 USDC' },
      ];
      const { pairs } = parts(render(<DescriptionList items={spanned} />).container);
      for (const pair of pairs) {
        expect(classes(pair)).not.toContain('col-span-full');
        expect(classes(pair)).not.toContain('lg:before:bg-border');
        expect(pair.className).toBe(
          'flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:grid sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-4'
        );
      }
    });

    it('unknown columns degrade to the single-column default (failure)', () => {
      const { dl, pairs } = parts(
        render(
          <DescriptionList
            items={[{ label: 'A', value: '1', span: true }]}
            // @ts-expect-error 6 is not a DescriptionListColumns
            columns={6}
          />
        ).container
      );
      expect(dl.className).toBe('divide-y');
      expect(classes(pairs[0])).not.toContain('col-span-full');
      expect(classes(pairs[0])).toContain('sm:grid-cols-[auto_minmax(0,1fr)]');
    });
  });
});
