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
  placeholder: 'Account address (one per line, or comma-separated)',
  formatHint:
    'Enter one address per line, or separate multiple addresses with commas. Each entry is validated before it is added.',
};

describe('AddressListField', () => {
  it('shows format guidance from props', () => {
    render(<AddressListField value={[]} onChange={vi.fn()} {...copyProps} />);
    expect(screen.getByText(copyProps.formatHint)).toBeTruthy();
  });

  it('shows format guidance alongside optional domain helper text', () => {
    render(
      <AddressListField
        value={[]}
        onChange={vi.fn()}
        {...copyProps}
        helperText="Seed allow-list addresses during post-deploy configuration."
      />
    );
    expect(screen.getByText(/seed allow-list addresses/i)).toBeTruthy();
    expect(screen.getByText(copyProps.formatHint)).toBeTruthy();
  });

  it('renders existing addresses', () => {
    const { container } = render(
      <AddressListField value={[validAddr]} onChange={vi.fn()} {...copyProps} />
    );
    const addressEl = container.querySelector('[class*="font-mono"]');
    expect(addressEl).toBeTruthy();
  });

  it('calls onChange with parsed addresses when Add is clicked', async () => {
    const onChange = vi.fn();
    render(
      <AddressListField value={[]} onChange={onChange} addressing={mockAddressing} {...copyProps} />
    );
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

  it('adds only valid addresses when the paste includes invalid entries', async () => {
    const onChange = vi.fn();
    render(
      <AddressListField value={[]} onChange={onChange} addressing={mockAddressing} {...copyProps} />
    );
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

  it('shows a live preview while typing', async () => {
    render(
      <AddressListField
        value={[validAddr]}
        onChange={vi.fn()}
        addressing={mockAddressing}
        {...copyProps}
      />
    );
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

  it('calls onChange without addresses when the last row is removed', async () => {
    const onChange = vi.fn();
    render(<AddressListField value={[validAddr]} onChange={onChange} {...copyProps} />);
    const removeButtons = screen.getAllByRole('button', { name: /remove address/i });
    await act(async () => {
      removeButtons[0]?.click();
    });
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('shows live preview instead of post-add feedback while typing a new paste', async () => {
    const onChange = vi.fn();
    render(
      <AddressListField value={[]} onChange={onChange} addressing={mockAddressing} {...copyProps} />
    );
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

  it('accepts addresses without chain validation when addressing is omitted', async () => {
    const onChange = vi.fn();
    render(<AddressListField value={[]} onChange={onChange} {...copyProps} />);
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
