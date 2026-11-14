import { useState } from 'react';

import { Button, Skeleton } from '@openzeppelin/ui-components';

import { DemoSection } from './DemoSection';

/** Demonstrates Skeleton standing in for a card's content, with a load toggle. */
export function SkeletonDemo(): React.ReactElement {
  const [loading, setLoading] = useState(true);

  return (
    <DemoSection
      title="Skeleton"
      description="Placeholder blocks for loading content. They pulse, stop for reduced-motion users, and are hidden from assistive tech."
      codeExample={`import { Skeleton } from '@openzeppelin/ui-components';

<div className="flex items-center gap-3">
  <Skeleton shape="circle" className="size-12" />
  <div className="flex-1 space-y-2">
    <Skeleton className="w-1/2" />
    <Skeleton className="w-3/4" />
  </div>
</div>
<Skeleton shape="rect" className="h-24 w-full" />`}
    >
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => setLoading((v) => !v)}>
          {loading ? 'Show content' : 'Show loading'}
        </Button>
        <div className="space-y-4 rounded-lg border p-4" data-testid="skeleton-card">
          <div className="flex items-center gap-3">
            {loading ? (
              <>
                <Skeleton shape="circle" className="size-12" data-testid="skeleton-avatar" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="w-1/2" data-testid="skeleton-title" />
                  <Skeleton className="w-3/4" />
                </div>
              </>
            ) : (
              <>
                <div className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  OZ
                </div>
                <div className="flex-1 space-y-2">
                  <p className="h-4 w-1/2 text-sm font-medium leading-4">OpenZeppelin</p>
                  <p className="h-4 w-3/4 text-sm leading-4 text-muted-foreground">
                    Secure smart contract tooling
                  </p>
                </div>
              </>
            )}
          </div>
          {loading ? (
            <Skeleton shape="rect" className="h-24 w-full" />
          ) : (
            <div className="h-24 rounded-md bg-accent p-3 text-sm">Content block</div>
          )}
        </div>
      </div>
    </DemoSection>
  );
}
