import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';

import { Badge, type BadgeTone, type BadgeVariant } from './badge';

const variants = ['filled', 'outline', 'solid'] satisfies BadgeVariant[];
const tones = ['neutral', 'info', 'success', 'warning', 'danger'] satisfies BadgeTone[];

function tokens(element: Element): string[] {
  return element.className.split(/\s+/);
}

function Chip(): React.ReactElement {
  const [on, setOn] = useState(false);
  return <Badge label="Open" pressed={on} onActivate={() => setOn((value) => !value)} />;
}

describe('SF-8 SC-1 pressed on the interactive badge', () => {
  it('happy: pressed=true exposes aria-pressed="true"', () => {
    render(<Badge label="Open" pressed onActivate={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Open' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('happy: toggled by consumer state, aria-pressed follows on click', () => {
    render(<Chip />);
    const chip = screen.getByRole('button', { name: 'Open' });
    expect(chip.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(chip);
    expect(chip.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(chip);
    expect(chip.getAttribute('aria-pressed')).toBe('false');
  });

  it('boundary: pressed=false renders aria-pressed="false", not an absent attribute', () => {
    render(<Badge label="Open" pressed={false} onActivate={() => undefined} />);
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('false');
  });

  it('boundary: pressed omitted leaves no aria-pressed', () => {
    render(<Badge label="Open" onActivate={() => undefined} />);
    expect(screen.getByRole('button').hasAttribute('aria-pressed')).toBe(false);
  });

  it('boundary: pressed=undefined behaves like omitted', () => {
    render(<Badge label="Open" pressed={undefined} onActivate={() => undefined} />);
    expect(screen.getByRole('button').hasAttribute('aria-pressed')).toBe(false);
  });

  it('regression: consumer aria-pressed passes through when pressed is omitted', () => {
    render(<Badge label="Open" aria-pressed="mixed" onActivate={() => undefined} />);
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('mixed');
  });

  it('interaction: pressed does not swallow activation', () => {
    const onActivate = vi.fn();
    render(<Badge label="Open" pressed onActivate={onActivate} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('interaction: the button stays a native button, so Space and Enter activate it', () => {
    render(<Badge label="Open" pressed={false} onActivate={() => undefined} />);
    const chip = screen.getByRole('button');
    expect(chip.tagName).toBe('BUTTON');
    expect(chip.getAttribute('type')).toBe('button');
  });

  it.each(variants)('%s: pressed look differs from unpressed', (variant) => {
    const { rerender } = render(
      <Badge label="Open" variant={variant} pressed={false} onActivate={() => undefined} />
    );
    const unpressed = screen.getByRole('button').className;
    rerender(<Badge label="Open" variant={variant} pressed onActivate={() => undefined} />);
    expect(screen.getByRole('button').className).not.toBe(unpressed);
  });

  it.each(['filled', 'outline'] satisfies BadgeVariant[])(
    '%s: pressed uses the primary selected tokens and drops the tone tint',
    (variant) => {
      render(<Badge label="Open" variant={variant} pressed onActivate={() => undefined} />);
      const classes = tokens(screen.getByRole('button'));
      expect(classes).toEqual(
        expect.arrayContaining(['bg-primary', 'text-primary-foreground', 'border-primary'])
      );
      expect(classes).not.toContain('bg-muted');
      expect(classes).not.toContain('text-muted-foreground');
    }
  );

  it('solid: pressed adds an inset foreground ring and keeps the strong fill', () => {
    render(<Badge label="Open" variant="solid" pressed onActivate={() => undefined} />);
    const classes = tokens(screen.getByRole('button'));
    expect(classes).toEqual(
      expect.arrayContaining(['inset-ring-2', 'inset-ring-foreground', 'bg-foreground'])
    );
    // The outer ring utilities stay for focus only, so pressed never looks like focus.
    expect(classes.filter((c) => /^ring-(\d|foreground|inset)/.test(c))).toEqual([]);
    expect(classes).toEqual(
      expect.arrayContaining(['focus-visible:ring-2', 'focus-visible:ring-offset-2'])
    );
  });

  it.each(tones)('%s: pressed look overrides every tone in filled', (tone) => {
    render(
      <Badge label="Open" variant="filled" tone={tone} pressed onActivate={() => undefined} />
    );
    const classes = tokens(screen.getByRole('button'));
    expect(classes).toContain('bg-primary');
    expect(classes).toContain('text-primary-foreground');
  });

  it('boundary: unpressed look is unchanged (no primary or foreground ring tokens)', () => {
    render(<Badge label="Open" variant="outline" pressed={false} onActivate={() => undefined} />);
    const classes = tokens(screen.getByRole('button'));
    expect(classes).not.toContain('bg-primary');
    expect(classes).not.toContain('ring-foreground');
    expect(classes).not.toContain('inset-ring-foreground');
  });

  it('boundary: consumer className still applies on a pressed badge', () => {
    render(<Badge label="Open" pressed className="custom-x" onActivate={() => undefined} />);
    expect(tokens(screen.getByRole('button'))).toContain('custom-x');
  });
});

describe('SF-8 SC-2 non-interactive badge ignores pressed', () => {
  it.each([true, false])('failure: pressed=%s on a span emits no aria-pressed', (pressed) => {
    render(<Badge label="Status" pressed={pressed} />);
    const host = screen.getByText('Status');
    expect(host.tagName).toBe('SPAN');
    expect(host.hasAttribute('aria-pressed')).toBe(false);
  });

  it('failure: pressed=true on a span applies no selected style', () => {
    render(<Badge label="Status" variant="outline" pressed />);
    const classes = tokens(screen.getByText('Status'));
    expect(classes).not.toContain('bg-primary');
    expect(classes).not.toContain('ring-foreground');
    expect(classes).not.toContain('inset-ring-foreground');
  });

  it('boundary: span with pressed renders the same class list as without', () => {
    const { rerender } = render(<Badge label="Status" tone="info" />);
    const baseline = screen.getByText('Status').className;
    rerender(<Badge label="Status" tone="info" pressed />);
    expect(screen.getByText('Status').className).toBe(baseline);
  });

  it('boundary: pressed does not leak onto the span as an unknown DOM attribute', () => {
    render(<Badge label="Status" pressed />);
    expect(screen.getByText('Status').hasAttribute('pressed')).toBe(false);
  });

  it('boundary: pressed never leaks onto the button as a raw attribute either', () => {
    render(<Badge label="Open" pressed onActivate={() => undefined} />);
    expect(screen.getByRole('button').hasAttribute('pressed')).toBe(false);
  });

  it('transition: adding onActivate later turns the span into a pressed button', () => {
    const { rerender } = render(<Badge label="Open" pressed />);
    expect(screen.queryByRole('button')).toBeNull();
    rerender(<Badge label="Open" pressed onActivate={() => undefined} />);
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('true');
  });
});
