import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import * as pkg from '../../index';
import { LoadingButton } from './loading-button';
import { Spinner } from './spinner';

// SF-9 scenarios: S1 = status+label or decorative per prop; S2 = LoadingButton loading look unchanged.

describe('Spinner (SF-9)', () => {
  describe('S1: accessibility exposure per prop', () => {
    it('exposes a named status when label is set', () => {
      render(<Spinner label="Loading data" />);
      const status = screen.getByRole('status', { name: 'Loading data' });
      // The status carries the label as text content too; the svg inside is hidden.
      expect(status.tagName.toLowerCase()).toBe('span');
      expect(status.textContent).toBe('Loading data');
      expect(status.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('is decorative (aria-hidden, no status) when label is omitted', () => {
      const { container } = render(<Spinner />);
      expect(screen.queryByRole('status')).toBeNull();
      expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('treats an empty label as decorative, not an unnamed status', () => {
      const { container } = render(<Spinner label="" />);
      expect(screen.queryByRole('status')).toBeNull();
      expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('lets a consumer deliberately override aria attributes', () => {
      const { container } = render(<Spinner aria-hidden={false} />);
      expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('false');
    });
  });

  describe('styling API', () => {
    it('defaults to h-4 w-4 animate-spin with no margin', () => {
      const { container } = render(<Spinner />);
      const cls = container.querySelector('svg')?.getAttribute('class') ?? '';
      expect(cls).toContain('h-4');
      expect(cls).toContain('w-4');
      expect(cls).toContain('animate-spin');
      expect(cls).not.toContain('mr-2');
    });

    it('lets className override the size', () => {
      const { container } = render(<Spinner className="h-8 w-8" />);
      const cls = container.querySelector('svg')?.getAttribute('class') ?? '';
      expect(cls).toContain('h-8');
      expect(cls).not.toContain('h-4');
    });

    it('forwards data attributes to the svg', () => {
      render(<Spinner data-testid="s" />);
      expect(screen.getByTestId('s').tagName.toLowerCase()).toBe('svg');
    });
  });

  describe('package entry', () => {
    it('is exported from the main entry and is the same component', () => {
      expect(pkg.Spinner).toBe(Spinner);
    });
  });
});

describe('LoadingButton spinner (SF-9 S2: unchanged look)', () => {
  it("renders the spinner svg with today's classes when loading", () => {
    const { container } = render(<LoadingButton loading>Save</LoadingButton>);
    const svg = container.querySelector('button svg');
    expect(svg).not.toBeNull();
    const classes = (svg?.getAttribute('class') ?? '').split(/\s+/);
    for (const c of ['mr-2', 'h-4', 'w-4', 'animate-spin']) expect(classes).toContain(c);
    expect(svg?.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg?.querySelectorAll('circle, path').length).toBe(2);
  });

  it('adds no extra status to the accessibility tree and keeps the label as name', () => {
    render(<LoadingButton loading>Save</LoadingButton>);
    expect(screen.queryByRole('status')).toBeNull();
    const btn = screen.getByRole('button', { name: 'Save' });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it('renders no spinner when not loading', () => {
    const { container } = render(<LoadingButton>Save</LoadingButton>);
    expect(container.querySelector('svg')).toBeNull();
  });
});
