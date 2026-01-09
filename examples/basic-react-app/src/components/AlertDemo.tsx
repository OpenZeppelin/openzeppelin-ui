import { AlertCircle, CheckCircle2, Info, Terminal, XCircle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@openzeppelin/ui-components';

import { DemoSection } from './DemoSection';

/**
 * Demonstrates Alert component variations for inline notifications and messages.
 * Shows default, destructive, and success variants with various configurations.
 */
export function AlertDemo(): React.ReactElement {
  return (
    <DemoSection
      title="Alert"
      description="An alert component for displaying important inline messages. Supports default, destructive, and success variants with optional icons and titles."
      codeExample={`import { Alert, AlertDescription, AlertTitle } from '@openzeppelin/ui-components';
import { Info, AlertCircle } from 'lucide-react';

// Basic alert
<Alert>
  <AlertDescription>This is a basic alert message.</AlertDescription>
</Alert>

// With title and icon
<Alert>
  <Info className="h-4 w-4" />
  <AlertTitle>Heads up!</AlertTitle>
  <AlertDescription>
    You can add components and dependencies to your app.
  </AlertDescription>
</Alert>

// Destructive variant
<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    Your transaction was rejected by the network.
  </AlertDescription>
</Alert>

// Success variant
<Alert variant="success">
  <CheckCircle2 className="h-4 w-4" />
  <AlertTitle>Success</AlertTitle>
  <AlertDescription>
    Transaction confirmed successfully.
  </AlertDescription>
</Alert>`}
    >
      {/* Default Variant */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Default Variant</h3>
        <div className="space-y-4">
          <Alert>
            <AlertDescription>This is a basic alert with no title or icon.</AlertDescription>
          </Alert>

          <Alert>
            <Terminal className="h-4 w-4" />
            <AlertTitle>Heads up!</AlertTitle>
            <AlertDescription>
              You can add components and dependencies to your app using the CLI.
            </AlertDescription>
          </Alert>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Information</AlertTitle>
            <AlertDescription>
              Your session will expire in 5 minutes. Save your work to avoid losing changes.
            </AlertDescription>
          </Alert>
        </div>
      </div>

      {/* Destructive Variant */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Destructive Variant</h3>
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertDescription>Something went wrong. Please try again.</AlertDescription>
          </Alert>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Your transaction was rejected by the network. Check your gas settings.
            </AlertDescription>
          </Alert>

          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Connection Failed</AlertTitle>
            <AlertDescription>
              Unable to connect to the RPC endpoint. Please verify your network settings and try
              again.
            </AlertDescription>
          </Alert>
        </div>
      </div>

      {/* Success Variant */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Success Variant</h3>
        <div className="space-y-4">
          <Alert variant="success">
            <AlertDescription>Operation completed successfully.</AlertDescription>
          </Alert>

          <Alert variant="success">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Transaction Confirmed</AlertTitle>
            <AlertDescription>
              Your transaction has been confirmed on the blockchain. Hash: 0xabc...123
            </AlertDescription>
          </Alert>

          <Alert variant="success">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Wallet Connected</AlertTitle>
            <AlertDescription>
              Successfully connected to MetaMask. You can now interact with the dApp.
            </AlertDescription>
          </Alert>
        </div>
      </div>

      {/* Blockchain Use Cases */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Blockchain Use Cases</h3>
        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Network Switch Required</AlertTitle>
            <AlertDescription>
              This contract is deployed on Polygon. Switch your wallet network to continue.
            </AlertDescription>
          </Alert>

          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Insufficient Balance</AlertTitle>
            <AlertDescription>
              You don&apos;t have enough ETH to cover gas fees. Current balance: 0.001 ETH.
              Required: 0.005 ETH.
            </AlertDescription>
          </Alert>

          <Alert variant="success">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Role Granted</AlertTitle>
            <AlertDescription>
              MINTER_ROLE has been successfully granted to 0x742d...1D3F4.
            </AlertDescription>
          </Alert>
        </div>
      </div>

      {/* With Rich Content */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">With Rich Content</h3>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Smart Contract Audit</AlertTitle>
          <AlertDescription>
            <p className="mb-2">
              Your contract has been submitted for security audit. The review process includes:
            </p>
            <ul className="list-inside list-disc space-y-1 text-sm">
              <li>Static analysis for common vulnerabilities</li>
              <li>Manual code review by security experts</li>
              <li>Gas optimization recommendations</li>
              <li>Best practices compliance check</li>
            </ul>
            <p className="mt-2 text-sm">Expected completion: 3-5 business days</p>
          </AlertDescription>
        </Alert>
      </div>

      {/* Compact Alerts */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Compact (Description Only)</h3>
        <div className="space-y-3">
          <Alert>
            <AlertDescription>
              Tip: Use keyboard shortcuts for faster navigation. Press ? to see all shortcuts.
            </AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertDescription>
              Invalid address format. Please enter a valid Ethereum address.
            </AlertDescription>
          </Alert>
          <Alert variant="success">
            <AlertDescription>Settings saved successfully.</AlertDescription>
          </Alert>
        </div>
      </div>
    </DemoSection>
  );
}
