/**
 * @vitest-environment jsdom
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AddressDisplay } from '../address-display';

const ADDRESS = `0x${'a'.repeat(40)}`;
const TX_HASH = `0x${'b'.repeat(64)}`;

let writeText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});

afterEach(() => {
  vi.useRealTimers();
});

function copyButton(name: string): HTMLElement {
  return screen.getByRole('button', { name });
}

describe('AddressDisplay copy labels (SF-2)', () => {
  describe('SC-1: custom labels', () => {
    it('names the button by copyLabel and swaps to copiedLabel after a copy', () => {
      render(
        <AddressDisplay
          address={TX_HASH}
          showCopyButton
          copyLabel="Copy transaction hash"
          copiedLabel="Transaction hash copied"
        />
      );
      fireEvent.click(copyButton('Copy transaction hash'));
      expect(writeText).toHaveBeenCalledWith(TX_HASH);
      expect(copyButton('Transaction hash copied')).toBeTruthy();
      expect(screen.queryByRole('button', { name: 'Copy transaction hash' })).toBeNull();
    });

    it('reverts to copyLabel once the confirmation window (2s) elapses', () => {
      render(
        <AddressDisplay
          address={TX_HASH}
          showCopyButton
          copyLabel="Copy hash"
          copiedLabel="Hash copied"
        />
      );
      fireEvent.click(copyButton('Copy hash'));
      expect(copyButton('Hash copied')).toBeTruthy();
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(copyButton('Copy hash')).toBeTruthy();
    });

    it('custom copyLabel alone keeps the default copied feedback', () => {
      render(<AddressDisplay address={ADDRESS} showCopyButton copyLabel="Copy hash" />);
      fireEvent.click(copyButton('Copy hash'));
      expect(copyButton('Copied')).toBeTruthy();
    });

    it('custom copiedLabel alone keeps the default copy name', () => {
      render(<AddressDisplay address={ADDRESS} showCopyButton copiedLabel="Done" />);
      expect(copyButton('Copy address')).toBeTruthy();
      fireEvent.click(copyButton('Copy address'));
      expect(copyButton('Done')).toBeTruthy();
    });

    it('tells several copy buttons in one row apart', () => {
      render(
        <div>
          <AddressDisplay address={ADDRESS} showCopyButton copyLabel="Copy sender" />
          <AddressDisplay address={TX_HASH} showCopyButton copyLabel="Copy transaction hash" />
        </div>
      );
      fireEvent.click(copyButton('Copy transaction hash'));
      expect(writeText).toHaveBeenCalledTimes(1);
      expect(writeText).toHaveBeenCalledWith(TX_HASH);
      // the other button is untouched
      expect(copyButton('Copy sender')).toBeTruthy();
    });

    it('applies labels in the labeled (label-over-hex) render branch too', () => {
      render(
        <AddressDisplay
          address={ADDRESS}
          label="Treasury"
          showCopyButton
          copyLabel="Copy treasury address"
        />
      );
      expect(copyButton('Copy treasury address')).toBeTruthy();
    });

    it('does not rename the explorer link or edit button', () => {
      render(
        <AddressDisplay
          address={ADDRESS}
          showCopyButton
          copyLabel="Copy hash"
          explorerUrl="https://example.test/x"
          onLabelEdit={() => {}}
        />
      );
      expect(screen.getByRole('link', { name: 'View in explorer' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Edit label' })).toBeTruthy();
    });
  });

  describe('SC-2: defaults unchanged', () => {
    it('uses "Copy address" then "Copied" when no labels are given', () => {
      render(<AddressDisplay address={ADDRESS} showCopyButton />);
      fireEvent.click(copyButton('Copy address'));
      expect(copyButton('Copied')).toBeTruthy();
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(copyButton('Copy address')).toBeTruthy();
    });

    it('explicit undefined labels fall back to the defaults', () => {
      render(
        <AddressDisplay
          address={ADDRESS}
          showCopyButton
          copyLabel={undefined}
          copiedLabel={undefined}
        />
      );
      expect(copyButton('Copy address')).toBeTruthy();
      fireEvent.click(copyButton('Copy address'));
      expect(copyButton('Copied')).toBeTruthy();
    });

    it('renders identical DOM whether labels are omitted or set to the defaults', () => {
      const omitted = render(<AddressDisplay address={ADDRESS} showCopyButton />);
      const explicit = render(
        <AddressDisplay
          address={ADDRESS}
          showCopyButton
          copyLabel="Copy address"
          copiedLabel="Copied"
        />
      );
      expect(explicit.container.innerHTML).toBe(omitted.container.innerHTML);
    });

    it('renders no copy button (and ignores labels) when showCopyButton is off', () => {
      render(<AddressDisplay address={ADDRESS} copyLabel="Copy hash" />);
      expect(screen.queryByRole('button')).toBeNull();
    });
  });

  describe('boundary', () => {
    it('empty-string copyLabel yields an empty accessible name (caller owns it, not defaulted)', () => {
      const { container } = render(
        <AddressDisplay address={ADDRESS} showCopyButton copyLabel="" />
      );
      expect(container.querySelector('button')?.getAttribute('aria-label')).toBe('');
    });
  });
});
