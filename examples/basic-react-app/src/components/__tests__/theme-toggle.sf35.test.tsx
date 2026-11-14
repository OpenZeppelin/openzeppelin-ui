/**
 * SF-35 · Theme toggle — scenario 1 (toggle, accessible name and state; keyboard activation is covered in the browser spec) and scenario 2
 * (persistence through the provider's storage key), against the real `next-themes` provider.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'next-themes';
import { beforeEach, describe, expect, it } from 'vitest';

import { ThemeToggle } from '../ThemeToggle';

function renderToggle(): void {
  render(
    <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
      <ThemeToggle />
    </ThemeProvider>
  );
}

const toggle = (): HTMLElement => screen.getByRole('button', { name: 'Dark mode' });
const isDarkRoot = (): boolean => document.documentElement.classList.contains('dark');

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = '';
});

describe('SF-35 scenario 1: toggle, accessible name and state', () => {
  it('starts in light: root has no dark class and the control is not pressed', () => {
    renderToggle();
    expect(isDarkRoot()).toBe(false);
    expect(toggle().getAttribute('aria-pressed')).toBe('false');
    expect(toggle().getAttribute('data-testid')).toBe('theme-toggle');
  });

  it('click switches to dark and back, name stays stable, pressed state follows', () => {
    renderToggle();
    fireEvent.click(toggle());
    expect(isDarkRoot(), 'dark class applied at the root').toBe(true);
    expect(toggle().getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(toggle());
    expect(isDarkRoot(), 'second activation returns to light').toBe(false);
    expect(toggle().getAttribute('aria-pressed')).toBe('false');
  });

  it('the icon is decorative: the accessible name is only "Dark mode"', () => {
    renderToggle();
    expect(toggle().querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('SF-35 scenario 2: persistence', () => {
  it('writes the chosen theme to the provider storage key', () => {
    renderToggle();
    fireEvent.click(toggle());
    expect(localStorage.getItem('theme')).toBe('dark');
    fireEvent.click(toggle());
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('restores a stored dark theme on a fresh mount (pressed state included)', async () => {
    localStorage.setItem('theme', 'dark');
    renderToggle();
    expect(isDarkRoot()).toBe(true);
    expect(await screen.findByRole('button', { name: 'Dark mode', pressed: true })).toBeTruthy();
  });

  it('a stored value of "light" stays light (boundary: explicit light, not default)', () => {
    localStorage.setItem('theme', 'light');
    renderToggle();
    expect(isDarkRoot()).toBe(false);
    expect(toggle().getAttribute('aria-pressed')).toBe('false');
  });
});
