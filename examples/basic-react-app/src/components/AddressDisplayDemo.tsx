import { AddressDisplay } from '@openzeppelin/ui-components';

import { DemoSection } from './DemoSection';

/**
 * Sample Ethereum addresses for demonstration
 */
const SAMPLE_ADDRESSES = {
  wallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f1D3F4',
  contract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  zero: '0x0000000000000000000000000000000000000000',
  short: '0xAbCdEf0123456789',
} as const;

/**
 * Demonstrates AddressDisplay component variations for blockchain address rendering
 */
export function AddressDisplayDemo(): React.ReactElement {
  return (
    <DemoSection
      title="AddressDisplay"
      description="Displays blockchain addresses with optional truncation, copy functionality, and explorer links. Ideal for showing wallet addresses, contract addresses, and transaction hashes."
      codeExample={`import { AddressDisplay } from '@openzeppelin/ui-components';

// Basic truncated display
<AddressDisplay address="0x742d35Cc6634C0532925a3b844Bc9e7595f1D3F4" />

// With copy button
<AddressDisplay
  address="0x742d35Cc6634C0532925a3b844Bc9e7595f1D3F4"
  showCopyButton
/>

// With explorer link
<AddressDisplay
  address="0x742d35Cc6634C0532925a3b844Bc9e7595f1D3F4"
  showCopyButton
  explorerUrl="https://etherscan.io/address/0x742d35..."
/>`}
    >
      {/* Basic Usage */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Basic</h3>
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Default (truncated)</p>
            <AddressDisplay address={SAMPLE_ADDRESSES.wallet} />
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Full address (no truncation)</p>
            <AddressDisplay address={SAMPLE_ADDRESSES.wallet} truncate={false} />
          </div>
        </div>
      </div>

      {/* Truncation Options */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Truncation Options</h3>
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Default (6 start, 4 end)</p>
            <AddressDisplay address={SAMPLE_ADDRESSES.wallet} />
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Custom (4 start, 4 end)</p>
            <AddressDisplay address={SAMPLE_ADDRESSES.wallet} startChars={4} endChars={4} />
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Extended (10 start, 6 end)</p>
            <AddressDisplay address={SAMPLE_ADDRESSES.wallet} startChars={10} endChars={6} />
          </div>
        </div>
      </div>

      {/* Copy Button */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Copy Button</h3>
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Always visible</p>
            <AddressDisplay address={SAMPLE_ADDRESSES.wallet} showCopyButton />
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Show on hover only</p>
            <AddressDisplay
              address={SAMPLE_ADDRESSES.wallet}
              showCopyButton
              showCopyButtonOnHover
            />
          </div>
        </div>
      </div>

      {/* Explorer Link */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Explorer Link</h3>
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">With Etherscan link</p>
            <AddressDisplay
              address={SAMPLE_ADDRESSES.contract}
              showCopyButton
              explorerUrl={`https://etherscan.io/address/${SAMPLE_ADDRESSES.contract}`}
            />
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">With Polygon explorer</p>
            <AddressDisplay
              address={SAMPLE_ADDRESSES.wallet}
              showCopyButton
              explorerUrl={`https://polygonscan.com/address/${SAMPLE_ADDRESSES.wallet}`}
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
              <AddressDisplay address={SAMPLE_ADDRESSES.wallet} showCopyButton />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Contract Address (USDT)</p>
            <div className="bg-muted/30 flex items-center gap-3 rounded-lg p-3">
              <span className="text-muted-foreground text-sm">Contract:</span>
              <AddressDisplay
                address={SAMPLE_ADDRESSES.contract}
                showCopyButton
                explorerUrl={`https://etherscan.io/address/${SAMPLE_ADDRESSES.contract}`}
              />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Zero Address</p>
            <div className="bg-muted/30 flex items-center gap-3 rounded-lg p-3">
              <span className="text-muted-foreground text-sm">Burn Address:</span>
              <AddressDisplay address={SAMPLE_ADDRESSES.zero} showCopyButton />
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
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">From</span>
                <AddressDisplay
                  address={SAMPLE_ADDRESSES.wallet}
                  showCopyButton
                  showCopyButtonOnHover
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">To</span>
                <AddressDisplay
                  address={SAMPLE_ADDRESSES.contract}
                  showCopyButton
                  showCopyButtonOnHover
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-mono">1.5 ETH</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DemoSection>
  );
}
