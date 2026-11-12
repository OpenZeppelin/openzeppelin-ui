/**
 * @vitest-environment jsdom
 *
 * SF-24 · RadioGroup segmented variant. No Invariants stage (Low stakes): properties
 * are the spec acceptance scenarios, labelled P1..P5 below.
 *   P1 radio semantics: group/radio roles, exactly one checked, visibly selected
 *   P2 selection by click and arrow keys; onValueChange
 *   P3 one row, no overlap: segments share the row equally and truncate (class contract)
 *   P4 label = children, falling back to title; accessible name = label
 *   P5 disabled segment inert; default and card variants unchanged
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import React from 'react';

import { RadioGroup, RadioGroupItem } from './radio-group';

function Mode({
  onValueChange,
  value,
  defaultValue,
  className,
}: {
  onValueChange?: (v: string) => void;
  value?: string;
  defaultValue?: string;
  className?: string;
}) {
  return (
    <RadioGroup
      variant="segmented"
      aria-label="Mode"
      onValueChange={onValueChange}
      value={value}
      defaultValue={defaultValue}
      className={className}
    >
      <RadioGroupItem value="automatic">Automatic</RadioGroupItem>
      <RadioGroupItem value="manual">Manual</RadioGroupItem>
    </RadioGroup>
  );
}

const checkedValues = () =>
  screen
    .getAllByRole('radio')
    .filter((r) => r.getAttribute('aria-checked') === 'true')
    .map((r) => r.getAttribute('value'));

/** Radix moves selection in a timeout after keydown and drops it if keyup already fired; hold the key. */
async function arrow(
  user: ReturnType<typeof userEvent.setup>,
  key: 'ArrowRight' | 'ArrowLeft' | 'ArrowDown' | 'ArrowUp',
  expected: string[]
) {
  await user.keyboard(`{${key}>}`);
  try {
    await waitFor(() => expect(checkedValues()).toEqual(expected));
  } finally {
    await user.keyboard(`{/${key}}`);
  }
}

describe('RadioGroup segmented variant (SF-24)', () => {
  describe('P1 radio semantics', () => {
    it('renders a radiogroup of two radios, none checked by default', () => {
      render(<Mode />);
      expect(screen.getByRole('radiogroup', { name: 'Mode' })).toBeTruthy();
      expect(screen.getAllByRole('radio')).toHaveLength(2);
      expect(checkedValues()).toEqual([]);
    });

    it('reflects defaultValue as the single checked segment', () => {
      render(<Mode defaultValue="manual" />);
      expect(checkedValues()).toEqual(['manual']);
    });

    it('marks the checked segment visibly via data-state and the raised-background class', () => {
      render(<Mode defaultValue="automatic" />);
      const [auto, manual] = screen.getAllByRole('radio');
      expect(auto.getAttribute('data-state')).toBe('checked');
      expect(manual.getAttribute('data-state')).toBe('unchecked');
      expect(auto.className).toContain('data-[state=checked]:bg-background');
    });

    it('sets data-variant="segmented" on the root and every item', () => {
      render(<Mode />);
      expect(screen.getByRole('radiogroup').getAttribute('data-variant')).toBe('segmented');
      for (const r of screen.getAllByRole('radio')) {
        expect(r.getAttribute('data-variant')).toBe('segmented');
      }
    });

    it('supports three segments with exactly one checked at a time', async () => {
      const user = userEvent.setup();
      render(
        <RadioGroup variant="segmented" aria-label="Size" defaultValue="s">
          <RadioGroupItem value="s">S</RadioGroupItem>
          <RadioGroupItem value="m">M</RadioGroupItem>
          <RadioGroupItem value="l">L</RadioGroupItem>
        </RadioGroup>
      );
      await user.click(screen.getByRole('radio', { name: 'L' }));
      expect(checkedValues()).toEqual(['l']);
    });
  });

  describe('P2 selection by pointer and keyboard', () => {
    it('click selects the segment and fires onValueChange once', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Mode onValueChange={onValueChange} defaultValue="automatic" />);
      await user.click(screen.getByRole('radio', { name: 'Manual' }));
      expect(checkedValues()).toEqual(['manual']);
      expect(onValueChange.mock.calls).toEqual([['manual']]);
    });

    it('clicking the already-checked segment does not fire onValueChange', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Mode onValueChange={onValueChange} defaultValue="automatic" />);
      await user.click(screen.getByRole('radio', { name: 'Automatic' }));
      expect(checkedValues()).toEqual(['automatic']);
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('arrow keys move selection with wrap-around, one checked throughout', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Mode onValueChange={onValueChange} defaultValue="automatic" />);
      screen.getByRole('radio', { name: 'Automatic' }).focus();
      await arrow(user, 'ArrowRight', ['manual']);
      await arrow(user, 'ArrowRight', ['automatic']);
      await arrow(user, 'ArrowLeft', ['manual']);
      expect(onValueChange.mock.calls).toEqual([['manual'], ['automatic'], ['manual']]);
    });

    it('Tab lands on the checked segment only (roving tabindex)', async () => {
      const user = userEvent.setup();
      render(<Mode defaultValue="manual" />);
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Manual' }));
    });

    it('controlled: checked state follows the prop, callback still fires', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      const { rerender } = render(<Mode value="automatic" onValueChange={onValueChange} />);
      await user.click(screen.getByRole('radio', { name: 'Manual' }));
      expect(onValueChange.mock.calls).toEqual([['manual']]);
      expect(checkedValues()).toEqual(['automatic']);
      rerender(<Mode value="manual" onValueChange={onValueChange} />);
      expect(checkedValues()).toEqual(['manual']);
    });
  });

  describe('P3 one row, no overlap (class contract; jsdom has no layout)', () => {
    it('root is a single non-wrapping row', () => {
      render(<Mode />);
      const root = screen.getByRole('radiogroup');
      expect(root.className).toContain('flex-row');
      expect(root.className).toContain('inline-flex');
      expect(root.className).not.toContain('flex-wrap');
      expect(root.className).not.toContain('flex-col');
      expect(root.className).not.toContain('space-y-2');
    });

    it('every segment takes an equal share and truncates instead of wrapping', () => {
      render(<Mode />);
      for (const r of screen.getAllByRole('radio')) {
        expect(r.className).toContain('flex-1');
        expect(r.className).toContain('min-w-0');
        expect(r.className).toContain('truncate');
      }
    });

    it('caller className is merged and wins over the root width', () => {
      render(<Mode className="max-w-xs w-1/2" />);
      const root = screen.getByRole('radiogroup');
      expect(root.className).toContain('max-w-xs');
      expect(root.className).toContain('w-1/2');
      expect(root.className).not.toContain('w-full');
    });

    it('a very long label stays in the DOM in full (truncation is visual, name stays complete)', () => {
      const long = 'A very long segment label that cannot possibly fit in a narrow container';
      render(
        <RadioGroup variant="segmented" aria-label="Mode">
          <RadioGroupItem value="a">{long}</RadioGroupItem>
          <RadioGroupItem value="b">Short</RadioGroupItem>
        </RadioGroup>
      );
      expect(screen.getByRole('radio', { name: long })).toBeTruthy();
    });
  });

  describe('P4 label and accessible name', () => {
    it('children are the accessible name', () => {
      render(<Mode />);
      expect(screen.getByRole('radio', { name: 'Automatic' })).toBeTruthy();
      expect(screen.getByRole('radio', { name: 'Manual' })).toBeTruthy();
    });

    it('falls back to title when there are no children', () => {
      render(
        <RadioGroup variant="segmented" aria-label="Mode">
          <RadioGroupItem value="a" title="Alpha" />
          <RadioGroupItem value="b" title="Beta" />
        </RadioGroup>
      );
      expect(screen.getByRole('radio', { name: 'Alpha' })).toBeTruthy();
    });

    it('children win over title', () => {
      render(
        <RadioGroup variant="segmented" aria-label="Mode">
          <RadioGroupItem value="a" title="Alpha">
            Shown
          </RadioGroupItem>
        </RadioGroup>
      );
      expect(screen.getByRole('radio', { name: 'Shown' })).toBeTruthy();
      expect(screen.queryByText('Alpha')).toBeNull();
    });

    it('description is ignored and adds no aria-describedby', () => {
      render(
        <RadioGroup variant="segmented" aria-label="Mode">
          <RadioGroupItem value="a" description="ignored text">
            Alpha
          </RadioGroupItem>
        </RadioGroup>
      );
      expect(screen.queryByText('ignored text')).toBeNull();
      expect(screen.getByRole('radio').getAttribute('aria-describedby')).toBeNull();
    });

    it('caller aria-label on a segment overrides the visible label as the name', () => {
      render(
        <RadioGroup variant="segmented" aria-label="Mode">
          <RadioGroupItem value="a" aria-label="Automatic mode">
            Auto
          </RadioGroupItem>
        </RadioGroup>
      );
      expect(screen.getByRole('radio', { name: 'Automatic mode' })).toBeTruthy();
    });
  });

  describe('P5 disabled, and other variants unchanged', () => {
    function WithDisabled({ onValueChange }: { onValueChange?: (v: string) => void }) {
      return (
        <RadioGroup
          variant="segmented"
          aria-label="Mode"
          defaultValue="a"
          onValueChange={onValueChange}
        >
          <RadioGroupItem value="a">A</RadioGroupItem>
          <RadioGroupItem value="b" disabled>
            B
          </RadioGroupItem>
          <RadioGroupItem value="c">C</RadioGroupItem>
        </RadioGroup>
      );
    }

    it('a disabled segment is reported disabled and click is inert', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<WithDisabled onValueChange={onValueChange} />);
      const b = screen.getByRole('radio', { name: 'B' }) as HTMLButtonElement;
      expect(b.disabled).toBe(true);
      await user.click(b);
      expect(checkedValues()).toEqual(['a']);
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('arrows skip a disabled segment', async () => {
      const user = userEvent.setup();
      render(<WithDisabled />);
      screen.getByRole('radio', { name: 'A' }).focus();
      await arrow(user, 'ArrowRight', ['c']);
    });

    it('a disabled but checked segment keeps its checked state', () => {
      render(
        <RadioGroup variant="segmented" aria-label="Mode" defaultValue="b">
          <RadioGroupItem value="a">A</RadioGroupItem>
          <RadioGroupItem value="b" disabled>
            B
          </RadioGroupItem>
        </RadioGroup>
      );
      expect(checkedValues()).toEqual(['b']);
    });

    it('default variant is unchanged: no data-variant, column layout, no segmented classes', () => {
      render(
        <RadioGroup aria-label="Plain" defaultValue="a">
          <RadioGroupItem value="a" />
          <RadioGroupItem value="b" />
        </RadioGroup>
      );
      const root = screen.getByRole('radiogroup');
      expect(root.getAttribute('data-variant')).toBeNull();
      expect(root.className).toContain('flex-col');
      expect(root.className).toContain('space-y-2');
      for (const r of screen.getAllByRole('radio')) {
        expect(r.getAttribute('data-variant')).toBeNull();
        expect(r.className).not.toContain('truncate');
      }
    });

    it('card variant is unchanged by the new variant', () => {
      render(
        <RadioGroup variant="card" aria-label="Card">
          <RadioGroupItem value="a" title="Alpha" description="Desc" />
        </RadioGroup>
      );
      const item = screen.getByRole('radio', { name: 'Alpha' });
      expect(item.getAttribute('data-variant')).toBe('card');
      expect(screen.getByText('Desc')).toBeTruthy();
      expect(screen.getByRole('radiogroup').className).toContain('flex-col');
    });

    it('forwards refs to the root div and to the item button', () => {
      const rootRef = React.createRef<HTMLDivElement>();
      const itemRef = React.createRef<HTMLButtonElement>();
      render(
        <RadioGroup variant="segmented" aria-label="Mode" ref={rootRef}>
          <RadioGroupItem value="a" ref={itemRef}>
            A
          </RadioGroupItem>
        </RadioGroup>
      );
      expect(rootRef.current).toBe(screen.getByRole('radiogroup'));
      expect(itemRef.current).toBe(screen.getByRole('radio'));
    });

    it('item className is merged with the segmented classes', () => {
      render(
        <RadioGroup variant="segmented" aria-label="Mode">
          <RadioGroupItem value="a" className="custom-seg">
            A
          </RadioGroupItem>
        </RadioGroup>
      );
      const r = screen.getByRole('radio');
      expect(r.className).toContain('custom-seg');
      expect(r.className).toContain('flex-1');
    });
  });
});
