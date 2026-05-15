/**
 * @vitest-environment jsdom
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AddressDisplay } from './address-display';
import { AddressLabelProvider } from './address-label-context';

/** Longer than default truncateMiddle start+end so truncation produces an ellipsis. */
const LONG_ADDRESS = `0x${'a'.repeat(40)}`;

describe('AddressDisplay', () => {
  describe('truncateWhenLabeled', () => {
    it('shows the full address when unlabeled and truncateWhenLabeled is true', () => {
      const { container } = render(<AddressDisplay address={LONG_ADDRESS} truncateWhenLabeled />);
      expect(container.textContent).toContain(LONG_ADDRESS);
      expect(container.textContent).not.toContain('...');
    });

    it('truncates when a label prop is present and truncateWhenLabeled is true', () => {
      const { container } = render(
        <AddressDisplay address={LONG_ADDRESS} label="Alice" truncateWhenLabeled />
      );
      expect(container.textContent).toContain('Alice');
      expect(container.textContent).toContain('...');
    });

    it('uses a context-resolved label with truncateWhenLabeled', () => {
      const { container } = render(
        <AddressLabelProvider resolveLabel={() => 'Bob'}>
          <AddressDisplay address={LONG_ADDRESS} truncateWhenLabeled />
        </AddressLabelProvider>
      );
      expect(container.textContent).toContain('Bob');
      expect(container.textContent).toContain('...');
    });

    it('honors explicit truncate={false} over truncateWhenLabeled', () => {
      const { container } = render(
        <AddressDisplay address={LONG_ADDRESS} label="Alice" truncateWhenLabeled truncate={false} />
      );
      expect(container.textContent).toContain(LONG_ADDRESS);
    });

    it('still truncates unlabeled addresses when truncate is omitted and truncateWhenLabeled is false', () => {
      const { container } = render(<AddressDisplay address={LONG_ADDRESS} />);
      expect(container.textContent).toContain('...');
      expect(container.textContent).not.toContain(LONG_ADDRESS);
    });
  });
});
