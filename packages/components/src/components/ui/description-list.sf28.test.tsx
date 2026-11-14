/**
 * @vitest-environment jsdom
 *
 * SF-28 · DescriptionList. No Invariants stage (Low stakes): properties are the spec
 * acceptance scenarios, labelled P1..P5 below.
 *   P1 term/definition semantics: label -> dt, value -> dd, inside a dl, in order
 *   P2 composed values (kit components) work inside a definition
 *   P3 empty value keeps the pair (placeholder), `0` is a real value
 *   P4 responsive layout: stacked by default, grid from `sm`
 *   P5 element contract: <dl>, ref, className merge, attribute passthrough, keys, export
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';

import { AddressDisplay } from '../ui/address-display';
import { DescriptionList, type DescriptionListItem } from './description-list';
import * as ui from './index';

const five: DescriptionListItem[] = [
  { label: 'Network', value: 'Ethereum Mainnet' },
  { label: 'Recipient', value: 'bob' },
  { label: 'Amount', value: '1,250.00 USDC' },
  { label: 'Estimated fee', value: '0.0021 ETH' },
  { label: 'Memo', value: 'rent' },
];

describe('DescriptionList (SF-28)', () => {
  describe('P1 term/definition semantics', () => {
    it('exposes each label as a term and each value as its definition', () => {
      const { container } = render(<DescriptionList items={five} />);
      const dl = container.querySelector('dl');
      expect(dl).not.toBeNull();
      const terms = screen.getAllByRole('term');
      const defs = screen.getAllByRole('definition');
      expect(terms.map((t) => t.textContent)).toEqual(five.map((i) => i.label));
      expect(defs.map((d) => d.textContent)).toEqual(five.map((i) => i.value));
      expect(terms.every((t) => t.tagName === 'DT')).toBe(true);
      expect(defs.every((d) => d.tagName === 'DD')).toBe(true);
    });

    it('groups each dt/dd pair in its own wrapper, keeping pair order', () => {
      const { container } = render(<DescriptionList items={five} />);
      const groups = Array.from(container.querySelector('dl')!.children);
      expect(groups).toHaveLength(5);
      groups.forEach((g, i) => {
        expect(g.children).toHaveLength(2);
        expect(g.children[0].tagName).toBe('DT');
        expect(g.children[1].tagName).toBe('DD');
        expect(g.children[0].textContent).toBe(five[i].label);
      });
    });

    it('renders an empty dl for no items (boundary)', () => {
      const { container } = render(<DescriptionList items={[]} />);
      expect(container.querySelector('dl')?.children).toHaveLength(0);
    });

    it('accepts composed ReactNode labels', () => {
      render(<DescriptionList items={[{ label: <em>Net</em>, value: 'x' }]} />);
      expect(within(screen.getByRole('term')).getByText('Net').tagName).toBe('EM');
    });
  });

  describe('P2 composed values', () => {
    const ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';

    it('renders an AddressDisplay inside its definition, with a working copy button', async () => {
      const writeText = vi.fn(() => Promise.resolve());
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
      render(
        <DescriptionList
          items={[
            ...five.slice(0, 1),
            { label: 'Recipient', value: <AddressDisplay address={ADDRESS} showCopyButton /> },
          ]}
        />
      );
      const composed = screen.getAllByRole('definition')[1];
      expect(composed.textContent).toContain('0x742d');
      fireEvent.click(within(composed).getByRole('button', { name: 'Copy address' }));
      await waitFor(() => expect(writeText).toHaveBeenCalledWith(ADDRESS));
    });

    it('renders arbitrary elements (a link) as a value', () => {
      render(<DescriptionList items={[{ label: 'Docs', value: <a href="/x">Read</a> }]} />);
      expect(
        within(screen.getByRole('definition')).getByRole('link', { name: 'Read' })
      ).toBeTruthy();
    });
  });

  describe('P3 empty values', () => {
    it.each<[string, DescriptionListItem['value']]>([
      ['undefined', undefined],
      ['null', null],
      ['false', false],
      ["''", ''],
    ])('%s value keeps the pair and shows the default placeholder', (_n, value) => {
      render(<DescriptionList items={[{ label: 'Memo', value }, ...five.slice(0, 1)]} />);
      expect(screen.getAllByRole('term')).toHaveLength(2);
      const defs = screen.getAllByRole('definition');
      expect(defs).toHaveLength(2);
      expect(defs[0].textContent).toBe('—');
    });

    it('emptyValue overrides the placeholder', () => {
      render(<DescriptionList emptyValue="Not set" items={[{ label: 'Memo', value: '' }]} />);
      expect(screen.getByRole('definition').textContent).toBe('Not set');
    });

    it('emptyValue is not applied to present values', () => {
      render(<DescriptionList emptyValue="Not set" items={[{ label: 'A', value: 'x' }]} />);
      expect(screen.getByRole('definition').textContent).toBe('x');
    });

    it('0 is a real value, not a placeholder', () => {
      render(<DescriptionList items={[{ label: 'Count', value: 0 }]} />);
      expect(screen.getByRole('definition').textContent).toBe('0');
    });
  });

  describe('P4 responsive layout (class contract; jsdom has no media queries)', () => {
    it('stacks by default and becomes a 3-column grid from sm', () => {
      const { container } = render(<DescriptionList items={five.slice(0, 1)} />);
      const group = container.querySelector('dl')!.children[0];
      expect(group.className).toContain('flex-col');
      expect(group.className).toContain('sm:grid');
      expect(group.className).toContain('sm:grid-cols-3');
      expect(screen.getByRole('definition').className).toContain('sm:col-span-2');
    });

    it('lets long values wrap instead of overflowing', () => {
      render(<DescriptionList items={[{ label: 'Hash', value: 'a'.repeat(200) }]} />);
      const cls = screen.getByRole('definition').className;
      expect(cls).toContain('min-w-0');
      expect(cls).toContain('break-words');
    });
  });

  describe('P5 element contract', () => {
    it('forwards ref to the <dl>', () => {
      const ref = createRef<HTMLDListElement>();
      render(<DescriptionList ref={ref} items={five} />);
      expect(ref.current?.tagName).toBe('DL');
    });

    it('merges className with base classes', () => {
      const { container } = render(<DescriptionList className="custom" items={five} />);
      const dl = container.querySelector('dl')!;
      expect(dl.className).toContain('custom');
      expect(dl.className).toContain('divide-y');
    });

    it('passes through attributes', () => {
      const { container } = render(
        <DescriptionList id="d" data-testid="dl" aria-label="Review" items={five} />
      );
      const dl = container.querySelector('dl')!;
      expect(dl.id).toBe('d');
      expect(dl.getAttribute('data-testid')).toBe('dl');
      expect(dl.getAttribute('aria-label')).toBe('Review');
    });

    it('uses item.key for stable identity across reorder (no duplicate-key warning)', () => {
      const errors: unknown[][] = [];
      const orig = console.error;
      console.error = (...a: unknown[]) => void errors.push(a);
      try {
        const items: DescriptionListItem[] = [
          { key: 'a', label: 'A', value: '1' },
          { key: 'b', label: 'B', value: '2' },
        ];
        const { rerender } = render(<DescriptionList items={items} />);
        rerender(<DescriptionList items={[items[1], items[0]]} />);
      } finally {
        console.error = orig;
      }
      expect(errors).toEqual([]);
      expect(screen.getAllByRole('term').map((t) => t.textContent)).toEqual(['B', 'A']);
    });

    it('is exported from the ui barrel', () => {
      expect(ui.DescriptionList).toBe(DescriptionList);
    });
  });
});
