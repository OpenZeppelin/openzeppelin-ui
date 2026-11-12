import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Breadcrumb, type BreadcrumbItems } from './breadcrumb';

/** SF-5 Scenario 2: link-less ancestors compile without a cast and render as text. */
describe('Breadcrumb href-less ancestors (SF-5 S2)', () => {
  // Compile-time check: `satisfies` fails typecheck if an href-less middle ancestor needs a cast.
  const items = [
    { label: 'Home', href: '/' },
    { label: 'Section' },
    { label: 'Sub', href: '/section/sub' },
    { label: 'Page' },
  ] satisfies BreadcrumbItems;

  it('renders the link-less middle ancestor as plain text, no link role', () => {
    render(<Breadcrumb items={items} />);
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    const section = within(nav)
      .getAllByRole('listitem')
      .find((li) => li.textContent?.includes('Section'));

    expect(section).toBeDefined();
    expect(within(section as HTMLElement).queryByRole('link')).toBeNull();
    expect(within(nav).queryByRole('link', { name: 'Section' })).toBeNull();
  });

  it('keeps ancestors that have links as links, in order', () => {
    render(<Breadcrumb items={items} />);
    const links = screen.getAllByRole('link');
    expect(links.map((l) => [l.textContent, l.getAttribute('href')])).toEqual([
      ['Home', '/'],
      ['Sub', '/section/sub'],
    ]);
  });

  it('does not call renderLink for a link-less ancestor', () => {
    const hrefs: string[] = [];
    render(
      <Breadcrumb
        items={items}
        renderLink={({ children, className, href }) => {
          hrefs.push(href);
          return (
            <a className={className} href={href}>
              {children}
            </a>
          );
        }}
      />
    );
    expect(hrefs).toEqual(['/', '/section/sub']);
  });

  it('boundary: all ancestors link-less still renders and marks only the last as current', () => {
    render(<Breadcrumb items={[{ label: 'A' }, { label: 'B' }, { label: 'C' }]} />);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    const li = screen.getAllByRole('listitem');
    expect(li.map((x) => x.getAttribute('aria-current'))).toEqual([null, null, 'page']);
  });

  it('failure (type-level): the current page cannot take an href', () => {
    // @ts-expect-error current item must not carry href (BreadcrumbCurrentItem.href?: never)
    const bad: BreadcrumbItems = [{ label: 'A' }, { label: 'Now', href: '/now' }];
    expect(bad).toHaveLength(2);
  });
});
