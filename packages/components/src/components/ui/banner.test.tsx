/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Banner } from './banner';

describe('Banner', () => {
  it('renders neutral compact typography classes', () => {
    const { container } = render(
      <Banner variant="neutral" size="compact" title="Before you deploy" dismissible={false}>
        Deploy checklist body
      </Banner>
    );

    expect(screen.getByText('Before you deploy').className).toContain('text-xs');
    expect(screen.getByText('Deploy checklist body').className).toContain('text-xs');
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('bg-muted/30');
    expect(root.className).toContain('border-border');
    expect(root.className).toContain('px-4');
    expect(root.className).toContain('py-3');
  });

  it('renders default info sizing', () => {
    const { container } = render(
      <Banner variant="info" title="Notice" dismissible={false}>
        Body
      </Banner>
    );

    expect(screen.getByText('Notice').className).toContain('text-sm');
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('p-4');
    expect(root.className).toContain('bg-blue-50');
  });

  it('hides dismiss control when dismissible is false', () => {
    render(
      <Banner dismissible={false} title="Static">
        Body
      </Banner>
    );

    expect(screen.queryByRole('button', { name: 'Dismiss banner' })).toBeNull();
  });
});
