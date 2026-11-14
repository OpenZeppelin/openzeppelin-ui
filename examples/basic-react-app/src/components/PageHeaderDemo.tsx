import { Button, PageHeader } from '@openzeppelin/ui-components';

import { DemoSection } from './DemoSection';

/** Demonstrates PageHeader: title, optional description and actions that wrap on narrow widths. */
export function PageHeaderDemo(): React.ReactElement {
  return (
    <DemoSection
      title="PageHeader"
      description="A header for the top of a content page. Actions sit beside the title on wide screens and wrap below it on narrow ones."
      codeExample={`import { Button, PageHeader } from '@openzeppelin/ui-components';

<PageHeader
  title="Contracts"
  description="Manage the contracts you have deployed."
  actions={
    <>
      <Button variant="outline">Import</Button>
      <Button>Deploy</Button>
    </>
  }
/>

// Title only: no description or actions containers are rendered
<PageHeader title="Settings" />

// Heading level
<PageHeader title="Section" titleLevel={2} />`}
    >
      <div className="space-y-6">
        <div className="space-y-2" data-testid="page-header-full">
          <h3 className="text-lg font-medium">Title, description and actions</h3>
          <div className="rounded-lg border p-4">
            <PageHeader
              title="Contracts"
              description="Manage the contracts you have deployed."
              actions={
                <>
                  <Button variant="outline">Import</Button>
                  <Button>Deploy</Button>
                </>
              }
            />
          </div>
        </div>

        <div className="space-y-2" data-testid="page-header-title-only">
          <h3 className="text-lg font-medium">Title only</h3>
          <div className="rounded-lg border p-4">
            <PageHeader title="Settings" titleLevel={2} />
          </div>
        </div>
      </div>
    </DemoSection>
  );
}
