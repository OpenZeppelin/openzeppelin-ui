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

      {/* Recommendation Note */}
      <div className="bg-muted/50 rounded-lg border p-4">
        <p className="text-sm">
          <strong>💡 For forms:</strong> Use{' '}
          <code className="bg-muted rounded px-1">TextField</code> from{' '}
          <code className="bg-muted rounded px-1">@openzeppelin/ui-components/fields</code> which
          includes built-in label, validation, and React Hook Form integration. The primitive{' '}
          <code className="bg-muted rounded px-1">Input</code> shown here is for custom
          compositions.
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

      {/* Error States */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Error States</h3>
        <div className="grid max-w-md gap-6">
          <div className="space-y-2">
            <Label htmlFor="error-required" className="text-destructive">
              Email *
            </Label>
            <Input
              id="error-required"
              type="email"
              placeholder="name@example.com"
              aria-invalid="true"
              className="border-destructive focus-visible:ring-destructive"
            />
            <p className="text-destructive text-sm">Email is required</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="error-format">Wallet Address</Label>
            <Input
              id="error-format"
              defaultValue="0xinvalid"
              aria-invalid="true"
              className="border-destructive focus-visible:ring-destructive"
            />
            <p className="text-destructive text-sm">
              Invalid address format. Must be a valid Ethereum address.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="error-custom">Amount (ETH)</Label>
            <Input
              id="error-custom"
              type="number"
              defaultValue="1000"
              aria-invalid="true"
              className="border-destructive focus-visible:ring-destructive"
            />
            <p className="text-destructive text-sm">Insufficient balance. Available: 0.5 ETH</p>
          </div>
        </div>
      </div>

      {/* Success/Valid State */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Valid State</h3>
        <div className="max-w-md space-y-2">
          <Label htmlFor="valid-address">Wallet Address</Label>
          <Input
            id="valid-address"
            defaultValue="0x742d35Cc6634C0532925a3b844Bc9e7595f2bD54"
            className="border-green-500 focus-visible:ring-green-500"
          />
          <p className="text-sm text-green-600">Valid Ethereum address ✓</p>
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
