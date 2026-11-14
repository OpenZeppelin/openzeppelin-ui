/**
 * @vitest-environment jsdom
 *
 * SF-23 · RadioGroup card variant. No Invariants stage (Low stakes): properties
 * are the spec acceptance scenarios, labelled P1..P5 below.
 *   P1 radio semantics: group/radio roles, one checked at a time
 *   P2 card accessible name = title, description = accessible description
 *   P3 selection by click (anywhere on the card) and arrow keys; onValueChange
 *   P4 disabled card: inert to click, skipped by arrows
 *   P5 default variant unchanged; variant/title/description contract
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import React from 'react';

import { RadioGroup, RadioGroupItem } from './radio-group';

function Products({
  onValueChange,
  value,
  defaultValue,
}: {
  onValueChange?: (v: string) => void;
  value?: string;
  defaultValue?: string;
}) {
  return (
    <RadioGroup
      variant="card"
      aria-label="Product type"
      onValueChange={onValueChange}
      value={value}
      defaultValue={defaultValue}
    >
      <RadioGroupItem value="spot" title="Spot" description="Buy at market price." />
      <RadioGroupItem value="futures" title="Futures" description="Settles later." />
      <RadioGroupItem value="options" title="Options" description="Not in your region." disabled />
    </RadioGroup>
  );
}

const checkedValues = () =>
  screen
    .getAllByRole('radio')
    .filter((r) => r.getAttribute('aria-checked') === 'true')
    .map((r) => r.getAttribute('value'));

/**
 * Radix moves focus (and so selection) in a timeout after keydown and ignores
 * it if keyup already fired. user.keyboard('{ArrowDown}') releases instantly,
 * so hold the key until the expected value shows up, as a real press would.
 */
async function arrow(
  user: ReturnType<typeof userEvent.setup>,
  key: 'ArrowDown' | 'ArrowUp',
  expected: string[]
) {
  await user.keyboard(`{${key}>}`);
  try {
    await waitFor(() => expect(checkedValues()).toEqual(expected));
  } finally {
    await user.keyboard(`{/${key}}`);
  }
}

describe('RadioGroup card variant (SF-23)', () => {
  describe('P1 radio semantics', () => {
    it('renders a radiogroup of three radios, none checked by default', () => {
      render(<Products />);
      expect(screen.getByRole('radiogroup', { name: 'Product type' })).toBeTruthy();
      expect(screen.getAllByRole('radio')).toHaveLength(3);
      expect(checkedValues()).toEqual([]);
    });

    it('reflects defaultValue as the single checked card', () => {
      render(<Products defaultValue="futures" />);
      expect(checkedValues()).toEqual(['futures']);
    });

    it('marks cards with data-variant="card"', () => {
      render(<Products />);
      for (const r of screen.getAllByRole('radio')) {
        expect(r.getAttribute('data-variant')).toBe('card');
      }
    });
  });

  describe('P2 accessible name and description', () => {
    it('names each radio by its title', () => {
      render(<Products />);
      for (const name of ['Spot', 'Futures', 'Options']) {
        expect(screen.getByRole('radio', { name })).toBeTruthy();
      }
    });

    it('describes each radio by its supporting text', () => {
      render(<Products />);
      expect(
        screen.getByRole('radio', { name: 'Spot', description: 'Buy at market price.' })
      ).toBeTruthy();
      expect(
        screen.getByRole('radio', { name: 'Futures', description: 'Settles later.' })
      ).toBeTruthy();
    });

    it('does not fold the description into the name', () => {
      render(<Products />);
      expect(screen.queryByRole('radio', { name: /Buy at market price/ })).toBeNull();
    });

    it('boundary: title only → no aria-describedby; description only → no aria-labelledby', () => {
      render(
        <RadioGroup variant="card" aria-label="g">
          <RadioGroupItem value="a" title="Only title" />
          <RadioGroupItem value="b" description="Only description" aria-label="B" />
        </RadioGroup>
      );
      const a = screen.getByRole('radio', { name: 'Only title' });
      expect(a.hasAttribute('aria-describedby')).toBe(false);
      const b = screen.getByRole('radio', { name: 'B' });
      expect(b.hasAttribute('aria-labelledby')).toBe(false);
      expect(b.getAttribute('aria-describedby')).toBeTruthy();
    });

    it('gives distinct ids across items and across groups', () => {
      render(
        <>
          <Products />
          <Products />
        </>
      );
      const ids = screen
        .getAllByRole('radio')
        .map((r) => r.getAttribute('aria-labelledby'))
        .filter(Boolean);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('renders extra children inside the card', () => {
      render(
        <RadioGroup variant="card" aria-label="g">
          <RadioGroupItem value="a" title="A">
            <span data-testid="extra">badge</span>
          </RadioGroupItem>
        </RadioGroup>
      );
      expect(screen.getByRole('radio', { name: 'A' }).contains(screen.getByTestId('extra'))).toBe(
        true
      );
    });
  });

  describe('P3 selection by pointer and keyboard', () => {
    it('clicking the card body selects it and fires onValueChange once', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Products onValueChange={onValueChange} />);
      await user.click(screen.getByText('Buy at market price.'));
      expect(checkedValues()).toEqual(['spot']);
      expect(onValueChange.mock.calls).toEqual([['spot']]);
    });

    it('clicking the title text selects that card, only one checked at a time', async () => {
      const user = userEvent.setup();
      render(<Products />);
      await user.click(screen.getByText('Spot'));
      await user.click(screen.getByText('Futures'));
      expect(checkedValues()).toEqual(['futures']);
    });

    it('arrow keys move selection through enabled cards', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Products onValueChange={onValueChange} defaultValue="spot" />);
      screen.getByRole('radio', { name: 'Spot' }).focus();
      await arrow(user, 'ArrowDown', ['futures']);
      await arrow(user, 'ArrowUp', ['spot']);
      expect(onValueChange.mock.calls).toEqual([['futures'], ['spot']]);
    });

    it('Tab lands on the checked card only (roving tabindex)', async () => {
      const user = userEvent.setup();
      render(<Products defaultValue="futures" />);
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Futures' }));
    });

    it('controlled: selection follows the value prop; click still reports', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Products value="spot" onValueChange={onValueChange} />);
      await user.click(screen.getByText('Futures'));
      expect(onValueChange.mock.calls).toEqual([['futures']]);
      expect(checkedValues()).toEqual(['spot']);
    });

    it('clicking the already-checked card does not fire onValueChange', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Products defaultValue="spot" onValueChange={onValueChange} />);
      await user.click(screen.getByText('Spot'));
      expect(onValueChange).not.toHaveBeenCalled();
    });
  });

  describe('P4 disabled card', () => {
    it('is reported disabled', () => {
      render(<Products />);
      expect(screen.getByRole('radio', { name: 'Options' }).hasAttribute('disabled')).toBe(true);
    });

    it('click is inert: no selection change, no callback', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(<Products defaultValue="spot" onValueChange={onValueChange} />);
      await user.click(screen.getByText('Not in your region.'));
      expect(checkedValues()).toEqual(['spot']);
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('arrow navigation skips it (wraps from last enabled to first)', async () => {
      const user = userEvent.setup();
      render(<Products defaultValue="futures" />);
      screen.getByRole('radio', { name: 'Futures' }).focus();
      await arrow(user, 'ArrowDown', ['spot']);
      expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Spot' }));
    });

    it('disabled + checked keeps its checked state', () => {
      render(<Products defaultValue="options" />);
      expect(checkedValues()).toEqual(['options']);
    });
  });

  describe('P5 default variant and element contract', () => {
    it('default variant is unchanged: no data-variant, no card text, no title wiring', () => {
      render(
        <RadioGroup aria-label="plain">
          <RadioGroupItem value="a" aria-label="A" title="ignored" description="ignored too" />
        </RadioGroup>
      );
      const a = screen.getByRole('radio', { name: 'A' });
      expect(a.hasAttribute('data-variant')).toBe(false);
      expect(a.hasAttribute('aria-describedby')).toBe(false);
      expect(screen.queryByText('ignored')).toBeNull();
      // A string title stays the native tooltip, as it was before the card variant existed.
      expect(a.getAttribute('title')).toBe('ignored');
    });

    it('default variant: a non-string title sets no title attribute', () => {
      render(
        <RadioGroup aria-label="plain">
          <RadioGroupItem value="a" aria-label="A" title={<b>rich</b>} />
        </RadioGroup>
      );
      const a = screen.getByRole('radio', { name: 'A' });
      expect(a.hasAttribute('title')).toBe(false);
      expect(screen.queryByText('rich')).toBeNull();
    });

    it('explicit variant="default" behaves like omitting it', () => {
      render(
        <RadioGroup variant="default" aria-label="plain">
          <RadioGroupItem value="a" aria-label="A" />
        </RadioGroup>
      );
      expect(screen.getByRole('radio', { name: 'A' }).hasAttribute('data-variant')).toBe(false);
    });

    it('default variant still selects by click and arrows', async () => {
      const user = userEvent.setup();
      render(
        <RadioGroup aria-label="plain">
          <RadioGroupItem value="a" aria-label="A" />
          <RadioGroupItem value="b" aria-label="B" />
        </RadioGroup>
      );
      await user.click(screen.getByRole('radio', { name: 'A' }));
      await arrow(user, 'ArrowDown', ['b']);
    });

    it('forwards ref to the item button and merges className', () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(
        <RadioGroup variant="card" aria-label="g">
          <RadioGroupItem ref={ref} value="a" title="A" className="custom-x" />
        </RadioGroup>
      );
      expect(ref.current).toBe(screen.getByRole('radio', { name: 'A' }));
      expect(ref.current?.classList.contains('custom-x')).toBe(true);
    });

    it('caller-supplied aria-label wins over a missing title (custom card content)', () => {
      render(
        <RadioGroup variant="card" aria-label="g">
          <RadioGroupItem value="a" aria-label="Custom">
            body
          </RadioGroupItem>
        </RadioGroup>
      );
      expect(screen.getByRole('radio', { name: 'Custom' })).toBeTruthy();
    });

    it('checked look keys off data-state on tokens', async () => {
      const user = userEvent.setup();
      render(<Products />);
      const spot = screen.getByRole('radio', { name: 'Spot' });
      expect(spot.className).toContain('data-[state=checked]:border-primary');
      expect(spot.getAttribute('data-state')).toBe('unchecked');
      await user.click(spot);
      expect(spot.getAttribute('data-state')).toBe('checked');
    });
  });
});
