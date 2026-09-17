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
});
