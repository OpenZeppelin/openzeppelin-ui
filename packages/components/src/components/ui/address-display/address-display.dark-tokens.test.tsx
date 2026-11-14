/**
 * @vitest-environment jsdom
 *
 * Theme-token contract for the AddressDisplay chip: fill and text use muted /
 * foreground tokens (no fixed slate greys). Light still resolves to a readable
 * chip; dark inherits the same classes through the theme.
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AddressDisplay } from './address-display';

const ADDR = `0x${'a'.repeat(40)}`;

describe('AddressDisplay chip theme tokens', () => {
  it('happy: chip fill and address text use theme tokens, not slate', () => {
    const { container } = render(<AddressDisplay address={ADDR} variant="chip" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('bg-muted');
    expect(root.className).toContain('text-foreground');
    expect(root.className).not.toMatch(/slate-/);
  });

  it('boundary: labeled chip still uses theme tokens on the chip shell', () => {
    const { container } = render(<AddressDisplay address={ADDR} variant="chip" label="Alice" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('bg-muted');
    expect(root.className).toContain('text-foreground');
    expect(root.className).not.toMatch(/slate-/);
    expect(container.textContent).toContain('Alice');
  });

  it('failure: inline (non-chip) variant does not get the muted chip fill', () => {
    const { container } = render(<AddressDisplay address={ADDR} variant="inline" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).not.toContain('bg-muted');
    expect(root.className).not.toMatch(/slate-/);
  });
});
