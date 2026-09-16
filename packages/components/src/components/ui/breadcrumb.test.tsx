import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';

import { Breadcrumb, type BreadcrumbItems } from './breadcrumb';

const items = [
  { label: 'Operator Console', href: '/' },
  { label: 'Operations', href: '/operations' },
  { label: 'Request queue' },
] satisfies BreadcrumbItems;

describe('Breadcrumb', () => {
  it('renders linked ancestors and an accessible current page', () => {
    render(<Breadcrumb items={items} />);

    const navigation = screen.getByRole('navigation', { name: 'Breadcrumb' });
    const listItems = within(navigation).getAllByRole('listitem');
    const links = within(navigation).getAllByRole('link');

    expect(within(navigation).getByRole('list').getAttribute('role')).toBe('list');
    expect(listItems).toHaveLength(3);
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/', '/operations']);
    expect(listItems[2]?.getAttribute('aria-current')).toBe('page');
    expect(within(listItems[2]).queryByRole('link')).toBeNull();

    const separators = within(navigation).getAllByText('/');
    expect(separators).toHaveLength(2);
    expect(separators.every((separator) => separator.getAttribute('aria-hidden') === 'true')).toBe(
      true
    );
  });

  it('delegates ancestor links to a consumer renderer', () => {
    const renderLink = vi.fn(
      ({
        children,
        className,
        href,
      }: Parameters<NonNullable<ComponentProps<typeof Breadcrumb>['renderLink']>>[0]) => (
        <a className={className} data-router-link="true" href={href}>
          {children}
        </a>
      )
    );

    render(<Breadcrumb items={items} renderLink={renderLink} />);

    expect(renderLink).toHaveBeenCalledTimes(2);
    expect(screen.getAllByRole('link').every((link) => link.dataset['routerLink'] === 'true')).toBe(
      true
    );
  });

  it('supports the two-level case without special props', () => {
    render(
      <Breadcrumb items={[{ label: 'Operator Console', href: '/' }, { label: 'Not found' }]} />
    );

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Not found').closest('li')?.getAttribute('aria-current')).toBe('page');
  });
});
