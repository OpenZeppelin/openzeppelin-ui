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

  // D2 cross-package change: the additive presentational `avatar` slot. These
  // guard INV-54 — an undefined avatar must leave the render byte-identical to
  // the pre-avatar component, in both render branches — plus the leading-slot
  // behavior when an avatar IS supplied. The full SF-4 behavioral / a11y suite
  // (INV-51..68) is owned by the SF-4 Tests stage; this file protects only the
  // shared-package contract the cross-package edit was approved on.
  describe('avatar slot (D2 — INV-54 zero-regression)', () => {
    const AVATAR = <img data-testid="avatar" src="https://example.test/a.png" alt="" />;

    it('renders identical DOM whether avatar is omitted or explicitly undefined (labeled)', () => {
      const omitted = render(<AddressDisplay address={LONG_ADDRESS} label="Alice" />);
      const explicitUndefined = render(
        <AddressDisplay address={LONG_ADDRESS} label="Alice" avatar={undefined} />
      );
      expect(explicitUndefined.container.innerHTML).toBe(omitted.container.innerHTML);
    });

    it('renders identical DOM whether avatar is omitted or explicitly undefined (unlabeled)', () => {
      const omitted = render(<AddressDisplay address={LONG_ADDRESS} showCopyButton />);
      const explicitUndefined = render(
        <AddressDisplay address={LONG_ADDRESS} showCopyButton avatar={undefined} />
      );
      expect(explicitUndefined.container.innerHTML).toBe(omitted.container.innerHTML);
    });

    it('introduces no wrapper, no <img>, and no leading slot when avatar is undefined (labeled)', () => {
      const { container } = render(<AddressDisplay address={LONG_ADDRESS} label="Alice" />);
      const root = container.firstElementChild as HTMLElement;
      // Outer stays the original single-column layout — no row wrapper.
      expect(root.className).toContain('flex-col');
      expect(root.className).not.toContain('items-center');
      expect(container.querySelector('img')).toBeNull();
      // The label span and mono hex line are the container's DIRECT children —
      // no extra nesting introduced by the avatar path.
      expect(root.children).toHaveLength(2);
      expect(root.children[0].textContent).toBe('Alice');
    });

    it('introduces no leading slot when avatar is undefined (unlabeled)', () => {
      const { container } = render(<AddressDisplay address={LONG_ADDRESS} />);
      const root = container.firstElementChild as HTMLElement;
      expect(container.querySelector('img')).toBeNull();
      expect(root.className).toContain('items-center'); // unlabeled branch unchanged
      expect(root.firstElementChild?.tagName).toBe('SPAN'); // address span still leads
    });

    it('adds a leading avatar without altering the label/hex block structure (labeled)', () => {
      const { container, getByTestId } = render(
        <AddressDisplay address={LONG_ADDRESS} label="Alice" avatar={AVATAR} />
      );
      expect(getByTestId('avatar')).toBeTruthy();
      const root = container.firstElementChild as HTMLElement;
      // Outer becomes a centered row: [avatar slot | preserved label column].
      expect(root.className).toContain('items-center');
      expect(root.children).toHaveLength(2);
      const column = root.children[1] as HTMLElement;
      expect(column.className).toContain('flex-col');
      expect(column.children[0].textContent).toBe('Alice');
      expect(container.textContent).toContain('Alice');
    });

    it('renders the avatar as a leading element in the unlabeled branch', () => {
      const { container, getByTestId } = render(
        <AddressDisplay address={LONG_ADDRESS} avatar={AVATAR} />
      );
      expect(getByTestId('avatar')).toBeTruthy();
      const root = container.firstElementChild as HTMLElement;
      // Avatar slot leads the row, ahead of the address span.
      expect(root.firstElementChild?.querySelector('[data-testid="avatar"]')).toBeTruthy();
    });
  });
});
