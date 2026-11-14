/**
 * @vitest-environment jsdom
 *
 * DescriptionList layout options (`layout`, `columns`, `valueAlign`). Low stakes, so the
 * properties are the three acceptance scenarios, labelled S1..S3. jsdom has no layout engine,
 * so this file pins the class contract; the real column geometry is checked in Chromium by
 * examples/basic-react-app/e2e/description-list.layouts.spec.ts.
 *   S1 no new props -> classes and structure equal the previous release (literal strings)
 *   S2 stacked + two columns + end -> the classes that produce that layout, same dl/dt/dd tree
 *   S3 multi-column falls back to one column below `sm`, without overflow
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  DescriptionList,
  type DescriptionListColumns,
  type DescriptionListItem,
} from './description-list';

// Class strings of the component before the layout options existed. Literal on purpose: a
// snapshot of the current code would follow any drift in the default output.
const BASE_DL = 'divide-y';
const BASE_PAIR =
  'flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:grid sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-4';
const BASE_DD = 'min-w-0 break-words text-sm';
const BASE_DT = 'text-sm text-muted-foreground';

const items: DescriptionListItem[] = [
  { label: 'Network', value: 'Ethereum Mainnet' },
  { label: 'Amount', value: '1,250.00 USDC' },
  { label: 'Memo', value: '' },
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

describe('DescriptionList layouts', () => {
  describe('S1 defaults equal the previous release', () => {
    it('no new props: dl, pair, dt and dd classes match the previous strings', () => {
      const { container } = render(<DescriptionList items={items} />);
      const { dl, pairs, dts, dds } = parts(container);
      expect(dl.className).toBe(BASE_DL);
      for (const pair of pairs) expect(pair.className).toBe(BASE_PAIR);
      for (const dt of dts) expect(dt.className).toBe(BASE_DT);
      for (const dd of dds) expect(dd.className).toBe(BASE_DD);
    });

    it('explicit default values render the same markup as no props', () => {
      const bare = render(<DescriptionList items={items} />).container.innerHTML;
      const explicit = render(
        <DescriptionList items={items} layout="inline" columns={1} valueAlign="start" />
      ).container.innerHTML;
      expect(explicit).toBe(bare);
    });

    it('className and attributes still reach the dl next to the defaults', () => {
      const { container } = render(
        <DescriptionList items={items} className="extra" data-testid="dl" />
      );
      const { dl } = parts(container);
      expect(dl.className).toBe(`${BASE_DL} extra`);
      expect(dl.getAttribute('data-testid')).toBe('dl');
    });

    it('renders an empty dl for no items in every layout combination (boundary)', () => {
      const { container } = render(
        <DescriptionList items={[]} layout="stacked" columns={3} valueAlign="end" />
      );
      expect(container.querySelector('dl')?.children).toHaveLength(0);
    });
  });

  describe('S2 stacked, two columns, values at the end', () => {
    function renderS2() {
      return parts(
        render(<DescriptionList items={items} layout="stacked" columns={2} valueAlign="end" />)
          .container
      );
    }

    it('puts the pairs on a two-column grid from sm and drops the row dividers', () => {
      const { dl } = renderS2();
      expect(classes(dl)).toEqual(
        expect.arrayContaining(['grid', 'grid-cols-1', 'sm:grid-cols-2'])
      );
      expect(classes(dl)).not.toContain('divide-y');
      expect(classes(dl)).not.toContain('lg:grid-cols-3');
    });

    it('keeps the label above the value at every width (no side-by-side grid on the pair)', () => {
      const { pairs, dds } = renderS2();
      for (const pair of pairs) {
        expect(classes(pair)).toEqual(expect.arrayContaining(['flex', 'flex-col']));
        expect(classes(pair)).not.toContain('sm:grid');
        expect(classes(pair)).not.toContain('sm:grid-cols-3');
      }
      for (const dd of dds) expect(classes(dd)).not.toContain('sm:col-span-2');
    });

    it('aligns each value to the end', () => {
      const { dds } = renderS2();
      for (const dd of dds) {
        expect(classes(dd)).toEqual(expect.arrayContaining(['ms-auto', 'max-w-full', 'text-end']));
      }
    });

    it('leaves the dl > div > dt + dd structure, order and text unchanged', () => {
      const { dl, pairs } = renderS2();
      expect(dl.tagName).toBe('DL');
      expect(pairs).toHaveLength(items.length);
      pairs.forEach((pair, i) => {
        expect(pair.tagName).toBe('DIV');
        expect(Array.from(pair.children).map((c) => c.tagName)).toEqual(['DT', 'DD']);
        expect(pair.querySelector('dt')?.textContent).toBe(items[i].label);
      });
      expect(pairs[2].querySelector('dd')?.textContent).toBe('—');
    });

    it('end alignment alone leaves the base layout classes in place', () => {
      const { pairs, dds } = parts(
        render(<DescriptionList items={items} valueAlign="end" />).container
      );
      for (const pair of pairs) expect(pair.className).toBe(BASE_PAIR);
      for (const dd of dds) expect(dd.className).toBe(`${BASE_DD} ms-auto max-w-full text-end`);
    });

    it('stacked alone removes the side-by-side grid but keeps the dividers', () => {
      const { dl, pairs, dds } = parts(
        render(<DescriptionList items={items} layout="stacked" />).container
      );
      expect(dl.className).toBe(BASE_DL);
      for (const pair of pairs)
        expect(pair.className).toBe('flex flex-col gap-1 py-3 first:pt-0 last:pb-0');
      for (const dd of dds) expect(dd.className).toBe('min-w-0 break-words text-sm');
    });
  });

  describe('S3 narrow fallback', () => {
    it.each<[DescriptionListColumns, string[]]>([
      [2, ['grid-cols-1', 'sm:grid-cols-2']],
      [3, ['grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3']],
    ])(
      'columns=%s starts from one column and only adds tracks at breakpoints',
      (cols, expected) => {
        const { dl } = parts(render(<DescriptionList items={items} columns={cols} />).container);
        expect(classes(dl)).toEqual(expect.arrayContaining(expected));
        // No unprefixed multi-column utility: below `sm` there is exactly one track.
        expect(classes(dl).filter((c) => /^grid-cols-\d+$/.test(c) && c !== 'grid-cols-1')).toEqual(
          []
        );
      }
    );

    it('lets each pair shrink so a long value wraps instead of widening the grid', () => {
      const { pairs, dds } = parts(
        render(<DescriptionList items={items} columns={2} valueAlign="end" />).container
      );
      for (const pair of pairs) expect(classes(pair)).toContain('min-w-0');
      for (const dd of dds)
        expect(classes(dd)).toEqual(
          expect.arrayContaining(['min-w-0', 'break-words', 'max-w-full'])
        );
    });

    it('single-column pairs keep their padding; multi-column pairs use grid gaps', () => {
      const single = parts(render(<DescriptionList items={items} />).container);
      const multi = parts(render(<DescriptionList items={items} columns={2} />).container);
      expect(classes(single.pairs[0])).toContain('py-3');
      expect(classes(multi.pairs[0])).not.toContain('py-3');
      expect(classes(multi.dl)).toEqual(expect.arrayContaining(['gap-x-8', 'gap-y-4']));
    });
  });

  describe('untyped input degrades to the default look (failure)', () => {
    it('unknown columns, layout and valueAlign render the base classes', () => {
      const { dl, pairs, dds } = parts(
        render(
          <DescriptionList
            items={items}
            // @ts-expect-error 6 is not a DescriptionListColumns
            columns={6}
            // @ts-expect-error 'wide' is not a DescriptionListLayout
            layout="wide"
            // @ts-expect-error 'center' is not a DescriptionListValueAlign
            valueAlign="center"
          />
        ).container
      );
      expect(dl.className).toBe(BASE_DL);
      for (const pair of pairs) expect(pair.className).toBe(BASE_PAIR);
      for (const dd of dds) expect(dd.className).toBe(BASE_DD);
    });
  });
});
