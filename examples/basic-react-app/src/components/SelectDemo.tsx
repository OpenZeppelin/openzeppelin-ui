import { useState } from 'react';

import {
  Label,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@openzeppelin/ui-components';

import { CodeBlock } from './CodeBlock';

/**
 * Demonstrates Select component usage with various configurations
 */
export function SelectDemo(): React.ReactElement {
  const [framework, setFramework] = useState<string>('');
  const [network, setNetwork] = useState<string>('');

  return (
    <section className="space-y-8">
      <div>
        <h2 className="mb-4 text-2xl font-semibold tracking-tight">Select</h2>
        <p className="text-muted-foreground mb-6">
          A dropdown select component built on Radix UI primitives.
        </p>
      </div>

      {/* Basic Select */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Basic</h3>
        <div className="max-w-xs space-y-2">
          <Label htmlFor="framework">Framework</Label>
          <Select value={framework} onValueChange={setFramework}>
            <SelectTrigger id="framework">
              <SelectValue placeholder="Select a framework" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="react">React</SelectItem>
              <SelectItem value="vue">Vue</SelectItem>
              <SelectItem value="angular">Angular</SelectItem>
              <SelectItem value="svelte">Svelte</SelectItem>
              <SelectItem value="solid">Solid</SelectItem>
            </SelectContent>
          </Select>
          {framework && (
            <p className="text-muted-foreground text-sm">
              Selected: <span className="text-foreground font-medium">{framework}</span>
            </p>
          )}
        </div>
      </div>

      {/* Grouped Select */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">With Groups</h3>
        <div className="max-w-xs space-y-2">
          <Label htmlFor="network">Blockchain Network</Label>
          <Select value={network} onValueChange={setNetwork}>
            <SelectTrigger id="network">
              <SelectValue placeholder="Select a network" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>EVM Networks</SelectLabel>
                <SelectItem value="ethereum">Ethereum Mainnet</SelectItem>
                <SelectItem value="polygon">Polygon</SelectItem>
                <SelectItem value="arbitrum">Arbitrum One</SelectItem>
                <SelectItem value="optimism">Optimism</SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Non-EVM Networks</SelectLabel>
                <SelectItem value="stellar">Stellar</SelectItem>
                <SelectItem value="solana">Solana</SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Testnets</SelectLabel>
                <SelectItem value="sepolia">Sepolia</SelectItem>
                <SelectItem value="goerli">Goerli</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Disabled State */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Disabled</h3>
        <div className="max-w-xs">
          <Select disabled>
            <SelectTrigger>
              <SelectValue placeholder="Disabled select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="option1">Option 1</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Code Example */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Usage</h3>
        <CodeBlock
          code={`import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openzeppelin/ui-components';

<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>`}
          language="tsx"
        />
      </div>
    </section>
  );
}
