import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import React from 'react';

import { SidebarButton } from '../SidebarButton';

/**
 * SF-13 trailing slot. No Invariants stage (Low); tests trace to the spec's
 * acceptance scenarios S1 (slot placement, selection/click/name unchanged) and
 * S2 (no trailing -> matches today).
 */
const dot = <span data-testid="dot" className="size-2 rounded-full" />;

describe('SidebarButton trailing slot (SF-13 S1)', () => {
  it('renders the trailing element inside the row, as the last child, selected and unselected', () => {
    const { rerender } = render(<SidebarButton trailing={dot}>Inbox</SidebarButton>);
    for (const isSelected of [false, true]) {
      rerender(
        <SidebarButton trailing={dot} isSelected={isSelected}>
          Inbox
        </SidebarButton>
      );
      const row = screen.getByRole('button', { name: 'Inbox' });
      expect(row.contains(screen.getByTestId('dot'))).toBe(true);
      expect(row.lastElementChild?.contains(screen.getByTestId('dot'))).toBe(true);
    }
  });

  it('places the slot after the text badge when both are given', () => {
    render(
      <SidebarButton badge="3" trailing={dot}>
        Inbox
      </SidebarButton>
    );
    const row = screen.getByRole('button');
    const badge = screen.getByText('3');
    const slot = screen.getByTestId('dot').parentElement as HTMLElement;
    expect(badge.compareDocumentPosition(slot) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(row.lastElementChild).toBe(slot);
  });

  it('keeps the selected style, current-page marker and click behaviour unchanged', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <SidebarButton isSelected onClick={onClick}>
        Inbox
      </SidebarButton>
    );
    const plain = screen.getByRole('button', { name: 'Inbox' });
    const plainClass = plain.className;

    rerender(
      <SidebarButton isSelected onClick={onClick} trailing={dot}>
        Inbox
      </SidebarButton>
    );
    const withSlot = screen.getByRole('button', { name: 'Inbox' });
    expect(withSlot.getAttribute('aria-current')).toBe('page');
    expect(withSlot.className).toContain('text-selected');
    // Only the layout class differs (justify-start -> justify-between).
    expect(withSlot.className.replace('justify-between', 'justify-start')).toBe(plainClass);

    await user.click(withSlot);
    await user.click(screen.getByTestId('dot'));
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('clicking the slot on the anchor variant activates the link row', async () => {
    const onClick = vi.fn((e: React.MouseEvent) => e.preventDefault());
    const user = userEvent.setup();
    render(
      <SidebarButton href="/inbox" trailing={dot} onClick={onClick as () => void}>
        Inbox
      </SidebarButton>
    );
    await user.click(screen.getByTestId('dot'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: 'Inbox' }).contains(screen.getByTestId('dot'))).toBe(
      true
    );
  });

  it('does not steal the accessible name when the slot is an unlabelled dot', () => {
    render(<SidebarButton trailing={dot}>Inbox</SidebarButton>);
    expect(screen.getByRole('button', { name: 'Inbox', exact: true })).toBeTruthy();
  });

  it('adds only its own label to the name when the slot carries one', () => {
    render(<SidebarButton trailing={<span role="img" aria-label="unread" />}>Inbox</SidebarButton>);
    expect(screen.getByRole('button', { name: 'Inbox unread' })).toBeTruthy();
  });

  it('a disabled row stays non-clickable with a trailing slot', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <SidebarButton disabled onClick={onClick} trailing={dot}>
        Locked
      </SidebarButton>
    );
    await user.click(screen.getByTestId('dot'));
    expect(onClick).not.toHaveBeenCalled();
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('SidebarButton without trailing matches today (SF-13 S2)', () => {
  it('renders no slot wrapper for undefined, null or false', () => {
    const { container, rerender } = render(<SidebarButton>Inbox</SidebarButton>);
    const baseline = container.innerHTML;
    for (const empty of [undefined, null, false]) {
      rerender(<SidebarButton trailing={empty}>Inbox</SidebarButton>);
      expect(container.innerHTML).toBe(baseline);
    }
  });

  it('badge-only row is unchanged: badge present, no slot, justify-between', () => {
    const { container } = render(<SidebarButton badge="3">Inbox</SidebarButton>);
    const row = screen.getByRole('button');
    expect(row.className).toContain('justify-between');
    expect(container.querySelectorAll('.ml-auto')).toHaveLength(0);
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('no badge and no trailing keeps justify-start', () => {
    render(<SidebarButton>Inbox</SidebarButton>);
    expect(screen.getByRole('button').className).toContain('justify-start');
  });

  it('treats 0 as renderable content (boundary)', () => {
    render(<SidebarButton trailing={0}>Inbox</SidebarButton>);
    expect(screen.getByRole('button', { name: 'Inbox 0' })).toBeTruthy();
  });
});
