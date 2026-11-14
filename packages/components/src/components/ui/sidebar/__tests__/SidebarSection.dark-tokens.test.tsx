/**
 * @vitest-environment jsdom
 *
 * SidebarSection titles use text-muted-foreground; titleClassName still wins.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SidebarSection } from '../SidebarSection';

describe('SidebarSection theme tokens', () => {
  it('happy: section title uses muted-foreground, not a fixed mid-grey', () => {
    render(
      <SidebarSection title="Integration">
        <button type="button">Item</button>
      </SidebarSection>
    );
    const title = screen.getByText('Integration');
    expect(title.className).toContain('text-muted-foreground');
    expect(title.className).not.toContain('#5e5e5e');
  });

  it('boundary: titleClassName overrides the default title colour', () => {
    render(
      <SidebarSection title="Custom" titleClassName="text-red-500">
        <button type="button">Item</button>
      </SidebarSection>
    );
    const title = screen.getByText('Custom');
    expect(title.className).toContain('text-red-500');
    // twMerge drops the default colour token when the consumer supplies one.
    expect(title.className).not.toContain('text-muted-foreground');
  });

  it('failure: omitting title renders no title node', () => {
    const { container } = render(
      <SidebarSection>
        <button type="button">Item</button>
      </SidebarSection>
    );
    expect(container.querySelector('.text-muted-foreground')).toBeNull();
    expect(screen.getByRole('button', { name: 'Item' })).toBeTruthy();
  });
});
