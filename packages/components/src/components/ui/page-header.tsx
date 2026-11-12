import * as React from 'react';

import { cn } from '@openzeppelin/ui-utils';

/** Heading levels a page header title may use. */
export type PageHeaderTitleLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  /** Page title, rendered as a heading. */
  title: React.ReactNode;
  /**
   * Heading level of the title.
   * @default 1
   */
  titleLevel?: PageHeaderTitleLevel;
  /** Supporting text under the title. Nothing is rendered when omitted or empty. */
  description?: React.ReactNode;
  /**
   * Action area (buttons, menus). Sits beside the title on wide screens and wraps
   * below it on narrow ones. Nothing is rendered when omitted or empty.
   */
  actions?: React.ReactNode;
}

const isPresent = (node: React.ReactNode): boolean =>
  node !== undefined && node !== null && node !== false && node !== '';

/**
 * Header for the top of a content page: a title heading, an optional description
 * and an optional actions area. Distinct from the app bar (`Header`) and card headers.
 */
export const PageHeader = React.forwardRef<HTMLElement, PageHeaderProps>(
  ({ title, titleLevel = 1, description, actions, className, ...props }, ref) => {
    const Heading = `h${titleLevel}` as const;

    return (
      <header
        ref={ref}
        className={cn(
          'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
          className
        )}
        {...props}
      >
        <div className="min-w-0 space-y-1">
          <Heading className="text-2xl font-semibold tracking-tight">{title}</Heading>
          {isPresent(description) && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {isPresent(actions) && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
    );
  }
);
PageHeader.displayName = 'PageHeader';
