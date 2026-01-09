import { Copy, HelpCircle, Info } from 'lucide-react';
import { useState } from 'react';

import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@openzeppelin/ui-components';

import { DemoSection } from './DemoSection';

/**
 * Demonstrates Tooltip component variations for providing contextual information.
 * Shows different positions, triggers, and content types.
 */
export function TooltipDemo(): React.ReactElement {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText('0x742d35Cc6634C0532925a3b844Bc454e4438f44e');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DemoSection
      title="Tooltip"
      description="A tooltip component for displaying additional information on hover. Supports multiple positions and custom content."
      codeExample={`import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@openzeppelin/ui-components';

// Basic tooltip
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button>Hover me</Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>This is a tooltip</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>

// With side positioning
<TooltipContent side="right">
  <p>Appears on the right</p>
</TooltipContent>

// With delay
<TooltipProvider delayDuration={300}>
  <Tooltip>
    {/* Tooltip appears after 300ms */}
  </Tooltip>
</TooltipProvider>`}
    >
      {/* Basic Tooltips */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Basic Tooltips</h3>
        <div className="flex flex-wrap gap-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Hover for Info</Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>This is a basic tooltip</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="secondary">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Help
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Click for help documentation</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Positioning */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Positioning</h3>
        <p className="text-muted-foreground text-sm">
          Tooltips can appear on different sides of the trigger element:
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 py-8">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm">
                  Top
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Tooltip on top</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm">
                  Right
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Tooltip on right</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm">
                  Bottom
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Tooltip on bottom</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm">
                  Left
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Tooltip on left</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Icon Tooltips */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Icon Tooltips</h3>
        <p className="text-muted-foreground text-sm">
          Tooltips are commonly used with icon buttons to provide context:
        </p>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View information</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleCopy}>
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{copied ? 'Copied!' : 'Copy to clipboard'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* With Delay */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">With Delay</h3>
        <p className="text-muted-foreground text-sm">
          Configure delay duration before the tooltip appears:
        </p>
        <div className="flex gap-4">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm">
                  No delay
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Appears immediately</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={500}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm">
                  500ms delay
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Appears after half a second</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={1000}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm">
                  1s delay
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Appears after one second</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Blockchain Use Cases */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Blockchain Use Cases</h3>
        <div className="bg-muted/50 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Contract Address</span>
            <div className="flex items-center gap-2">
              <code className="text-sm font-mono">0x742d...f44e</code>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{copied ? 'Copied!' : 'Copy full address'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">Gas Estimate</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p>
                      Gas estimate is calculated based on current network conditions. Actual gas
                      used may vary.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <span className="text-sm">~21,000 gas</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">Slippage Tolerance</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p>
                      Maximum price change you&apos;re willing to accept. Higher slippage increases
                      the chance of transaction success but may result in a less favorable rate.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <span className="text-sm">0.5%</span>
          </div>
        </div>
      </div>

      {/* Inline Text Tooltips */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Inline Text</h3>
        <p className="text-muted-foreground text-sm">
          Tooltips can be used to explain terms inline within text:
        </p>
        <p className="text-sm leading-relaxed">
          When interacting with smart contracts, you may need to pay{' '}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="border-b border-dashed border-muted-foreground cursor-help font-medium">
                  gas fees
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Gas fees are payments made by users to compensate for the computing energy
                  required to process transactions on the blockchain.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>{' '}
          to execute transactions. The{' '}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="border-b border-dashed border-muted-foreground cursor-help font-medium">
                  nonce
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  A nonce is a number that can only be used once. In Ethereum, it&apos;s used to
                  prevent transaction replay attacks and ensure proper transaction ordering.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>{' '}
          is automatically managed by your wallet.
        </p>
      </div>
    </DemoSection>
  );
}
