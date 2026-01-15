/**
 * ArchitectureDemo
 *
 * Explains the OpenZeppelin UI architecture with the three-pillar pattern:
 * Adapters, Facade Hooks, and UI Components.
 *
 * This is the "big picture" view that helps developers understand how all
 * the pieces fit together before diving into specific features.
 */

import { Boxes, Code2, ExternalLink, Puzzle } from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openzeppelin/ui-components';

import { CodeBlock } from './CodeBlock';
import { DemoSection } from './DemoSection';

const PROVIDER_SETUP_CODE = `import { AdapterProvider, WalletStateProvider } from '@openzeppelin/ui-react';
import { EvmAdapter } from '@openzeppelin/ui-builder-adapter-evm';

function App() {
  return (
    <AdapterProvider adapter={new EvmAdapter(config)}>
      <WalletStateProvider>
        {/* Your app - all components now have access to adapter capabilities */}
        <MyApp />
      </WalletStateProvider>
    </AdapterProvider>
  );
}`;

const ADAPTER_INTERFACE_CODE = `interface ContractAdapter {
  // Identity & Validation
  isValidAddress(address: string): boolean;
  normalizeAddress(address: string): string;
  
  // Type System
  getTypeMapping(): TypeMapping;
  getSupportedTypes(): string[];
  
  // Network Management
  getSupportedNetworks(): NetworkConfig[];
  switchNetwork(chainId: number): Promise<void>;
  
  // Wallet UI
  getWalletComponents(): WalletComponents;
  getAvailableUiKits(): Promise<AvailableUiKit[]>;
  
  // Contract Interaction (coming soon)
  executeTransaction(tx: Transaction): Promise<TxResult>;
  queryContract(query: ContractQuery): Promise<unknown>;
}`;

const FACADE_HOOKS_CODE = `// Same API, any blockchain
import {
  useDerivedAccountStatus,
  useDerivedChainInfo,
  useDerivedConnectStatus,
} from '@openzeppelin/ui-react';

function WalletInfo() {
  const { isConnected, address } = useDerivedAccountStatus();
  const { currentChainId, chainName } = useDerivedChainInfo();
  const { isConnecting, error } = useDerivedConnectStatus();
  
  // Works identically whether using EVM, Stellar, or future adapters
  return (
    <div>
      {isConnected ? (
        <span>Connected to {chainName}: {address}</span>
      ) : (
        <span>{isConnecting ? 'Connecting...' : 'Not connected'}</span>
      )}
    </div>
  );
}`;

export interface ArchitectureDemoProps {
  onNavigate?: (demoKey: string) => void;
}

export function ArchitectureDemo({ onNavigate }: ArchitectureDemoProps): React.ReactElement {
  return (
    <DemoSection
      title="Architecture"
      description="Understanding how adapters, hooks, and components work together to create a unified multi-chain experience."
    >
      {/* The Three Pillars */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 dark:border-blue-800 dark:from-blue-950/30 dark:to-blue-900/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Puzzle className="size-5" />
              <CardTitle className="text-lg">Adapters</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <CardDescription className="text-sm">
              Ecosystem-specific implementations that encapsulate wallet libraries and provide
              unified interfaces.
            </CardDescription>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Address validation & normalization</li>
              <li>• Type mapping for form generation</li>
              <li>• Network configuration</li>
              <li>• Wallet UI components</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 dark:border-purple-800 dark:from-purple-950/30 dark:to-purple-900/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
              <Code2 className="size-5" />
              <CardTitle className="text-lg">Facade Hooks</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <CardDescription className="text-sm">
              Unified React hooks that abstract away ecosystem-specific wallet libraries like wagmi
              or stellar-wallets-kit.
            </CardDescription>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• useDerivedAccountStatus</li>
              <li>• useDerivedChainInfo</li>
              <li>• useDerivedConnectStatus</li>
              <li>• useDerivedSwitchChainStatus</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100 dark:border-green-800 dark:from-green-950/30 dark:to-green-900/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <Boxes className="size-5" />
              <CardTitle className="text-lg">UI Components</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <CardDescription className="text-sm">
              Adapter-provided React components for wallet connection, account display, and network
              switching.
            </CardDescription>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• WalletConnectionUI</li>
              <li>• ConnectButton</li>
              <li>• AccountDisplay</li>
              <li>• NetworkSwitcher</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Why This Architecture */}
      <Card>
        <CardHeader>
          <CardTitle>Why This Architecture?</CardTitle>
          <CardDescription>
            The adapter pattern solves real problems that blockchain developers face every day.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h4 className="font-semibold text-destructive">Without OpenZeppelin UI</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-destructive">✗</span>
                  <span>Write separate validation logic for each chain</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-destructive">✗</span>
                  <span>Learn different wallet libraries (wagmi, stellar-sdk, etc.)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-destructive">✗</span>
                  <span>Build custom form fields for each blockchain type</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-destructive">✗</span>
                  <span>Handle network switching differently per ecosystem</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-destructive">✗</span>
                  <span>Maintain separate codebases for multi-chain support</span>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-green-600">With OpenZeppelin UI</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-green-600">✓</span>
                  <span>One API for all chains - adapters handle the differences</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-green-600">✓</span>
                  <span>Facade hooks provide consistent wallet state</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-green-600">✓</span>
                  <span>Type mapping auto-generates correct form fields</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-green-600">✓</span>
                  <span>Network switching works the same everywhere</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 text-green-600">✓</span>
                  <span>Single codebase scales to any supported chain</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provider Setup */}
      <Card>
        <CardHeader>
          <CardTitle>Provider Setup</CardTitle>
          <CardDescription>
            Wrap your app with AdapterProvider and WalletStateProvider to enable all features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock code={PROVIDER_SETUP_CODE} language="tsx" />
        </CardContent>
      </Card>

      {/* Adapter Interface */}
      <Card>
        <CardHeader>
          <CardTitle>The ContractAdapter Interface</CardTitle>
          <CardDescription>
            Every adapter implements this interface, ensuring consistent behavior across ecosystems.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock code={ADAPTER_INTERFACE_CODE} language="typescript" />
        </CardContent>
      </Card>

      {/* Facade Hooks */}
      <Card>
        <CardHeader>
          <CardTitle>Using Facade Hooks</CardTitle>
          <CardDescription>
            Write your component once - the hooks automatically use the correct adapter.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock code={FACADE_HOOKS_CODE} language="tsx" />
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card className="border-dashed">
        <CardContent className="py-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <h3 className="font-semibold">Explore the Architecture in Action</h3>
            <p className="max-w-lg text-sm text-muted-foreground">
              See these concepts applied in real demos. Try switching ecosystems and watch how the
              same code adapts automatically.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => onNavigate?.('type-mapping')}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Type Mapping Demo
                <ExternalLink className="size-3.5" />
              </button>
              <button
                onClick={() => onNavigate?.('wallet')}
                className="inline-flex items-center gap-1.5 rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Wallet Integration
                <ExternalLink className="size-3.5" />
              </button>
              <button
                onClick={() => onNavigate?.('renderer')}
                className="inline-flex items-center gap-1.5 rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Form Renderer
                <ExternalLink className="size-3.5" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </DemoSection>
  );
}
