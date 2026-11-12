import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import React, { useState } from 'react';

import { SidebarButton } from '../SidebarButton';

/**
 * SF-5 Scenario 1: only the selected button carries the current-page marker,
 * and moving the selection moves the marker. (No Invariants stage; scenario ids used.)
 */
function Nav(): React.ReactElement {
  const [selected, setSelected] = useState('a');
  return (
    <nav>
      {['a', 'b', 'c'].map((id) => (
        <SidebarButton key={id} isSelected={selected === id} onClick={() => setSelected(id)}>
          Item {id}
        </SidebarButton>
      ))}
    </nav>
  );
}

describe('SidebarButton current-page marker (SF-5 S1)', () => {
  it('marks the selected button aria-current="page"', () => {
    render(<SidebarButton isSelected>Home</SidebarButton>);
    expect(screen.getByRole('button', { name: 'Home' }).getAttribute('aria-current')).toBe('page');
  });

  it('omits the attribute entirely when unselected or by default', () => {
    render(
      <>
        <SidebarButton isSelected={false}>One</SidebarButton>
        <SidebarButton>Two</SidebarButton>
      </>
    );
    expect(screen.getByRole('button', { name: 'One' }).hasAttribute('aria-current')).toBe(false);
    expect(screen.getByRole('button', { name: 'Two' }).hasAttribute('aria-current')).toBe(false);
  });

  it('puts the marker on the anchor in the href variant, selected only', () => {
    render(
      <>
        <SidebarButton href="/a" isSelected>
          Sel
        </SidebarButton>
        <SidebarButton href="/b">Other</SidebarButton>
      </>
    );
    expect(screen.getByRole('link', { name: 'Sel' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Other' }).hasAttribute('aria-current')).toBe(false);
  });

  it('moves the marker when the selection moves: exactly one marked at a time', async () => {
    const user = userEvent.setup();
    const { container } = render(<Nav />);
    const marked = () => Array.from(container.querySelectorAll('[aria-current]'));

    expect(marked().map((el) => el.textContent)).toEqual(['Item a']);
    await user.click(screen.getByRole('button', { name: 'Item c' }));
    expect(marked().map((el) => el.textContent)).toEqual(['Item c']);
    expect(screen.getByRole('button', { name: 'Item a' }).hasAttribute('aria-current')).toBe(false);
  });

  it('does not mark a disabled+selected button (drift assumption from Code stage)', () => {
    render(
      <SidebarButton isSelected disabled>
        Locked
      </SidebarButton>
    );
    expect(screen.getByRole('button', { name: 'Locked' }).hasAttribute('aria-current')).toBe(false);
  });

  it('keeps click behaviour and accessible name unchanged when selected', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <SidebarButton isSelected badge="3" onClick={onClick}>
        Inbox
      </SidebarButton>
    );
    const button = screen.getByRole('button', { name: /Inbox/ });
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
