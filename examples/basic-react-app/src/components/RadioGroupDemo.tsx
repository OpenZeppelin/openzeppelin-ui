import { useState } from 'react';

import { Label, RadioGroup, RadioGroupItem } from '@openzeppelin/ui-components';

import { DemoSection } from './DemoSection';

/**
 * Demonstrates RadioGroup component variations and usage patterns
 */
export function RadioGroupDemo(): React.ReactElement {
  const [plan, setPlan] = useState('starter');
  const [priority, setPriority] = useState('normal');
  const [network, setNetwork] = useState('');

  return (
    <DemoSection
      title="RadioGroup"
      description="A radio group component for selecting a single option from a list, built on Radix UI primitives with full keyboard navigation and accessibility support."
      codeExample={`import { RadioGroup, RadioGroupItem, Label } from '@openzeppelin/ui-components';

<RadioGroup value={value} onValueChange={setValue}>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="option1" id="option1" />
    <Label htmlFor="option1">Option 1</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="option2" id="option2" />
    <Label htmlFor="option2">Option 2</Label>
  </div>
</RadioGroup>`}
    >
      {/* Recommendation Note */}
      <div className="bg-muted/50 rounded-lg border p-4">
        <p className="text-sm">
          <strong>💡 For forms:</strong> Use{' '}
          <code className="bg-muted rounded px-1">RadioField</code> from{' '}
          <code className="bg-muted rounded px-1">@openzeppelin/ui-components/fields</code> which
          includes built-in label, validation, and React Hook Form integration. The primitive{' '}
          <code className="bg-muted rounded px-1">RadioGroup</code> shown here is for custom
          compositions.
        </p>
      </div>

      {/* Basic Usage */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Basic</h3>
        <RadioGroup value={plan} onValueChange={setPlan}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="starter" id="starter" />
            <Label htmlFor="starter">Starter</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="pro" id="pro" />
            <Label htmlFor="pro">Pro</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="enterprise" id="enterprise" />
            <Label htmlFor="enterprise">Enterprise</Label>
          </div>
        </RadioGroup>
        <p className="text-muted-foreground text-sm">
          Selected: <span className="text-foreground font-medium">{plan}</span>
        </p>
      </div>

      {/* Horizontal Layout */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Horizontal Layout</h3>
        <RadioGroup
          value={priority}
          onValueChange={setPriority}
          className="flex flex-row space-x-4 space-y-0"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="low" id="low" />
            <Label htmlFor="low">Low</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="normal" id="normal" />
            <Label htmlFor="normal">Normal</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="high" id="high" />
            <Label htmlFor="high">High</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="urgent" id="urgent" />
            <Label htmlFor="urgent">Urgent</Label>
          </div>
        </RadioGroup>
      </div>

      {/* With Descriptions */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">With Descriptions</h3>
        <RadioGroup defaultValue="public" className="space-y-3">
          <div className="flex items-start space-x-3">
            <RadioGroupItem value="public" id="public" className="mt-1" />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="public" className="font-medium">
                Public
              </Label>
              <p className="text-muted-foreground text-sm">
                Anyone can view this contract and its transactions.
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <RadioGroupItem value="private" id="private" className="mt-1" />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="private" className="font-medium">
                Private
              </Label>
              <p className="text-muted-foreground text-sm">
                Only you and collaborators can view this contract.
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <RadioGroupItem value="restricted" id="restricted" className="mt-1" />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="restricted" className="font-medium">
                Restricted
              </Label>
              <p className="text-muted-foreground text-sm">
                Requires approval to view. All access is logged.
              </p>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Disabled States */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Disabled States</h3>
        <RadioGroup defaultValue="enabled" className="space-y-2">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="enabled" id="enabled" />
            <Label htmlFor="enabled">Enabled option</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="disabled" id="disabled" disabled />
            <Label htmlFor="disabled" className="text-muted-foreground">
              Disabled option
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="another" id="another" />
            <Label htmlFor="another">Another enabled option</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Network Selection (Blockchain Use Case) */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Network Selection</h3>
        <div className="max-w-md">
          <p className="text-sm font-medium mb-3">Select Deployment Network</p>
          <RadioGroup value={network} onValueChange={setNetwork} className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="ethereum" id="net-ethereum" />
                <div>
                  <Label htmlFor="net-ethereum" className="font-medium">
                    Ethereum Mainnet
                  </Label>
                  <p className="text-muted-foreground text-xs">Chain ID: 1</p>
                </div>
              </div>
              <span className="text-muted-foreground text-sm">~$15 gas</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="polygon" id="net-polygon" />
                <div>
                  <Label htmlFor="net-polygon" className="font-medium">
                    Polygon
                  </Label>
                  <p className="text-muted-foreground text-xs">Chain ID: 137</p>
                </div>
              </div>
              <span className="text-muted-foreground text-sm">~$0.01 gas</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="arbitrum" id="net-arbitrum" />
                <div>
                  <Label htmlFor="net-arbitrum" className="font-medium">
                    Arbitrum One
                  </Label>
                  <p className="text-muted-foreground text-xs">Chain ID: 42161</p>
                </div>
              </div>
              <span className="text-muted-foreground text-sm">~$0.10 gas</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-dashed p-3 opacity-60">
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="sepolia" id="net-sepolia" />
                <div>
                  <Label htmlFor="net-sepolia" className="font-medium">
                    Sepolia (Testnet)
                  </Label>
                  <p className="text-muted-foreground text-xs">Chain ID: 11155111</p>
                </div>
              </div>
              <span className="text-green-600 text-sm">Free</span>
            </div>
          </RadioGroup>
          {network && (
            <p className="text-muted-foreground mt-3 text-sm">
              Deploying to:{' '}
              <span className="text-foreground font-medium capitalize">{network}</span>
            </p>
          )}
        </div>
      </div>

      {/* Card Selection Style */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Card Selection Style</h3>
        <RadioGroup defaultValue="monthly" className="grid grid-cols-2 gap-4 max-w-md">
          <Label
            htmlFor="card-monthly"
            className="border-input [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 p-4 transition-colors hover:bg-accent"
          >
            <RadioGroupItem value="monthly" id="card-monthly" className="sr-only" />
            <span className="text-2xl font-bold">$10</span>
            <span className="text-muted-foreground text-sm">Monthly</span>
          </Label>
          <Label
            htmlFor="card-yearly"
            className="border-input [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 p-4 transition-colors hover:bg-accent"
          >
            <RadioGroupItem value="yearly" id="card-yearly" className="sr-only" />
            <span className="text-2xl font-bold">$100</span>
            <span className="text-muted-foreground text-sm">Yearly (save 17%)</span>
          </Label>
        </RadioGroup>
      </div>
    </DemoSection>
  );
}
