/**
 * @vitest-environment jsdom
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AddressingCapability } from '@openzeppelin/ui-types';

import { AddressListField } from './AddressListField';

const validAddr = 'C' + 'A'.repeat(55);
const validB = 'C' + 'B'.repeat(55);

const mockAddressing: AddressingCapability = {
  isValidAddress: (addr: string) => addr.startsWith('C') && addr.length === 56,
};

const copyProps = {
  placeholder: 'Enter an account address',
  bulkPlaceholder: 'Paste addresses (one per line, or comma-separated)',
  formatHint:
    'Enter one address per line, or separate multiple addresses with commas. Each entry is validated before it is added.',
};

describe('AddressListField', () => {
  it('defaults to single-address entry with AddressField', () => {
    render(<AddressListField value={[]} onChange={vi.fn()} {...copyProps} />);
    expect(screen.getByRole('textbox')).toBeTruthy();
    expect(screen.getByRole('button', { name: /^add$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /bulk paste/i })).toBeTruthy();
    expect(screen.queryByText(copyProps.formatHint)).toBeNull();
  });

  it('adds a single address from the default entry mode', async () => {
    const onChange = vi.fn();
    render(
      <AddressListField value={[]} onChange={onChange} addressing={mockAddressing} {...copyProps} />
    );
    const input = screen.getByRole('textbox');
    await act(async () => {
      fireEvent.change(input, { target: { value: validAddr } });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^add$/i }));
    });
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith([validAddr]);
    });
  });

  it('switches to bulk mode and hides single entry controls', async () => {
    render(<AddressListField value={[]} onChange={vi.fn()} {...copyProps} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /bulk paste/i }));
    });
    expect(screen.getByText(copyProps.formatHint)).toBeTruthy();
    expect(screen.getByRole('button', { name: /add addresses/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /single entry/i })).toBeTruthy();
  });

  it('shows domain helper text in single mode and format guidance in bulk mode', async () => {
    render(
      <AddressListField
        value={[]}
        onChange={vi.fn()}
        {...copyProps}
        helperText="Seed allow-list addresses during post-deploy configuration."
      />
    );
    expect(screen.getByText(/seed allow-list addresses/i)).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /bulk paste/i }));
    });
    expect(screen.queryByText(/seed allow-list addresses/i)).toBeNull();
    expect(screen.getByText(copyProps.formatHint)).toBeTruthy();
  });

  it('renders existing addresses', () => {
    const { container } = render(
      <AddressListField value={[validAddr]} onChange={vi.fn()} {...copyProps} />
    );
    const addressEl = container.querySelector('[class*="font-mono"]');
    expect(addressEl).toBeTruthy();
  });

  it('calls onChange with parsed addresses in bulk mode when Add is clicked', async () => {
    const onChange = vi.fn();
    render(
      <AddressListField value={[]} onChange={onChange} addressing={mockAddressing} {...copyProps} />
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /bulk paste/i }));
    });
    const input = screen.getByRole('textbox');
    await act(async () => {
      fireEvent.change(input, { target: { value: `${validAddr}, ${validB}` } });
    });

    const addBtn = screen.getByRole('button', { name: /add 2 addresses/i });
    await act(async () => {
      fireEvent.click(addBtn);
    });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith([validAddr, validB]);
    });
  });

  it('adds only valid addresses when the bulk paste includes invalid entries', async () => {
    const onChange = vi.fn();
    render(
      <AddressListField value={[]} onChange={onChange} addressing={mockAddressing} {...copyProps} />
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /bulk paste/i }));
    });
    const input = screen.getByRole('textbox');
    await act(async () => {
      fireEvent.change(input, { target: { value: `${validAddr}, not-valid` } });
    });

    const addBtn = screen.getByRole('button', { name: /add 1 address/i });
    await act(async () => {
      fireEvent.click(addBtn);
    });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith([validAddr]);
    });
  });

  it('shows a live preview while typing in bulk mode', async () => {
    render(
      <AddressListField
        value={[validAddr]}
        onChange={vi.fn()}
        addressing={mockAddressing}
        {...copyProps}
      />
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /bulk paste/i }));
    });
    const input = screen.getByRole('textbox');
    await act(async () => {
      fireEvent.change(input, {
        target: { value: `${validAddr}, ${validB}` },
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/1 ready to add/i)).toBeTruthy();
      expect(screen.getByText(/1 already listed/i)).toBeTruthy();
    });
  });

  it('shows live preview instead of post-add feedback while typing a new bulk paste', async () => {
    const onChange = vi.fn();
    render(
      <AddressListField value={[]} onChange={onChange} addressing={mockAddressing} {...copyProps} />
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /bulk paste/i }));
    });
    const input = screen.getByRole('textbox');
    await act(async () => {
      fireEvent.change(input, { target: { value: validAddr } });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /add 1 address/i }));
    });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith([validAddr]);
    });

    await act(async () => {
      fireEvent.change(input, { target: { value: validB } });
    });

    await waitFor(() => {
      expect(screen.getByText(/1 ready to add/i)).toBeTruthy();
      expect(screen.queryByText(/added 1 address/i)).toBeNull();
    });
  });

  it('calls onChange without addresses when the last row is removed', async () => {
    const onChange = vi.fn();
    render(<AddressListField value={[validAddr]} onChange={onChange} {...copyProps} />);
    const removeButtons = screen.getAllByRole('button', { name: /remove address/i });
    await act(async () => {
      removeButtons[0]?.click();
    });
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('accepts addresses without chain validation when addressing is omitted in bulk mode', async () => {
    const onChange = vi.fn();
    render(<AddressListField value={[]} onChange={onChange} {...copyProps} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /bulk paste/i }));
    });
    const input = screen.getByRole('textbox');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'anything-goes' } });
    });

    const addBtn = screen.getByRole('button', { name: /add 1 address/i });
    await act(async () => {
      fireEvent.click(addBtn);
    });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(['anything-goes']);
    });
  });
});
