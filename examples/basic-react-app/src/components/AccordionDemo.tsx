import { HelpCircle, Info, Shield } from 'lucide-react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@openzeppelin/ui-components';

import { DemoSection } from './DemoSection';

/**
 * Demonstrates Accordion component for collapsible content sections.
 * Shows default and card variants with single and multiple item selection.
 */
export function AccordionDemo(): React.ReactElement {
  return (
    <DemoSection
      title="Accordion"
      description="A vertically stacked set of interactive headings that reveal or hide associated content. Supports default and card variants with single or multiple expansion."
      codeExample={`import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@openzeppelin/ui-components';

// Single item accordion (default)
<Accordion type="single" collapsible>
  <AccordionItem value="item-1">
    <AccordionTrigger>Section Title</AccordionTrigger>
    <AccordionContent>
      Section content here.
    </AccordionContent>
  </AccordionItem>
</Accordion>

// Multiple items accordion
<Accordion type="multiple">
  <AccordionItem value="item-1">
    <AccordionTrigger>First Item</AccordionTrigger>
    <AccordionContent>First content.</AccordionContent>
  </AccordionItem>
  <AccordionItem value="item-2">
    <AccordionTrigger>Second Item</AccordionTrigger>
    <AccordionContent>Second content.</AccordionContent>
  </AccordionItem>
</Accordion>

// Card variant
<Accordion type="single" collapsible variant="card">
  <AccordionItem value="item-1">
    <AccordionTrigger>Card Style Section</AccordionTrigger>
    <AccordionContent>
      Content in a card-styled container.
    </AccordionContent>
  </AccordionItem>
</Accordion>`}
    >
      {/* Default Variant - Single */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Default Variant (Single Selection)</h3>
        <Accordion type="single" collapsible className="w-full max-w-lg">
          <AccordionItem value="item-1">
            <AccordionTrigger>What is OpenZeppelin UI?</AccordionTrigger>
            <AccordionContent>
              OpenZeppelin UI is a comprehensive component library designed for building
              blockchain-focused web applications. It provides pre-built, accessible components that
              follow best practices for Web3 interfaces.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>How do I install it?</AccordionTrigger>
            <AccordionContent>
              You can install OpenZeppelin UI packages using npm or yarn. For example:{' '}
              <code className="bg-muted rounded px-1">npm install @openzeppelin/ui-components</code>
              . Check the documentation for the full list of available packages.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger>Is it accessible?</AccordionTrigger>
            <AccordionContent>
              Yes! All components are built with accessibility in mind. They follow WAI-ARIA
              guidelines and support keyboard navigation. The accordion component specifically
              supports arrow key navigation between items.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Default Variant - Multiple */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Multiple Selection</h3>
        <Accordion type="multiple" className="w-full max-w-lg">
          <AccordionItem value="tokens">
            <AccordionTrigger>Token Standards</AccordionTrigger>
            <AccordionContent>
              <ul className="list-inside list-disc space-y-1 text-sm">
                <li>ERC-20: Fungible tokens (currencies, utility tokens)</li>
                <li>ERC-721: Non-fungible tokens (NFTs, unique assets)</li>
                <li>ERC-1155: Multi-token standard (gaming items, mixed collections)</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="access">
            <AccordionTrigger>Access Control</AccordionTrigger>
            <AccordionContent>
              <ul className="list-inside list-disc space-y-1 text-sm">
                <li>Ownable: Simple single-owner access control</li>
                <li>AccessControl: Role-based access with multiple roles</li>
                <li>AccessControlEnumerable: Enumerable roles for off-chain use</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="upgrades">
            <AccordionTrigger>Upgradability Patterns</AccordionTrigger>
            <AccordionContent>
              <ul className="list-inside list-disc space-y-1 text-sm">
                <li>Transparent Proxy: Admin-controlled upgrades</li>
                <li>UUPS: Self-upgrading contracts</li>
                <li>Beacon: Shared implementation for multiple proxies</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <p className="text-muted-foreground text-sm">
          Multiple items can be expanded simultaneously.
        </p>
      </div>

      {/* Card Variant */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Card Variant</h3>
        <Accordion type="single" collapsible variant="card" className="w-full max-w-lg">
          <AccordionItem value="security">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Shield className="text-primary h-4 w-4" />
                Security Best Practices
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 text-sm">
                <p>Follow these guidelines to secure your smart contracts:</p>
                <ul className="list-inside list-disc space-y-1">
                  <li>Always use the latest Solidity compiler version</li>
                  <li>Implement proper access controls</li>
                  <li>Use OpenZeppelin&apos;s battle-tested contracts</li>
                  <li>Get your contracts audited before mainnet deployment</li>
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="testing">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Info className="text-primary h-4 w-4" />
                Testing Guidelines
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 text-sm">
                <p>Comprehensive testing is essential for smart contract security:</p>
                <ul className="list-inside list-disc space-y-1">
                  <li>Write unit tests for all functions</li>
                  <li>Test edge cases and boundary conditions</li>
                  <li>Use fuzzing to find unexpected behaviors</li>
                  <li>Test on testnets before mainnet deployment</li>
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="deployment">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <HelpCircle className="text-primary h-4 w-4" />
                Deployment Checklist
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 text-sm">
                <p>Before deploying to mainnet, ensure you have:</p>
                <ul className="list-inside list-disc space-y-1">
                  <li>Completed all testing and audits</li>
                  <li>Verified contract source code</li>
                  <li>Set up monitoring and alerting</li>
                  <li>Prepared incident response plan</li>
                  <li>Documented admin key management procedures</li>
                </ul>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Blockchain FAQ */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Blockchain FAQ</h3>
        <Accordion type="single" collapsible className="w-full max-w-lg">
          <AccordionItem value="gas">
            <AccordionTrigger>What is gas and how does it work?</AccordionTrigger>
            <AccordionContent>
              <p className="text-sm">
                Gas is a unit that measures the computational effort required to execute operations
                on the Ethereum network. Each operation has a gas cost, and users pay gas fees to
                incentivize miners/validators to include their transactions. Gas price fluctuates
                based on network demand.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="nonce">
            <AccordionTrigger>What is a transaction nonce?</AccordionTrigger>
            <AccordionContent>
              <p className="text-sm">
                A nonce (number used once) is a counter that tracks the number of transactions sent
                from an address. It ensures transactions are processed in order and prevents replay
                attacks. Each transaction from an address must use the next sequential nonce.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="confirmations">
            <AccordionTrigger>How many confirmations are needed?</AccordionTrigger>
            <AccordionContent>
              <p className="text-sm">
                The number of confirmations needed depends on the value and risk tolerance. For
                small transactions, 1-3 confirmations may suffice. For larger values, waiting for
                12+ confirmations is recommended. Exchanges typically require 20-50 confirmations
                for deposits.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="reverts">
            <AccordionTrigger>Why do transactions revert?</AccordionTrigger>
            <AccordionContent>
              <p className="text-sm">
                Transactions can revert for various reasons: insufficient balance, failed require
                statements, out-of-gas errors, or invalid function parameters. When a transaction
                reverts, the state changes are rolled back, but gas fees are still consumed.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Default Value */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">With Default Open</h3>
        <Accordion
          type="single"
          collapsible
          defaultValue="default-open"
          className="w-full max-w-lg"
        >
          <AccordionItem value="default-open">
            <AccordionTrigger>This section is open by default</AccordionTrigger>
            <AccordionContent>
              You can set a default open section using the{' '}
              <code className="bg-muted rounded px-1">defaultValue</code> prop. This is useful when
              you want to highlight important information or guide users to specific content.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="closed">
            <AccordionTrigger>This section starts closed</AccordionTrigger>
            <AccordionContent>
              Other sections remain closed until the user interacts with them.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Card Variant Multiple */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Card Variant (Multiple)</h3>
        <Accordion type="multiple" variant="card" className="w-full max-w-lg">
          <AccordionItem value="read">
            <AccordionTrigger>Read Functions</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded border p-2 text-sm">
                  <code>balanceOf(address)</code>
                  <span className="text-muted-foreground">view</span>
                </div>
                <div className="flex items-center justify-between rounded border p-2 text-sm">
                  <code>totalSupply()</code>
                  <span className="text-muted-foreground">view</span>
                </div>
                <div className="flex items-center justify-between rounded border p-2 text-sm">
                  <code>allowance(owner, spender)</code>
                  <span className="text-muted-foreground">view</span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="write">
            <AccordionTrigger>Write Functions</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded border p-2 text-sm">
                  <code>transfer(to, amount)</code>
                  <span className="text-muted-foreground">nonpayable</span>
                </div>
                <div className="flex items-center justify-between rounded border p-2 text-sm">
                  <code>approve(spender, amount)</code>
                  <span className="text-muted-foreground">nonpayable</span>
                </div>
                <div className="flex items-center justify-between rounded border p-2 text-sm">
                  <code>transferFrom(from, to, amount)</code>
                  <span className="text-muted-foreground">nonpayable</span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="events">
            <AccordionTrigger>Events</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded border p-2 text-sm">
                  <code>Transfer(from, to, value)</code>
                  <span className="text-muted-foreground">indexed</span>
                </div>
                <div className="flex items-center justify-between rounded border p-2 text-sm">
                  <code>Approval(owner, spender, value)</code>
                  <span className="text-muted-foreground">indexed</span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </DemoSection>
  );
}
