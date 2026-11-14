/**
 * @vitest-environment jsdom
 *
 * SidebarLayout defaults to bg-sidebar (desktop + mobile panel). A consumer
 * background still overrides the desktop default.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SidebarLayout } from '../SidebarLayout';

describe('SidebarLayout theme tokens', () => {
  it('happy: desktop sidebar defaults to bg-sidebar', () => {
    const { container } = render(
      <SidebarLayout header={<span>Logo</span>}>
        <div>nav</div>
      </SidebarLayout>
    );
    const desktop = container.querySelector('div.fixed.left-0.top-0.z-40') as HTMLElement;
    expect(desktop.className).toContain('bg-sidebar');
    expect(desktop.className).not.toMatch(/rgba\(245/);
  });

  it('boundary: consumer background overrides the desktop default', () => {
    const { container } = render(
      <SidebarLayout background="bg-red-500">
        <div>nav</div>
      </SidebarLayout>
    );
    const desktop = container.querySelector('div.fixed.left-0.top-0.z-40') as HTMLElement;
    expect(desktop.className).toContain('bg-red-500');
    expect(desktop.className).not.toContain('bg-sidebar');
  });

  it('happy: mobile slide-over panel uses bg-sidebar', () => {
    render(
      <SidebarLayout mobileOpen onMobileOpenChange={() => undefined} mobileAriaLabel="Menu">
        <div>nav</div>
      </SidebarLayout>
    );
    const dialog = screen.getByRole('dialog', { name: 'Menu' });
    expect(dialog.className).toContain('bg-sidebar');
    expect(dialog.className).not.toMatch(/rgba\(245/);
  });
});
