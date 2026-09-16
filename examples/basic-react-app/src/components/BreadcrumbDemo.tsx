import { Breadcrumb, Header } from '@openzeppelin/ui-components';

import { DemoSection } from './DemoSection';

/**
 * Demonstrates Breadcrumb depth and Header composition.
 */
export function BreadcrumbDemo(): React.ReactElement {
  return (
    <DemoSection
      title="Breadcrumb"
      description="Accessible navigation context with linked ancestors and a non-linked current page. Breadcrumbs render ordinary anchors by default and accept a custom link renderer for client-side routers."
      codeExample={`import { Breadcrumb, Header } from '@openzeppelin/ui-components';

<Breadcrumb
  items={[
    { label: 'Contracts', href: '/contracts' },
    { label: 'MyToken' },
  ]}
/>

<Header
  breadcrumb={
    <Breadcrumb
      items={[
        { label: 'Contracts', href: '/contracts' },
        { label: 'MyToken' },
      ]}
    />
  }
/>

// Existing title usage remains supported.
<Header title="Contracts" />`}
    >
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Two levels</h3>
        <div className="rounded-lg border p-4">
          <Breadcrumb items={[{ label: 'Contracts', href: '#contracts' }, { label: 'MyToken' }]} />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Deeper trail</h3>
        <div className="rounded-lg border p-4">
          <Breadcrumb
            items={[
              { label: 'Contracts', href: '#contracts' },
              { label: 'Upgradeable', href: '#upgradeable' },
              { label: 'MyToken', href: '#my-token' },
              { label: 'Access control' },
            ]}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Smallest valid trail</h3>
        <p className="text-muted-foreground text-sm">
          A breadcrumb always has a current page, so the smallest valid state still communicates
          useful location context.
        </p>
        <div className="rounded-lg border p-4">
          <Breadcrumb items={[{ label: 'Contracts' }]} />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Header compatibility</h3>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="overflow-hidden rounded-lg border">
            <p className="text-muted-foreground border-b px-4 py-2 text-sm">Breadcrumb content</p>
            <Header
              breadcrumb={
                <Breadcrumb
                  items={[{ label: 'Contracts', href: '#contracts' }, { label: 'MyToken' }]}
                />
              }
              rightContent={<span className="text-muted-foreground text-sm">Sepolia</span>}
            />
          </div>
          <div className="overflow-hidden rounded-lg border">
            <p className="text-muted-foreground border-b px-4 py-2 text-sm">Existing title prop</p>
            <Header
              title="Contracts"
              rightContent={<span className="text-muted-foreground text-sm">Sepolia</span>}
            />
          </div>
        </div>
      </div>
    </DemoSection>
  );
}
