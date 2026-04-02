/**
 * ArchitectureDemo
 *
 * Explains the OpenZeppelin UI architecture with the three-pillar pattern:
 * Adapters, Facade Hooks, and UI Components.
 *
 * This is the "big picture" view that helps developers understand how all
 * the pieces fit together before diving into specific features.
 */

import {
  Boxes,
  Check,
  Code2,
  Database,
  ExternalLink,
  FileSearch,
  Puzzle,
  Send,
  Shield,
  Wallet,
  X,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openzeppelin/ui-components';

import { CodeBlock } from './CodeBlock';
import { DemoSection } from './DemoSection';
import { Web3NetworkIcon } from './Web3NetworkIcon';

const PROVIDER_SETUP_CODE = `import { RuntimeProvider, WalletStateProvider } from '@openzeppelin/ui-react';
import { ecosystemDefinition, ethereumSepolia } from '@openzeppelin/adapter-evm';

function App() {
  return (
    <RuntimeProvider
      resolveRuntime={(networkConfig) =>
        ecosystemDefinition.createRuntime('composer', networkConfig)
      }
    >
      <WalletStateProvider initialNetworkId={ethereumSepolia.id}>
        {/* Your app - all components now have access to runtime capabilities */}
        <MyApp />
      </WalletStateProvider>
    </RuntimeProvider>
  );
}`;

const RUNTIME_INTERFACE_CODE = `interface EcosystemRuntime {
  networkConfig: NetworkConfig;

  // Tier 1 capabilities
  addressing: AddressingCapability;
  explorer: ExplorerCapability;
  networkCatalog: NetworkCatalogCapability;
  uiLabels: UiLabelsCapability;

  // Tier 2 / 3 capabilities (profile-dependent)
  contractLoading?: ContractLoadingCapability;
  schema?: SchemaCapability;
  typeMapping?: TypeMappingCapability;
  query?: QueryCapability;
  execution?: ExecutionCapability;
  wallet?: WalletCapability;
  uiKit?: UiKitCapability;
  relayer?: RelayerCapability;

  dispose(): void;
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
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50">
                <Puzzle className="size-[18px] text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-base">Adapters</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">
              Blockchain-specific implementations for contract loading, transactions, type mapping,
              wallet integration, and more.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/50">
                <Code2 className="size-[18px] text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle className="text-base">Facade Hooks</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">
              Unified React hooks that abstract wallet libraries like wagmi and stellar-wallets-kit
              behind a single API.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/50">
                <Boxes className="size-[18px] text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-base">UI Components</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">
              Pre-built React components for wallet connection, account display, network switching,
              and more.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Adapter Capabilities */}
      <Card>
        <CardHeader>
          <CardTitle>What Adapters Can Do</CardTitle>
          <CardDescription>
            Each adapter provides a comprehensive set of capabilities for interacting with its
            blockchain. Here&apos;s what you get out of the box.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2 rounded-lg border p-4">
              <div className="flex items-center gap-2 font-medium">
                <FileSearch className="size-4 text-blue-600" />
                Contract Loading
              </div>
              <p className="text-sm text-muted-foreground">
                Load contracts from Etherscan, Sourcify, or Soroban. Automatic proxy detection and
                ABI parsing included.
              </p>
            </div>

            <div className="space-y-2 rounded-lg border p-4">
              <div className="flex items-center gap-2 font-medium">
                <Database className="size-4 text-purple-600" />
                Type Mapping
              </div>
              <p className="text-sm text-muted-foreground">
                Auto-generate form fields from blockchain types. Handles uint256, address, bytes,
                structs, arrays, and more.
              </p>
            </div>

            <div className="space-y-2 rounded-lg border p-4">
              <div className="flex items-center gap-2 font-medium">
                <Send className="size-4 text-green-600" />
                Transaction Execution
              </div>
              <p className="text-sm text-muted-foreground">
                Execute via wallet (EOA) or meta-transactions (Relayer). Gas estimation, status
                callbacks, and confirmation tracking.
              </p>
            </div>

            <div className="space-y-2 rounded-lg border p-4">
              <div className="flex items-center gap-2 font-medium">
                <Code2 className="size-4 text-orange-600" />
                View Function Queries
              </div>
              <p className="text-sm text-muted-foreground">
                Query read-only contract functions. Automatic detection of view/pure functions with
                result formatting.
              </p>
            </div>

            <div className="space-y-2 rounded-lg border p-4">
              <div className="flex items-center gap-2 font-medium">
                <Wallet className="size-4 text-pink-600" />
                Wallet Integration
              </div>
              <p className="text-sm text-muted-foreground">
                RainbowKit for EVM, Stellar Wallets Kit for Soroban. Configurable UI kits with
                connection state management.
              </p>
            </div>

            <div className="space-y-2 rounded-lg border p-4">
              <div className="flex items-center gap-2 font-medium">
                <Shield className="size-4 text-cyan-600" />
                Access Control
              </div>
              <p className="text-sm text-muted-foreground">
                Ownable and AccessControl pattern support. Role management, ownership transfers, and
                permission queries.
              </p>
            </div>
          </div>

          {/* Extensibility callout */}
          <div className="mt-6 flex items-center gap-4 rounded-lg bg-muted/50 p-4">
            <div className="flex shrink-0 items-center gap-1">
              <div className="flex size-8 items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/30 bg-background">
                <span className="text-xs font-medium text-muted-foreground">+</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Extensible by Design</p>
              <p className="text-sm text-muted-foreground">
                Extend existing adapters or create your own for new blockchains. The interface is
                standardized, so your custom adapter works seamlessly with all hooks and components.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ecosystem Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Supported Adapters</CardTitle>
          <CardDescription>
            Each adapter is tailored for its blockchain while exposing the same runtime model.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3 rounded-lg border p-4">
              <h4 className="flex items-center gap-2.5 font-semibold">
                <Web3NetworkIcon network="ethereum" size={24} />
                EVM Adapter
              </h4>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li>• Etherscan & Sourcify contract verification</li>
                <li>• Proxy contract detection & resolution</li>
                <li>• RainbowKit + Wagmi wallet integration</li>
                <li>• Gas price presets (fast/standard/slow)</li>
                <li>• EIP-1559 transaction support</li>
                <li>• Multi-chain support (Ethereum, Polygon, etc.)</li>
              </ul>
            </div>
            <div className="space-y-3 rounded-lg border p-4">
              <h4 className="flex items-center gap-2.5 font-semibold">
                <Web3NetworkIcon network="stellar" size={24} />
                Stellar Adapter
              </h4>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li>• Soroban smart contract support</li>
                <li>• Stellar Wallets Kit integration</li>
                <li>• XDR encoding/decoding</li>
                <li>• Access control service (Ownable, Roles)</li>
                <li>• Complex type support (Vec, Map, Option)</li>
                <li>• Testnet and mainnet support</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

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
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li className="flex items-center gap-2.5">
                  <X className="size-4 shrink-0 text-destructive" />
                  <span>Write separate contract loading for each explorer API</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <X className="size-4 shrink-0 text-destructive" />
                  <span>Learn different wallet libraries (wagmi, stellar-sdk, etc.)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <X className="size-4 shrink-0 text-destructive" />
                  <span>Build custom form fields for each blockchain type</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <X className="size-4 shrink-0 text-destructive" />
                  <span>Handle transaction signing differently per blockchain</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <X className="size-4 shrink-0 text-destructive" />
                  <span>Maintain separate codebases for multi-chain support</span>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-green-600">With OpenZeppelin UI</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li className="flex items-center gap-2.5">
                  <Check className="size-4 shrink-0 text-green-600" />
                  <span>One API for all chains - adapters handle the differences</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="size-4 shrink-0 text-green-600" />
                  <span>Facade hooks provide consistent wallet state</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="size-4 shrink-0 text-green-600" />
                  <span>Type mapping auto-generates correct form fields</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="size-4 shrink-0 text-green-600" />
                  <span>Transaction execution works the same everywhere</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="size-4 shrink-0 text-green-600" />
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
            Wrap your app with RuntimeProvider and WalletStateProvider to enable all features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock code={PROVIDER_SETUP_CODE} language="tsx" />
        </CardContent>
      </Card>

      {/* Adapter Interface */}
      <Card>
        <CardHeader>
          <CardTitle>The EcosystemRuntime Interface</CardTitle>
          <CardDescription>
            Every composed runtime exposes the same capability model, with profile-specific
            capabilities filled in as needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock code={RUNTIME_INTERFACE_CODE} language="typescript" />
        </CardContent>
      </Card>

      {/* Facade Hooks */}
      <Card>
        <CardHeader>
          <CardTitle>Using Facade Hooks</CardTitle>
          <CardDescription>
            Write your component once - the hooks automatically use the correct runtime.
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
              See these concepts applied in real demos. Try switching adapters and watch how the
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
