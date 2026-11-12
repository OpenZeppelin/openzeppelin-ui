import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EmptyState } from './empty-state';

// SF-4 scenarios: S1 = icon off + no description + action; S2 = today's props unchanged.

function iconContainer(container: HTMLElement): Element | null {
  return container.querySelector('.rounded-full');
}

describe('EmptyState (SF-4)', () => {
  describe('S2: icon omitted keeps the default icon (no default change)', () => {
    it("renders the default icon, title and description for today's props", () => {
      const { container } = render(<EmptyState title="Nothing here" description="Add one" />);
      expect(screen.getByRole('heading', { name: 'Nothing here' })).toBeTruthy();
      expect(screen.getByText('Add one')).toBeTruthy();
      expect(iconContainer(container)?.querySelector('svg')).not.toBeNull();
    });

    it('renders a custom icon node in place of the default', () => {
      const { container } = render(
        <EmptyState title="t" icon={<span data-testid="custom-icon" />} />
      );
      expect(screen.getByTestId('custom-icon')).toBeTruthy();
      expect(iconContainer(container)?.querySelector('svg')).toBeNull();
    });

    it('renders no action wrapper when action is omitted', () => {
      const { container } = render(<EmptyState title="t" description="d" />);
      expect(container.querySelectorAll('button')).toHaveLength(0);
      // h3 + p only after the icon container
      expect(container.firstElementChild?.children).toHaveLength(3);
    });
  });

  describe('S1: icon off', () => {
    it.each([
      ['null', null],
      ['false', false],
    ])('icon={%s} removes the icon and its container', (_label, value) => {
      const { container } = render(<EmptyState title="t" icon={value} />);
      expect(iconContainer(container)).toBeNull();
      expect(container.querySelector('svg')).toBeNull();
    });

    it('undefined and null are distinct: undefined shows an icon, null does not', () => {
      const a = render(<EmptyState title="t" icon={undefined} />);
      const b = render(<EmptyState title="t" icon={null} />);
      expect(a.container.querySelector('svg')).not.toBeNull();
      expect(b.container.querySelector('svg')).toBeNull();
    });
  });

  describe('S1: optional description', () => {
    it.each([
      ['omitted', undefined],
      ['empty string', ''],
    ])('renders no paragraph when description is %s', (_label, description) => {
      const { container } = render(<EmptyState title="t" description={description} />);
      expect(container.querySelector('p')).toBeNull();
    });

    it('renders the paragraph for a non-empty description', () => {
      const { container } = render(<EmptyState title="t" description="d" />);
      expect(container.querySelector('p')?.textContent).toBe('d');
    });
  });

  describe('S1: action slot', () => {
    it('renders the action after the text and wires its handler', () => {
      const onRetry = vi.fn();
      const { container } = render(
        <EmptyState
          title="Couldn't load"
          icon={null}
          action={<button onClick={onRetry}>Retry</button>}
        />
      );
      const button = screen.getByRole('button', { name: 'Retry' });
      const heading = screen.getByRole('heading');
      expect(
        heading.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
      fireEvent.click(button);
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(container.querySelector('p')).toBeNull();
      expect(container.querySelector('svg')).toBeNull();
    });

    it('keeps the action keyboard-reachable (focusable, not tabindex=-1, not hidden)', () => {
      render(<EmptyState title="t" action={<button>Retry</button>} />);
      const button = screen.getByRole('button', { name: 'Retry' });
      button.focus();
      expect(document.activeElement).toBe(button);
      expect(button.closest('[aria-hidden="true"], [inert]')).toBeNull();
      expect(button.getAttribute('tabindex')).not.toBe('-1');
    });

    it.each([
      ['small', 'mt-3'],
      ['default', 'mt-4'],
      ['large', 'mt-6'],
    ] as const)('applies the %s size margin to the action wrapper', (size, margin) => {
      render(<EmptyState title="t" size={size} action={<button>Go</button>} />);
      expect(screen.getByRole('button').parentElement?.className).toContain(margin);
    });

    it.each([
      ['null', null],
      ['false', false],
      ['undefined', undefined],
    ])('renders no action wrapper when action is %s', (_label, action) => {
      const { container } = render(<EmptyState title="t" action={action} />);
      expect(container.querySelector('.mt-4')).toBeNull();
    });
  });
});
