import { JSX } from 'react';

import { cn } from '@openzeppelin/ui-utils';

/** Card container component with rounded borders and shadow. */
function Card({ className, ...props }: React.ComponentProps<'div'>): JSX.Element {
  return (
    <div
      data-slot="card"
      className={cn(
        'bg-card text-card-foreground flex flex-col rounded-xl border py-6 shadow-sm',
        className
      )}
      {...props}
    />
  );
}

/** Card header section for title and description. */
function CardHeader({ className, ...props }: React.ComponentProps<'div'>): JSX.Element {
  return (
    <div
      data-slot="card-header"
      className={cn('flex flex-col gap-1.5 px-6', className)}
      {...props}
    />
  );
}

/** Card title with semibold styling. */
function CardTitle({ className, ...props }: React.ComponentProps<'div'>): JSX.Element {
  return (
    <div
      data-slot="card-title"
      className={cn('leading-none font-semibold', className)}
      {...props}
    />
  );
}

/** Card description with muted text styling. */
function CardDescription({ className, ...props }: React.ComponentProps<'div'>): JSX.Element {
  return (
    <div
      data-slot="card-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

/** Card content area with horizontal padding. */
function CardContent({ className, ...props }: React.ComponentProps<'div'>): JSX.Element {
  return <div data-slot="card-content" className={cn('px-6', className)} {...props} />;
}

/** Card footer with flex alignment for actions. */
function CardFooter({ className, ...props }: React.ComponentProps<'div'>): JSX.Element {
  return (
    <div data-slot="card-footer" className={cn('flex items-center px-6', className)} {...props} />
  );
}

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
