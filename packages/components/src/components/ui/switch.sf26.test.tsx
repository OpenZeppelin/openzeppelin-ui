/**
 * @vitest-environment jsdom
 *
 * SF-26 · Switch. No Invariants stage (Low stakes): properties are the spec
 * acceptance scenarios, labelled P1..P5 below.
 *   P1 switch semantics: role=switch, aria-checked, label names it
 *   P2 toggles on click and Space (uncontrolled, controlled, onCheckedChange)
 *   P3 disabled: reported disabled, input ignored, no callback
 *   P4 theme-aware state styling hooks (data-state classes on tokens)
 *   P5 element contract: ref, className merge, attribute passthrough, export
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import React from 'react';

import * as ui from './index';
import { Switch } from './switch';

describe('Switch (SF-26)', () => {
  describe('P1 switch semantics', () => {
    it('exposes role=switch, unchecked by default', () => {
      render(<Switch aria-label="Notifications" />);
      const sw = screen.getByRole('switch', { name: 'Notifications' });
      expect(sw.getAttribute('aria-checked')).toBe('false');
      expect(sw.getAttribute('data-state')).toBe('unchecked');
    });

    it('reports checked when defaultChecked', () => {
      render(<Switch aria-label="Notifications" defaultChecked />);
      expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');
    });

    it('is named by an associated <label htmlFor>', () => {
      render(
        <>
          <label htmlFor="s1">Dark mode</label>
          <Switch id="s1" />
        </>
      );
      expect(screen.getByRole('switch', { name: 'Dark mode' })).toBeTruthy();
    });

    it('failure: without label or aria-label it has no accessible name', () => {
      render(<Switch />);
      expect(screen.queryByRole('switch', { name: /.+/ })).toBeNull();
      expect(screen.getByRole('switch')).toBeTruthy();
    });
  });

  describe('P2 toggling', () => {
    it('toggles on click, both directions, calling onCheckedChange', async () => {
      const user = userEvent.setup();
      const onCheckedChange = vi.fn();
      render(<Switch aria-label="s" onCheckedChange={onCheckedChange} />);
      const sw = screen.getByRole('switch');
      await user.click(sw);
      expect(sw.getAttribute('aria-checked')).toBe('true');
      await user.click(sw);
      expect(sw.getAttribute('aria-checked')).toBe('false');
      expect(onCheckedChange.mock.calls).toEqual([[true], [false]]);
    });

    it('toggles on Space when focused', async () => {
      const user = userEvent.setup();
      const onCheckedChange = vi.fn();
      render(<Switch aria-label="s" onCheckedChange={onCheckedChange} />);
      const sw = screen.getByRole('switch');
      await user.tab();
      expect(document.activeElement).toBe(sw);
      await user.keyboard(' ');
      expect(sw.getAttribute('aria-checked')).toBe('true');
      expect(onCheckedChange).toHaveBeenCalledWith(true);
    });

    it('clicking the associated label toggles it', async () => {
      const user = userEvent.setup();
      render(
        <>
          <label htmlFor="s2">Label</label>
          <Switch id="s2" />
        </>
      );
      await user.click(screen.getByText('Label'));
      expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');
    });

    it('controlled: state follows the prop, not the click', async () => {
      const user = userEvent.setup();
      const onCheckedChange = vi.fn();
      const { rerender } = render(
        <Switch aria-label="s" checked={false} onCheckedChange={onCheckedChange} />
      );
      const sw = screen.getByRole('switch');
      await user.click(sw);
      expect(onCheckedChange).toHaveBeenCalledWith(true);
      expect(sw.getAttribute('aria-checked')).toBe('false');
      rerender(<Switch aria-label="s" checked onCheckedChange={onCheckedChange} />);
      expect(sw.getAttribute('aria-checked')).toBe('true');
    });
  });

  describe('P3 disabled', () => {
    it('is reported disabled', () => {
      render(<Switch aria-label="s" disabled />);
      expect((screen.getByRole('switch') as HTMLButtonElement).disabled).toBe(true);
    });

    it('click does nothing and fires no callback', async () => {
      const user = userEvent.setup();
      const onCheckedChange = vi.fn();
      render(<Switch aria-label="s" disabled onCheckedChange={onCheckedChange} />);
      const sw = screen.getByRole('switch');
      await user.click(sw);
      expect(sw.getAttribute('aria-checked')).toBe('false');
      expect(onCheckedChange).not.toHaveBeenCalled();
    });

    it('Space does nothing and it is not tabbable', async () => {
      const user = userEvent.setup();
      const onCheckedChange = vi.fn();
      render(<Switch aria-label="s" disabled onCheckedChange={onCheckedChange} />);
      const sw = screen.getByRole('switch');
      await user.tab();
      expect(document.activeElement).not.toBe(sw);
      sw.focus();
      await user.keyboard(' ');
      expect(sw.getAttribute('aria-checked')).toBe('false');
      expect(onCheckedChange).not.toHaveBeenCalled();
    });

    it('disabled + checked keeps its checked state', () => {
      render(<Switch aria-label="s" disabled defaultChecked />);
      const sw = screen.getByRole('switch');
      expect(sw.getAttribute('aria-checked')).toBe('true');
      expect((sw as HTMLButtonElement).disabled).toBe(true);
    });
  });

  describe('P4 theme-aware styling hooks', () => {
    it('uses theme tokens keyed on data-state, never raw colours', () => {
      render(<Switch aria-label="s" />);
      const cls = screen.getByRole('switch').className;
      expect(cls).toContain('data-[state=checked]:bg-selected');
      expect(cls).toContain('data-[state=unchecked]:bg-input');
      expect(cls).toContain('disabled:opacity-50');
      expect(cls).not.toMatch(/\b(?:bg|text|border)-(?:white|black|\w+-\d{2,3})\b/);
    });

    it('thumb is a presentational child that tracks state', async () => {
      const user = userEvent.setup();
      render(<Switch aria-label="s" />);
      const sw = screen.getByRole('switch');
      const thumb = sw.querySelector('[data-slot="switch-thumb"]');
      expect(thumb).not.toBeNull();
      expect(thumb?.getAttribute('data-state')).toBe('unchecked');
      await user.click(sw);
      expect(thumb?.getAttribute('data-state')).toBe('checked');
    });
  });

  describe('P5 element contract', () => {
    it('is exported from the ui barrel', () => {
      expect(ui.Switch).toBe(Switch);
    });

    it('forwards ref to the button element', () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(<Switch aria-label="s" ref={ref} />);
      expect(ref.current).toBe(screen.getByRole('switch'));
    });

    it('merges className and passes through attributes', () => {
      render(<Switch aria-label="s" className="custom-x" data-testid="sw" name="n" />);
      const sw = screen.getByTestId('sw');
      expect(sw.className).toContain('custom-x');
      expect(sw.className).toContain('rounded-full');
      expect(sw.getAttribute('data-slot')).toBe('switch');
    });

    it('inside a form, submits its value only when checked', async () => {
      // Radix mounts a hidden form input that measures itself; jsdom has no ResizeObserver.
      vi.stubGlobal(
        'ResizeObserver',
        class {
          observe(): void {}
          unobserve(): void {}
          disconnect(): void {}
        }
      );
      const user = userEvent.setup();
      const { container } = render(
        <form>
          <Switch aria-label="s" name="flag" value="yes" />
        </form>
      );
      const form = container.querySelector('form') as HTMLFormElement;
      expect(new FormData(form).get('flag')).toBeNull();
      await user.click(screen.getByRole('switch'));
      expect(new FormData(form).get('flag')).toBe('yes');
      vi.unstubAllGlobals();
    });
  });
});
