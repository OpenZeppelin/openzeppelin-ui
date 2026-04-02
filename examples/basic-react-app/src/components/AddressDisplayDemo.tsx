import { AddressDisplay } from '@openzeppelin/ui-components';

import { useEcosystem } from '../context';
import { DemoSection } from './DemoSection';
import { EcosystemIndicator } from './EcosystemIndicator';

/**
 * Demonstrates AddressDisplay component variations for blockchain address rendering
 * Uses real sample addresses from the active ecosystem runtime.
 */
export function AddressDisplayDemo(): React.ReactElement {
  const { capabilities, sampleAddresses, metadata, isLoading } = useEcosystem();

  // Show loading state while ecosystem data is being loaded
  if (isLoading || !capabilities || !metadata) {
    return (
      <DemoSection title="AddressDisplay" description="Loading...">
        <div className="text-muted-foreground">Loading runtime...</div>
      </DemoSection>
    );
  }

  // Get explorer URL using the explorer capability.
  const getExplorerUrl = (address: string): string | undefined => {
    try {
      return capabilities.getExplorerUrl(address) ?? undefined;
    } catch {
      return undefined;
    }
  };

  return (
    <DemoSection
      title="AddressDisplay"
      description="Displays blockchain addresses with optional truncation, copy functionality, and explorer links. Ideal for showing wallet addresses, contract addresses, and transaction hashes."
      codeExample={`import { AddressDisplay } from '@openzeppelin/ui-components';
import { useEcosystem } from './context';

// Get explorer capabilities from context
const { capabilities, sampleAddresses } = useEcosystem();

// Basic truncated display
<AddressDisplay address={sampleAddresses.wallet} />

// Reveal full address on hover
<AddressDisplay address={sampleAddresses.wallet} untruncateOnHover />

// Tooltip shows full address on hover
<AddressDisplay address={sampleAddresses.wallet} showTooltip />

// With copy button (shown on hover)
<AddressDisplay
  address={sampleAddresses.wallet}
  showTooltip
  showCopyButton
  showCopyButtonOnHover
/>

// Inline variant — no chip background
<AddressDisplay address={sampleAddresses.wallet} variant="inline" showTooltip />

// With explorer link (using the explorer capability)
<AddressDisplay
  address={sampleAddresses.contract}
  showCopyButton
  explorerUrl={capabilities.getExplorerUrl(address)}
/>`}
    >
      <EcosystemIndicator
        description="Sample addresses and explorer URLs are ecosystem-specific."
        className="mb-6"
      />

      {/* Basic Usage */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Basic</h3>
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Default (truncated)</p>
            <AddressDisplay address={sampleAddresses.wallet} />
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Full address (no truncation)</p>
            <AddressDisplay address={sampleAddresses.wallet} truncate={false} />
          </div>
        </div>
      </div>

      {/* Truncation Options */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Truncation Options</h3>
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Default (6 start, 4 end)</p>
            <AddressDisplay address={sampleAddresses.wallet} />
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Custom (4 start, 4 end)</p>
            <AddressDisplay address={sampleAddresses.wallet} startChars={4} endChars={4} />
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Extended (10 start, 6 end)</p>
            <AddressDisplay address={sampleAddresses.wallet} startChars={10} endChars={6} />
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">
              Full address on hover (
              <code className="bg-muted rounded px-1">untruncateOnHover</code>)
            </p>
            <p className="text-muted-foreground text-xs">
              Hover-capable devices: pointer over the chip shows the full address. Touch-first
              devices: tap the chip to expand, tap again to collapse.
            </p>
            <AddressDisplay address={sampleAddresses.wallet} untruncateOnHover />
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">
              Tooltip on hover (<code className="bg-muted rounded px-1">showTooltip</code>)
            </p>
            <p className="text-muted-foreground text-xs">
              Hover the chip to see the full address in a tooltip. Address stays truncated.
            </p>
            <AddressDisplay address={sampleAddresses.wallet} showTooltip />
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">
              Tooltip + copy on hover — compact but discoverable
            </p>
            <AddressDisplay
              address={sampleAddresses.wallet}
              showTooltip
              showCopyButton
              showCopyButtonOnHover
            />
          </div>
        </div>
      </div>

      {/* Variants */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Variants</h3>
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">
              Chip (default) — slate background with padding
            </p>
            <AddressDisplay address={sampleAddresses.wallet} showCopyButton showTooltip />
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">
              Inline — no background, padding, or border-radius
            </p>
            <p className="text-muted-foreground text-xs">
              Use when the parent already provides container styling (e.g. wallet bars, navbars).
            </p>
            <AddressDisplay
              address={sampleAddresses.wallet}
              variant="inline"
              showCopyButton
              showCopyButtonOnHover
              showTooltip
            />
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Inline inside a styled container</p>
            <div className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
              <span className="text-muted-foreground">Wallet:</span>
              <AddressDisplay
                address={sampleAddresses.wallet}
                variant="inline"
                showCopyButton
                showCopyButtonOnHover
                showTooltip
              />
            </div>
          </div>
        </div>
      </div>

      {/* Copy Button */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Copy Button</h3>
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Always visible</p>
            <AddressDisplay address={sampleAddresses.wallet} showCopyButton />
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Show on hover only</p>
            <AddressDisplay address={sampleAddresses.wallet} showCopyButton showCopyButtonOnHover />
          </div>
        </div>
      </div>

      {/* Explorer Link */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Explorer Link</h3>
        <p className="text-muted-foreground text-sm">
          Explorer URLs are generated using{' '}
          <code className="bg-muted rounded px-1">capabilities.getExplorerUrl()</code>
        </p>
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Wallet address with explorer</p>
            <AddressDisplay
              address={sampleAddresses.wallet}
              showCopyButton
              explorerUrl={getExplorerUrl(sampleAddresses.wallet)}
            />
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Contract address with explorer</p>
            <AddressDisplay
              address={sampleAddresses.contract}
              showCopyButton
              explorerUrl={getExplorerUrl(sampleAddresses.contract)}
            />
          </div>
        </div>
      </div>

      {/* Use Cases */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Common Use Cases</h3>
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Wallet Address</p>
            <div className="bg-muted/30 flex items-center gap-3 rounded-lg p-3">
              <span className="text-muted-foreground text-sm">Connected:</span>
              <AddressDisplay address={sampleAddresses.wallet} showCopyButton />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Contract Address</p>
            <div className="bg-muted/30 flex items-center gap-3 rounded-lg p-3">
              <span className="text-muted-foreground text-sm">Contract:</span>
              <AddressDisplay
                address={sampleAddresses.contract}
                showCopyButton
                explorerUrl={getExplorerUrl(sampleAddresses.contract)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* In Context */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">In Context</h3>
        <div className="rounded-lg border p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Transaction Details</span>
              <span className="text-muted-foreground text-xs">2 mins ago</span>
            </div>
            <div className="grid gap-2 text-sm">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <span className="text-muted-foreground shrink-0">From</span>
                <AddressDisplay
                  address={sampleAddresses.wallet}
                  showCopyButton
                  showCopyButtonOnHover
                  showTooltip
                  className="min-w-0 shrink"
                />
              </div>
              <div className="flex min-w-0 items-center justify-between gap-2">
                <span className="text-muted-foreground shrink-0">To</span>
                <AddressDisplay
                  address={sampleAddresses.contract}
                  showCopyButton
                  showCopyButtonOnHover
                  showTooltip
                  className="min-w-0 shrink"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-mono">1.5 {metadata.name === 'EVM' ? 'ETH' : 'XLM'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DemoSection>
  );
}
