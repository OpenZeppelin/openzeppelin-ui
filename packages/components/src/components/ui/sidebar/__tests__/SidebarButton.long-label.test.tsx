import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SidebarButton } from '../SidebarButton';

const LONG = 'A very long contract label that does not fit the sidebar and keeps going';
const dot = <span data-testid="dot" />;

describe('SidebarButton long label', () => {
  it('truncates a string label in a shrinkable span and keeps the trailing slot last', () => {
    render(
      <SidebarButton icon={<svg data-testid="icon" />} trailing={dot}>
        {LONG}
      </SidebarButton>
    );
    const row = screen.getByRole('button');
    const label = screen.getByText(LONG);
    expect(label.tagName).toBe('SPAN');
    expect(label.className).toContain('truncate');
    expect(label.parentElement?.className).toContain('min-w-0');
    expect(row.className).not.toContain('flex-wrap');
    expect(row.lastElementChild?.contains(screen.getByTestId('dot'))).toBe(true);
  });

  it('keeps the full label as the accessible name', () => {
    render(<SidebarButton trailing={dot}>{LONG}</SidebarButton>);
    expect(screen.getByRole('button', { name: LONG })).toBeTruthy();
  });

  it('also shrinks the label area when only a badge follows it', () => {
    render(<SidebarButton badge="12">{LONG}</SidebarButton>);
    const row = screen.getByRole('button');
    expect(row.className).not.toContain('flex-wrap');
    expect(screen.getByText(LONG).parentElement?.className).toContain('min-w-0');
    expect(row.lastElementChild?.textContent).toBe('12');
  });

  it('renders as a link with the same truncation when href is given', () => {
    render(
      <SidebarButton href="/x" trailing={dot}>
        {LONG}
      </SidebarButton>
    );
    const link = screen.getByRole('link', { name: LONG });
    expect(link.className).not.toContain('flex-wrap');
    expect(screen.getByText(LONG).className).toContain('truncate');
  });

  it('boundary: a short label gets the same structure', () => {
    render(<SidebarButton>Inbox</SidebarButton>);
    expect(screen.getByText('Inbox').className).toContain('truncate');
    expect(screen.getByRole('button', { name: 'Inbox' })).toBeTruthy();
  });

  it('non-string label: shrinkable area, node rendered as given with no kit wrapper', () => {
    render(
      <SidebarButton trailing={dot}>
        <b data-testid="node">Rich label</b>
      </SidebarButton>
    );
    const node = screen.getByTestId('node');
    expect(node.className).toBe('');
    expect(node.parentElement?.className).toContain('min-w-0');
    expect(node.parentElement?.querySelector('.truncate')).toBeNull();
  });

  it('non-string label: a fragment of several nodes is not wrapped either', () => {
    render(
      <SidebarButton>
        <>
          <i>one</i>
          <i>two</i>
        </>
      </SidebarButton>
    );
    expect(screen.getByText('one').parentElement?.className).toContain('min-w-0');
    expect(document.querySelector('.truncate')).toBeNull();
  });
});
