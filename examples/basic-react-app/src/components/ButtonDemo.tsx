import { Download, Loader2, Mail, Plus, Send, Trash2 } from 'lucide-react';

import { Button } from '@openzeppelin/ui-components';

import { CodeBlock } from './CodeBlock';

/**
 * Demonstrates Button component variants, sizes, and states
 */
export function ButtonDemo(): React.ReactElement {
  return (
    <section className="space-y-8">
      <div>
        <h2 className="mb-4 text-2xl font-semibold tracking-tight">Button</h2>
        <p className="text-muted-foreground mb-6">
          A versatile button component with multiple variants and sizes.
        </p>
      </div>

      {/* Variants */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Variants</h3>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="default">Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
      </div>

      {/* Sizes */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Sizes</h3>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
          <Button size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* With Icons */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">With Icons</h3>
        <div className="flex flex-wrap items-center gap-3">
          <Button>
            <Mail className="mr-2 h-4 w-4" />
            Login with Email
          </Button>
          <Button variant="secondary">
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button variant="outline">
            <Send className="mr-2 h-4 w-4" />
            Send
          </Button>
          <Button variant="destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* States */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">States</h3>
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled>Disabled</Button>
          <Button disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </Button>
        </div>
      </div>

      {/* Code Example */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Usage</h3>
        <CodeBlock
          code={`import { Button } from '@openzeppelin/ui-components';

<Button variant="default">Click me</Button>
<Button variant="secondary" size="lg">Large Secondary</Button>
<Button variant="outline" disabled>Disabled</Button>`}
          language="tsx"
        />
      </div>
    </section>
  );
}
