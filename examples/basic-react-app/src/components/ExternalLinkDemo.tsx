import { ExternalLink } from '@openzeppelin/ui-components';

import { DemoSection } from './DemoSection';

/**
 * Demonstrates ExternalLink component for linking to external resources
 */
export function ExternalLinkDemo(): React.ReactElement {
  return (
    <DemoSection
      title="ExternalLink"
      description="A styled anchor component for linking to external resources. Automatically adds target='_blank' and rel='noopener noreferrer' for security, and includes a visual indicator icon."
      codeExample={`import { ExternalLink } from '@openzeppelin/ui-components';

// Basic usage
<ExternalLink href="https://docs.openzeppelin.com">
  OpenZeppelin Docs
</ExternalLink>

// In context
<p>
  View the <ExternalLink href="https://etherscan.io">
    transaction on Etherscan
  </ExternalLink>
</p>`}
    >
      {/* Basic Usage */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Basic</h3>
        <div className="space-y-3">
          <ExternalLink href="https://docs.openzeppelin.com">
            OpenZeppelin Documentation
          </ExternalLink>
        </div>
      </div>

      {/* Various Links */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Common External Links</h3>
        <div className="space-y-3">
          <div>
            <ExternalLink href="https://etherscan.io">Etherscan</ExternalLink>
          </div>
          <div>
            <ExternalLink href="https://polygonscan.com">PolygonScan</ExternalLink>
          </div>
          <div>
            <ExternalLink href="https://arbiscan.io">Arbiscan</ExternalLink>
          </div>
          <div>
            <ExternalLink href="https://github.com/OpenZeppelin/openzeppelin-contracts">
              OpenZeppelin Contracts (GitHub)
            </ExternalLink>
          </div>
        </div>
      </div>

      {/* In Text Context */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Inline with Text</h3>
        <div className="space-y-4 text-sm">
          <p>
            Learn more about smart contract security in the{' '}
            <ExternalLink href="https://docs.openzeppelin.com/contracts">
              OpenZeppelin Contracts documentation
            </ExternalLink>
            .
          </p>
          <p>
            View your transaction on{' '}
            <ExternalLink href="https://etherscan.io/tx/0x123456789abcdef">Etherscan</ExternalLink>{' '}
            or check the{' '}
            <ExternalLink href="https://eth.blockscout.com">Blockscout explorer</ExternalLink> for
            additional details.
          </p>
          <p>
            The smart contract implements the{' '}
            <ExternalLink href="https://eips.ethereum.org/EIPS/eip-20">
              ERC-20 standard
            </ExternalLink>{' '}
            for fungible tokens.
          </p>
        </div>
      </div>

      {/* Blockchain Use Cases */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Blockchain Use Cases</h3>
        <div className="rounded-lg border p-4">
          <h4 className="mb-4 font-medium">Transaction Details</h4>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Transaction Hash</dt>
              <dd>
                <ExternalLink href="https://etherscan.io/tx/0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef">
                  0x1234...cdef
                </ExternalLink>
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Block</dt>
              <dd>
                <ExternalLink href="https://etherscan.io/block/18500000">18,500,000</ExternalLink>
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Contract</dt>
              <dd>
                <ExternalLink href="https://etherscan.io/address/0xdAC17F958D2ee523a2206206994597C13D831ec7">
                  0xdAC1...ec7 (USDT)
                </ExternalLink>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* In Cards */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">In Cards</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <h4 className="mb-2 font-medium">Documentation</h4>
            <p className="text-muted-foreground mb-3 text-sm">
              Get started with our comprehensive guides.
            </p>
            <ExternalLink href="https://docs.openzeppelin.com">Read the docs</ExternalLink>
          </div>
          <div className="rounded-lg border p-4">
            <h4 className="mb-2 font-medium">Smart Contract Wizard</h4>
            <p className="text-muted-foreground mb-3 text-sm">
              Build secure contracts with our interactive tool.
            </p>
            <ExternalLink href="https://wizard.openzeppelin.com">Open Wizard</ExternalLink>
          </div>
          <div className="rounded-lg border p-4">
            <h4 className="mb-2 font-medium">GitHub Repository</h4>
            <p className="text-muted-foreground mb-3 text-sm">View source code and contribute.</p>
            <ExternalLink href="https://github.com/OpenZeppelin">View on GitHub</ExternalLink>
          </div>
          <div className="rounded-lg border p-4">
            <h4 className="mb-2 font-medium">Community Forum</h4>
            <p className="text-muted-foreground mb-3 text-sm">Ask questions and share knowledge.</p>
            <ExternalLink href="https://forum.openzeppelin.com">Join the forum</ExternalLink>
          </div>
        </div>
      </div>

      {/* Footer Example */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">In Footer</h3>
        <div className="bg-muted/30 rounded-lg p-4">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <ExternalLink href="https://openzeppelin.com">Website</ExternalLink>
            <ExternalLink href="https://docs.openzeppelin.com">Docs</ExternalLink>
            <ExternalLink href="https://github.com/OpenZeppelin">GitHub</ExternalLink>
            <ExternalLink href="https://twitter.com/OpenZeppelin">Twitter</ExternalLink>
            <ExternalLink href="https://discord.gg/openzeppelin">Discord</ExternalLink>
          </div>
        </div>
      </div>
    </DemoSection>
  );
}
