import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createRef } from 'react';

import { Badge, type BadgeProps, type BadgeTone, type BadgeVariant } from './badge';

const solidToneClasses: Record<BadgeTone, readonly [string, string]> = {
  neutral: ['bg-foreground', 'text-background'],
  info: ['bg-info', 'text-info-foreground'],
  success: ['bg-success', 'text-success-foreground'],
  warning: ['bg-warning', 'text-warning-foreground'],
  danger: ['bg-destructive', 'text-destructive-foreground'],
};

const filledTintClasses: Partial<Record<BadgeTone, string>> = {
  info: 'bg-info/15',
  success: 'bg-success/15',
  warning: 'bg-warning/20',
  danger: 'bg-destructive/10',
};

const tones = ['neutral', 'info', 'success', 'warning', 'danger'] satisfies BadgeTone[];

function classTokens(element: Element): string[] {
  return element.className.split(/\s+/);
}

describe('SF-14 Badge render contract', () => {
  it.each(tones)('INV-370/371: solid %s uses its opaque semantic token pair', (tone) => {
    render(<Badge label={`${tone} status`} variant="solid" tone={tone} />);

    const badge = screen.getByText(`${tone} status`);
    const tokens = classTokens(badge);
    expect(tokens, `solid ${tone} must use the complete foreground/background pair`).toEqual(
      expect.arrayContaining(solidToneClasses[tone])
    );
    if (filledTintClasses[tone]) {
      expect(tokens, `solid ${tone} must not reuse the filled tint`).not.toContain(
        filledTintClasses[tone]
      );
    }
  });

  it.each(['filled', 'outline', 'solid'] satisfies BadgeVariant[])(
    'INV-372: %s labels never wrap and preserve shared density',
    (variant) => {
      render(<Badge label={`${variant} label`} variant={variant} />);

      expect(classTokens(screen.getByText(`${variant} label`))).toEqual(
        expect.arrayContaining([
          'inline-flex',
          'rounded-full',
          'px-2',
          'py-0.5',
          'text-xs',
          'whitespace-nowrap',
        ])
      );
    }
  );

  it('INV-373/377/385: onActivate renders a non-submitting button with focus chrome', () => {
    render(<Badge label="Open role" variant="outline" onActivate={() => undefined} />);

    const badge = screen.getByRole('button', { name: 'Open role' });
    expect(badge.getAttribute('type')).toBe('button');
    expect(classTokens(badge)).toEqual(
      expect.arrayContaining([
        'cursor-pointer',
        'focus-visible:ring-2',
        'focus-visible:ring-ring',
        'hover:bg-accent/50',
      ])
    );
  });

  it('INV-377: solid buttons preserve their semantic fill on hover', () => {
    render(<Badge label="Retry" variant="solid" tone="danger" onActivate={() => undefined} />);

    const tokens = classTokens(screen.getByRole('button', { name: 'Retry' }));
    expect(tokens).toContain('hover:brightness-95');
    expect(tokens).not.toContain('hover:bg-accent/50');
  });
});

describe('SF-14 Badge prop and host contracts', () => {
  it('INV-374/384/395: a Slot-style click alone remains a non-focusable span', () => {
    const slotClick = vi.fn();
    const slotProps = { onClick: slotClick, 'data-overlay-trigger': 'true' };
    render(<Badge {...slotProps} label="Tooltip only" />);

    const badge = screen.getByText('Tooltip only');
    expect(badge.tagName).toBe('SPAN');
    expect(badge.getAttribute('role')).toBeNull();
    expect(badge.getAttribute('tabindex')).toBeNull();
    expect(badge.getAttribute('data-overlay-trigger')).toBe('true');

    fireEvent.click(badge);
    fireEvent.keyDown(badge, { key: 'Enter' });
    fireEvent.keyDown(badge, { key: ' ' });
    expect(slotClick).toHaveBeenCalledTimes(1);
  });

  it('INV-383/384: forwards span refs and extra host attributes', () => {
    const ref = createRef<HTMLSpanElement | HTMLButtonElement>();
    render(<Badge ref={ref} label="Static" id="static-badge" title="Status" />);

    expect(ref.current).toBe(screen.getByText('Static'));
    expect(ref.current?.tagName).toBe('SPAN');
    expect(ref.current?.id).toBe('static-badge');
    expect(ref.current?.title).toBe('Status');
    expect(Badge.displayName).toBe('Badge');
  });

  it('INV-383/385: forwards button refs and rejects an injected submit type', () => {
    const ref = createRef<HTMLSpanElement | HTMLButtonElement>();
    const injectedProps = { type: 'submit' };
    render(<Badge {...injectedProps} ref={ref} label="Interactive" onActivate={() => undefined} />);

    expect(ref.current).toBe(screen.getByRole('button', { name: 'Interactive' }));
    expect(ref.current?.tagName).toBe('BUTTON');
    expect(ref.current?.getAttribute('type')).toBe('button');
  });

  it('INV-382: invalid untyped appearance values fail closed without throwing', () => {
    const invalidVariant = 'gradient' as BadgeVariant;
    const invalidTone = 'brand' as BadgeTone;

    expect(() =>
      render(<Badge label="Fallback" variant={invalidVariant} tone={invalidTone} />)
    ).not.toThrow();
    const tokens = classTokens(screen.getByText('Fallback'));
    expect(tokens).toEqual(expect.arrayContaining(['bg-muted', 'text-muted-foreground']));
  });

  it('INV-393: host kind tracks onActivate on every render', () => {
    const { rerender } = render(<Badge label="Mutable" />);
    expect(screen.getByText('Mutable').tagName).toBe('SPAN');

    rerender(<Badge label="Mutable" onActivate={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Mutable' }).tagName).toBe('BUTTON');

    rerender(<Badge label="Mutable" />);
    expect(screen.getByText('Mutable').tagName).toBe('SPAN');
  });

  it('INV-379: excludes onClick from the typed public activation surface', () => {
    const onClick = () => undefined;
    const invalidProps: BadgeProps = {
      label: 'Invalid typed activation',
      // @ts-expect-error INV-379: consumers must use onActivate.
      onClick,
    };

    expect(invalidProps.label).toBe('Invalid typed activation');
  });
});

describe('SF-14 Badge interaction contract', () => {
  it('INV-394/398: Slot click runs before onActivate with the same event', () => {
    const calls: Array<{ name: string; event: React.MouseEvent<HTMLElement> }> = [];
    const slotProps = {
      onClick: (event: React.MouseEvent<HTMLElement>) => calls.push({ name: 'slot', event }),
    };
    render(
      <Badge
        {...slotProps}
        label="Composed"
        onActivate={(event) => calls.push({ name: 'activate', event })}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Composed' }));

    expect(calls.map(({ name }) => name)).toEqual(['slot', 'activate']);
    expect(calls[0]?.event).toBe(calls[1]?.event);
  });
});

describe('SF-14 Badge icon accessibility contract', () => {
  it('INV-375/380/406: a named icon stays graphically hidden and gains sr-only text', () => {
    const { container } = render(
      <Badge label="Admin" icon={<svg data-testid="role-icon" />} iconLabel="Owner role" />
    );

    const graphic = container.querySelector('[aria-hidden="true"]');
    const iconName = screen.getByText('Owner role');
    expect(graphic?.contains(screen.getByTestId('role-icon'))).toBe(true);
    expect(graphic?.getAttribute('aria-hidden')).toBe('true');
    expect(iconName.className).toContain('sr-only');
    expect(graphic?.nextSibling).toBe(iconName);
    expect(iconName.nextSibling?.textContent).toBe('Admin');
  });

  it.each([undefined, ''])(
    'INV-375/380: iconLabel=%s preserves the decorative icon default',
    (iconLabel) => {
      const { container } = render(
        <Badge label="Admin" icon={<svg data-testid="role-icon" />} iconLabel={iconLabel} />
      );

      expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
      expect(container.querySelector('.sr-only')).toBeNull();
    }
  );

  it('INV-381: iconLabel without an icon is a no-op', () => {
    const { container } = render(<Badge label="Admin" iconLabel="Owner role" />);
    const badge = screen.getByText('Admin');

    expect(badge.childNodes).toHaveLength(1);
    expect(container.querySelector('.sr-only')).toBeNull();
    expect(classTokens(badge)).not.toContain('gap-1');
  });

  it('INV-407: host aria-label overrides content while preserving visible text', () => {
    render(
      <Badge
        label="You"
        icon={<svg />}
        iconLabel="Current user marker"
        aria-label="This is your account"
      />
    );

    const badge = screen.getByLabelText('This is your account');
    expect(badge.textContent).toContain('Current user marker');
    expect(badge.textContent).toContain('You');
  });
});
