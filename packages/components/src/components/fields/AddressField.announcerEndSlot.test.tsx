/**
 * @vitest-environment jsdom
 *
 * `announcerEndSlot` — resolution announcer row layout for AddressListField.
 */
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { useForm } from 'react-hook-form';

import { controlledResolver, renderAddressField } from './name-resolution/__tests__/helpers';
import { NameResolverProvider } from './name-resolution/name-resolver-context';

import { AddressField } from './AddressField';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('AddressField announcerEndSlot', () => {
  it('renders the end slot pinned under the input with right inset when resolver is null', () => {
    function Field(): React.ReactElement {
      const { control } = useForm({ defaultValues: { draft: '' }, mode: 'onChange' });
      return (
        <AddressField
          id="allow-list-entry"
          name="draft"
          label=""
          control={control}
          announcerEndSlot={
            <button type="button" data-testid="mode-toggle">
              Bulk paste
            </button>
          }
        />
      );
    }

    render(<Field />);

    const toggle = screen.getByTestId('mode-toggle');
    expect(toggle).toBeTruthy();
    expect(toggle.parentElement?.parentElement?.className).toContain('justify-between');
    expect(toggle.parentElement?.parentElement?.className).toContain('pr-2.5');

    const region = document.getElementById('allow-list-entry-resolution');
    expect(region).not.toBeNull();
    expect(region?.className).toContain('mt-4');
    expect(region?.className).toContain('flex-1');
    expect(region?.textContent).toBe('');
    expect(region?.parentElement?.contains(toggle)).toBe(true);
    expect(region).not.toBe(toggle.parentElement);
  });

  it('keeps min-h-5 on the standalone announcer when no end slot is provided', async () => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName } });
    expect(h.region()?.className).toContain('min-h-5');
  });

  it('joins the announcer region id into aria-describedby when an end slot is present', () => {
    function Field(): React.ReactElement {
      const { control } = useForm({ defaultValues: { draft: '' }, mode: 'onChange' });
      return (
        <NameResolverProvider resolveName={vi.fn()}>
          <AddressField
            id="allow-list-entry"
            name="draft"
            label=""
            control={control}
            announcerEndSlot={<span data-testid="mode-toggle">Bulk paste</span>}
          />
        </NameResolverProvider>
      );
    }

    render(<Field />);

    const input = screen.getByRole('textbox');
    const describedBy = input.getAttribute('aria-describedby') ?? '';
    expect(describedBy.split(/\s+/)).toContain('allow-list-entry-resolution');
  });

  it('keeps the end slot outside the announcer live region so it does not shift vertically', () => {
    const r = controlledResolver();
    function Field(): React.ReactElement {
      const { control } = useForm({ defaultValues: { draft: '' }, mode: 'onChange' });
      return (
        <NameResolverProvider resolveName={r.resolveName}>
          <AddressField
            id="allow-list-entry"
            name="draft"
            label=""
            control={control}
            announcerEndSlot={<button type="button">Bulk paste</button>}
          />
        </NameResolverProvider>
      );
    }

    render(<Field />);

    const toggle = screen.getByRole('button', { name: /bulk paste/i });
    const region = document.getElementById('allow-list-entry-resolution');
    expect(region?.contains(toggle)).toBe(false);
    expect(region?.className).toContain('mt-4');
  });
});
