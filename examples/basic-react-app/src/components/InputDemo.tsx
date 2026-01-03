import { Eye, EyeOff, Search } from 'lucide-react';
import { useState } from 'react';

import { Input, Label } from '@openzeppelin/ui-components';

/**
 * Demonstrates Input component variations and usage patterns
 */
export function InputDemo(): React.ReactElement {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <section className="space-y-8">
      <div>
        <h2 className="mb-4 text-2xl font-semibold tracking-tight">Input</h2>
        <p className="text-muted-foreground mb-6">
          A text input component with support for labels, icons, and validation states.
        </p>
      </div>

      {/* Basic Inputs */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Basic</h3>
        <div className="grid max-w-md gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="name@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
              />
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Input Types */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Input Types</h3>
        <div className="grid max-w-md gap-4">
          <div className="space-y-2">
            <Label htmlFor="text">Text</Label>
            <Input id="text" type="text" placeholder="Enter text" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="number">Number</Label>
            <Input id="number" type="number" placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" />
          </div>
        </div>
      </div>

      {/* With Search Icon */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">With Icon</h3>
        <div className="relative max-w-md">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input type="search" placeholder="Search..." className="pl-10" />
        </div>
      </div>

      {/* States */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">States</h3>
        <div className="grid max-w-md gap-4">
          <div className="space-y-2">
            <Label htmlFor="disabled">Disabled</Label>
            <Input id="disabled" disabled placeholder="Disabled input" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="readonly">Read Only</Label>
            <Input id="readonly" readOnly defaultValue="Read only value" />
          </div>
        </div>
      </div>

      {/* Code Example */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Usage</h3>
        <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
          <code>{`import { Input, Label } from '@openzeppelin/ui-components';

<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" placeholder="name@example.com" />
</div>`}</code>
        </pre>
      </div>
    </section>
  );
}
