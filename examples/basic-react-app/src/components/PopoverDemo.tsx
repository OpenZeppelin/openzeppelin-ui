import { Check, ChevronDown, Filter, Settings, Share2 } from 'lucide-react';
import { useState } from 'react';

import {
  Button,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@openzeppelin/ui-components';

import { DemoSection } from './DemoSection';

/**
 * Demonstrates Popover component variations for floating content panels.
 * Shows forms, filters, settings, and interactive content in popovers.
 */
export function PopoverDemo(): React.ReactElement {
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>(['ethereum', 'polygon']);

  const networks = [
    { id: 'ethereum', name: 'Ethereum', chainId: 1 },
    { id: 'polygon', name: 'Polygon', chainId: 137 },
    { id: 'arbitrum', name: 'Arbitrum', chainId: 42161 },
    { id: 'optimism', name: 'Optimism', chainId: 10 },
    { id: 'base', name: 'Base', chainId: 8453 },
  ];

  const toggleNetwork = (id: string) => {
    setSelectedNetworks((prev) =>
      prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]
    );
  };

  return (
    <DemoSection
      title="Popover"
      description="A floating content panel that appears when triggered. Useful for displaying forms, filters, settings, and additional options without navigating away from the current context."
      codeExample={`import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Button,
} from '@openzeppelin/ui-components';

// Basic popover
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline">Open Popover</Button>
  </PopoverTrigger>
  <PopoverContent>
    <div className="grid gap-4">
      <h4 className="font-medium">Popover Title</h4>
      <p className="text-sm text-muted-foreground">
        Your content here
      </p>
    </div>
  </PopoverContent>
</Popover>

// With alignment and width
<PopoverContent align="start" className="w-80">
  {/* Wide content */}
</PopoverContent>

// With side positioning
<PopoverContent side="right">
  {/* Content appears on right */}
</PopoverContent>`}
    >
      {/* Basic Popover */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Basic Popover</h3>
        <div className="flex gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">Click to Open</Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Popover Content</h4>
                  <p className="text-muted-foreground text-sm">
                    This is a basic popover with some content. Click outside or press Escape to
                    close.
                  </p>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Positioning */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Positioning</h3>
        <p className="text-muted-foreground text-sm">
          Popovers can be positioned on different sides and alignments:
        </p>
        <div className="flex flex-wrap gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                Top
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" className="w-48">
              <p className="text-sm">Content above trigger</p>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                Right
              </Button>
            </PopoverTrigger>
            <PopoverContent side="right" className="w-48">
              <p className="text-sm">Content to the right</p>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                Bottom
              </Button>
            </PopoverTrigger>
            <PopoverContent side="bottom" className="w-48">
              <p className="text-sm">Content below trigger</p>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                Left
              </Button>
            </PopoverTrigger>
            <PopoverContent side="left" className="w-48">
              <p className="text-sm">Content to the left</p>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Form Popover */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Form Popover</h3>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <Share2 className="mr-2 h-4 w-4" />
              Share Contract
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Share Contract</h4>
                <p className="text-muted-foreground text-sm">
                  Share this contract with another wallet address.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="share-address">Wallet Address</Label>
                <Input id="share-address" placeholder="0x..." />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="share-message">Message (optional)</Label>
                <Input id="share-message" placeholder="Add a note..." />
              </div>
              <Button className="w-full">Send Invite</Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Filter Popover */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Filter Popover</h3>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Networks
              {selectedNetworks.length > 0 && (
                <span className="bg-primary text-primary-foreground ml-2 rounded-full px-2 py-0.5 text-xs">
                  {selectedNetworks.length}
                </span>
              )}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Filter by Network</h4>
                <p className="text-muted-foreground text-sm">
                  Select networks to filter contracts.
                </p>
              </div>
              <div className="grid gap-2">
                {networks.map((network) => (
                  <button
                    key={network.id}
                    onClick={() => toggleNetwork(network.id)}
                    className="hover:bg-muted flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span>{network.name}</span>
                      <span className="text-muted-foreground text-xs">({network.chainId})</span>
                    </div>
                    {selectedNetworks.includes(network.id) && (
                      <Check className="text-primary h-4 w-4" />
                    )}
                  </button>
                ))}
              </div>
              <div className="flex justify-between border-t pt-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedNetworks([])}>
                  Clear All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedNetworks(networks.map((n) => n.id))}
                >
                  Select All
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Settings Popover */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Settings Popover</h3>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Transaction Settings</h4>
                <p className="text-muted-foreground text-sm">
                  Configure your transaction preferences.
                </p>
              </div>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="slippage">Slippage Tolerance</Label>
                    <span className="text-muted-foreground text-xs">Auto</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      0.1%
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      0.5%
                    </Button>
                    <Button variant="secondary" size="sm" className="flex-1">
                      1.0%
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="deadline">Transaction Deadline</Label>
                  <div className="flex items-center gap-2">
                    <Input id="deadline" type="number" defaultValue={30} className="w-20" />
                    <span className="text-muted-foreground text-sm">minutes</span>
                  </div>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Contract Info Popover */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Contract Info Popover</h3>
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">MyGovernanceToken</p>
              <p className="text-muted-foreground text-sm">ERC-20 Token</p>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  View Details
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">Contract Details</h4>
                  </div>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Address</span>
                      <span className="font-mono">0x742d...f44e</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Network</span>
                      <span>Ethereum Mainnet</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Supply</span>
                      <span>1,000,000 MGT</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Decimals</span>
                      <span>18</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Verified</span>
                      <span className="text-green-600">✓ Yes</span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    View on Etherscan
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </DemoSection>
  );
}
