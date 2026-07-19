/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import React from 'react';
import { useForm } from 'react-hook-form';

import type { AddressingCapability } from '@openzeppelin/ui-types';

import { AddressFieldWithResolvedPreview } from './AddressFieldWithResolvedPreview';
import { ResolvedAddressFieldPreview } from './ResolvedAddressFieldPreview';

const addressing: AddressingCapability = {
  isValidAddress: (value: string): boolean => /^0x[0-9a-fA-F]{40}$/.test(value),
};

const HEX = `0x${'ab'.repeat(20)}`;

interface HarnessProps {
  previewAddress?: string;
  preview?: React.ReactNode;
}

function Harness({ previewAddress = '', preview }: HarnessProps): React.ReactElement {
  const { control } = useForm({ defaultValues: { recipient: '' }, mode: 'onChange' });

  return (
    <AddressFieldWithResolvedPreview
      id="recipient"
      name="recipient"
      label="Recipient"
      control={control}
      addressing={addressing}
      previewAddress={previewAddress}
      previewNetworkId="ethereum-mainnet"
      preview={preview}
    />
  );
}

describe('ResolvedAddressFieldPreview', () => {
  it('renders nothing when address is empty', () => {
    const { container } = render(
      <ResolvedAddressFieldPreview address="" addressing={addressing} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when address fails addressing validation', () => {
    const { container } = render(
      <ResolvedAddressFieldPreview address="not-an-address" addressing={addressing} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the preview card for a valid address', () => {
    render(<ResolvedAddressFieldPreview address={HEX} addressing={addressing} />);
    expect(screen.getByLabelText('Resolved address preview')).toBeTruthy();
    expect(screen.getByText('Resolved account')).toBeTruthy();
  });
});

describe('AddressFieldWithResolvedPreview', () => {
  it('renders the field label and omits the default preview when address is invalid', () => {
    render(<Harness previewAddress="vitalik.eth" />);
    expect(screen.getByLabelText('Recipient')).toBeTruthy();
    expect(screen.queryByLabelText('Resolved address preview')).toBeNull();
  });

  it('renders the default preview card when previewAddress is a valid hex', () => {
    render(<Harness previewAddress={HEX} />);
    expect(screen.getByLabelText('Resolved address preview')).toBeTruthy();
  });

  it('accepts a custom preview slot', () => {
    render(<Harness previewAddress={HEX} preview={<div data-testid="custom-preview" />} />);
    expect(screen.getByTestId('custom-preview')).toBeTruthy();
    expect(screen.queryByLabelText('Resolved address preview')).toBeNull();
  });
});
