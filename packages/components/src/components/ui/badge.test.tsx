import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Badge, type BadgeTone, type BadgeVariant } from './badge';

const expectedToneClass: Record<BadgeVariant, Record<BadgeTone, string>> = {
  filled: {
    neutral: 'bg-muted',
    info: 'bg-info/15',
    success: 'bg-success/15',
    warning: 'bg-warning/20',
    danger: 'bg-destructive/10',
  },
  outline: {
    neutral: 'border-border',
    info: 'border-info/50',
    success: 'border-success/50',
    warning: 'border-warning/60',
    danger: 'border-destructive/50',
  },
};

const variants = ['filled', 'outline'] satisfies BadgeVariant[];
const tones = ['neutral', 'info', 'success', 'warning', 'danger'] satisfies BadgeTone[];

describe('Badge', () => {
  it.each(variants)('renders every %s tone', (variant) => {
    for (const tone of tones) {
      const label = `${variant}-${tone}`;
      render(<Badge label={label} variant={variant} tone={tone} />);

      const badge = screen.getByText(label);
      expect(badge.className).toContain(expectedToneClass[variant][tone]);
      expect(badge.className.includes('border')).toBe(variant === 'outline');
    }
  });

  it('uses a neutral filled style by default', () => {
    render(<Badge label="Queued" />);

    const badge = screen.getByText('Queued');
    expect(badge.className).toContain('bg-muted');
    expect(badge.className).toContain('text-muted-foreground');
  });

  it('keeps the visible label as content and accepts an accessible-name override', () => {
    render(<Badge label="P1" aria-label="Priority one: immediate action" />);

    const badge = screen.getByLabelText('Priority one: immediate action');
    expect(badge.textContent).toBe('P1');
    expect(badge.getAttribute('role')).toBeNull();
  });

  it('composes consumer classes', () => {
    render(<Badge label="Compact status" className="uppercase" />);

    expect(screen.getByText('Compact status').className).toContain('uppercase');
  });

  it('leaves a badge without an icon as a single text child', () => {
    const { container } = render(<Badge label="Queued" />);
    const badge = container.firstElementChild;

    expect(badge?.childNodes).toHaveLength(1);
    expect(badge?.childNodes[0]?.nodeType).toBe(Node.TEXT_NODE);
    expect(badge?.textContent).toBe('Queued');
    expect(badge?.className.includes('gap-1')).toBe(false);
    expect(badge?.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('renders a decorative icon before the label without changing the accessible name', () => {
    const { container } = render(<Badge label="Completed" icon={<span>Check</span>} />);
    const badge = container.firstElementChild as HTMLElement;
    const icon = badge.querySelector('[aria-hidden="true"]');

    expect(icon?.textContent).toBe('Check');
    expect(icon?.nextSibling?.textContent).toBe('Completed');
    expect(badge.className).toContain('gap-1');
    expect(screen.queryByText('CheckCompleted')).toBeNull();
    expect(screen.getByText('Completed')).toBeDefined();
    expect(badge.getAttribute('aria-label')).toBeNull();
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
  });
});
