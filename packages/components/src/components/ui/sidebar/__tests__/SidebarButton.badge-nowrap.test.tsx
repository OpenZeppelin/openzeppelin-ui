import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SidebarButton } from '../SidebarButton';

const LONG = 'Compliance checklist with a long label that should truncate';
const SHORT_BADGE = 'DEMO-CHK';
const LONG_BADGE = 'VERY-LONG-BADGE-CODE-THAT-EXCEEDS-NARROW-SIDEBAR';

function badgeSpan(text: string): HTMLElement {
  return screen.getByText(text);
}

describe('SidebarButton badge stays on one line', () => {
  it('keeps a short badge non-wrapping and non-shrinking while the label truncates', () => {
    render(<SidebarButton badge={SHORT_BADGE}>{LONG}</SidebarButton>);
    const row = screen.getByRole('button');
    const badge = badgeSpan(SHORT_BADGE);
    const label = screen.getByText(LONG);

    expect(badge.tagName).toBe('SPAN');
    expect(badge.className).toContain('shrink-0');
    expect(badge.className).toContain('whitespace-nowrap');
    expect(label.className).toContain('truncate');
    expect(label.parentElement?.className).toContain('min-w-0');
    expect(row.className).not.toContain('flex-wrap');
    expect(row.lastElementChild?.textContent).toBe(SHORT_BADGE);
  });

  it('boundary: a short label still gets the same badge classes', () => {
    render(<SidebarButton badge={SHORT_BADGE}>Inbox</SidebarButton>);
    const badge = badgeSpan(SHORT_BADGE);
    expect(badge.className).toContain('shrink-0');
    expect(badge.className).toContain('whitespace-nowrap');
    expect(screen.getByRole('button', { name: `Inbox ${SHORT_BADGE}` })).toBeTruthy();
  });

  it('edge: a badge longer than the sidebar still does not wrap', () => {
    render(<SidebarButton badge={LONG_BADGE}>Short</SidebarButton>);
    const badge = badgeSpan(LONG_BADGE);
    expect(badge.className).toContain('shrink-0');
    expect(badge.className).toContain('whitespace-nowrap');
    expect(screen.getByText('Short').className).toContain('truncate');
  });

  it('keeps the badge nowrap when a trailing slot follows it', () => {
    const dot = <span data-testid="dot" />;
    render(
      <SidebarButton badge={SHORT_BADGE} trailing={dot}>
        {LONG}
      </SidebarButton>
    );
    const badge = badgeSpan(SHORT_BADGE);
    expect(badge.className).toContain('shrink-0');
    expect(badge.className).toContain('whitespace-nowrap');
    const group = screen.getByRole('button').lastElementChild as HTMLElement;
    expect(group.contains(badge)).toBe(true);
    expect(group.contains(screen.getByTestId('dot'))).toBe(true);
  });

  it('applies the same badge classes on the anchor variant', () => {
    render(
      <SidebarButton href="/compliance" badge={SHORT_BADGE}>
        {LONG}
      </SidebarButton>
    );
    const link = screen.getByRole('link', { name: `${LONG} ${SHORT_BADGE}` });
    const badge = badgeSpan(SHORT_BADGE);
    expect(link.contains(badge)).toBe(true);
    expect(badge.className).toContain('whitespace-nowrap');
    expect(badge.className).toContain('shrink-0');
  });

  it('failure: omitting badge renders no badge span and leaves the label truncating', () => {
    const { container } = render(<SidebarButton>{LONG}</SidebarButton>);
    expect(container.querySelector('.whitespace-nowrap')).toBeNull();
    expect(screen.getByText(LONG).className).toContain('truncate');
    expect(screen.getByRole('button', { name: LONG })).toBeTruthy();
  });
});
