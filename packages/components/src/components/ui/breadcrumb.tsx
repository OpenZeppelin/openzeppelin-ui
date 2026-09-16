import React from 'react';

export interface BreadcrumbLinkItem {
  readonly label: string;
  readonly href: string;
}

export interface BreadcrumbCurrentItem {
  readonly label: string;
  readonly href?: never;
}

export type BreadcrumbItems = readonly [...BreadcrumbLinkItem[], BreadcrumbCurrentItem];

export interface BreadcrumbLinkRenderProps {
  readonly children: React.ReactNode;
  readonly className: string;
  readonly href: string;
}

export interface BreadcrumbProps {
  readonly items: BreadcrumbItems;
  readonly renderLink?: (props: BreadcrumbLinkRenderProps) => React.ReactNode;
}

const linkClassName = 'text-muted-foreground transition-colors hover:text-foreground';

function defaultRenderLink({
  children,
  className,
  href,
}: BreadcrumbLinkRenderProps): React.ReactNode {
  return (
    <a className={className} href={href}>
      {children}
    </a>
  );
}

/**
 * Renders linked navigation ancestors followed by the current page.
 */
export function Breadcrumb({
  items,
  renderLink = defaultRenderLink,
}: BreadcrumbProps): React.ReactElement {
  return (
    <nav aria-label="Breadcrumb">
      <ol role="list" className="flex items-center gap-2 text-sm">
        {items.map((item, index) => {
          const isCurrentPage = index === items.length - 1;

          return (
            <li
              aria-current={isCurrentPage ? 'page' : undefined}
              className={
                isCurrentPage
                  ? 'flex items-center gap-2 font-medium text-foreground'
                  : 'flex items-center gap-2'
              }
              key={`${item.label}-${index}`}
            >
              {index > 0 && (
                <span aria-hidden="true" className="text-muted-foreground">
                  /
                </span>
              )}
              {isCurrentPage || typeof item.href !== 'string'
                ? item.label
                : renderLink({
                    children: item.label,
                    className: linkClassName,
                    href: item.href,
                  })}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
