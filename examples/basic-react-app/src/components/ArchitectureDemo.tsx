/**
 * ArchitectureDemo
 *
 * Explains the OpenZeppelin UI architecture with capability-based adapters,
 * tiered capabilities, app profiles, and the unified runtime model.
 *
 * This is the "big picture" view that helps developers understand how all
 * the pieces fit together before diving into specific features.
 */

import {
  Boxes,
  Check,
  Code2,
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
        <MyApp />
      </WalletStateProvider>
    </RuntimeProvider>
  );
}`;

const RUNTIME_INTERFACE_CODE = `interface EcosystemRuntime {
  readonly networkConfig: NetworkConfig;

  // Tier 1 — Lightweight (no network, no side-effects)
  readonly addressing: AddressingCapability;
  readonly explorer: ExplorerCapability;
  readonly networkCatalog: NetworkCatalogCapability;
  readonly uiLabels: UiLabelsCapability;

  // Tier 2 — Schema / Network-Aware (may need async, no wallet)
  readonly contractLoading?: ContractLoadingCapability;
  readonly schema?: SchemaCapability;
  readonly typeMapping?: TypeMappingCapability;
  readonly query?: QueryCapability;

  // Tier 3 — Runtime / Stateful (wallet, execution, relayers)
  readonly execution?: ExecutionCapability;
  readonly wallet?: WalletCapability;
  readonly uiKit?: UiKitCapability;
  readonly relayer?: RelayerCapability;
  readonly accessControl?: AccessControlCapability;

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
  
  // Works identically whether using EVM, Stellar, Polkadot, or future adapters
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

const DIRECT_CAPABILITY_CODE = `// Lightweight: use only what you need via sub-path exports
import { ecosystemMetadata } from '@openzeppelin/adapter-stellar/metadata';
import { networks } from '@openzeppelin/adapter-stellar/networks';

// No wallet SDKs loaded — just metadata and network catalogs
console.log(ecosystemMetadata.name);       // "Stellar"
console.log(networks.length);              // Available networks

// For apps that only need Tier 1 capabilities:
import { ecosystemDefinition } from '@openzeppelin/adapter-stellar';

const runtime = ecosystemDefinition.createRuntime('declarative', stellarTestnet);
runtime.addressing.isValidAddress('G...');  // true
runtime.explorer.getExplorerUrl(address);   // "https://stellar.expert/..."`;

const PROFILES: {
  name: string;
  description: string;
  capabilities: string;
  useCase: string;
  consumer?: string;
}[] = [
  {
    name: 'Declarative',
    description: 'Tier 1 only — stateless, synchronous, no network calls',
    capabilities: 'Addressing, Explorer, NetworkCatalog, UiLabels',
    useCase: 'Code generators, config wizards, address validation tools',
    consumer: 'RWA Wizard',
  },
  {
    name: 'Viewer',
    description: 'Declarative + Tier 2 read capabilities',
    capabilities: '+ ContractLoading, Schema, TypeMapping, Query',
    useCase: 'Contract state dashboards, analytics, read-only explorers',
  },
  {
    name: 'Transactor',
    description: 'Declarative + Tier 2 (no query) + execution and wallet',
    capabilities: '+ ContractLoading, Schema, TypeMapping, Execution, Wallet',
    useCase: 'Token transfers, minting pages, simple dApp frontends',
  },
  {
    name: 'Composer',
    description: 'Full Tier 1–3 except AccessControl — the powerhouse profile',
    capabilities:
      '+ ContractLoading, Schema, TypeMapping, Query, Execution, Wallet, UiKit, Relayer',
    useCase: 'No-code dApp builders, full-featured contract UIs',
    consumer: 'UI Builder',
  },
  {
    name: 'Operator',
    description: 'Like Composer but with AccessControl instead of Relayer',
    capabilities:
      '+ ContractLoading, Schema, TypeMapping, Query, Execution, Wallet, UiKit, AccessControl',
    useCase: 'Role management panels, permission dashboards, admin tools',
    consumer: 'Role Manager',
  },
];

export interface ArchitectureDemoProps {
  onNavigate?: (demoKey: string) => void;
}

export function ArchitectureDemo({ onNavigate }: ArchitectureDemoProps): React.ReactElement {
  return (
    <DemoSection
      title="Architecture"
      description="Understanding how capability-based adapters, app profiles, facade hooks, and UI components work together to create a unified multi-chain experience."
    >
      {/* The Three Pillars */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50">
                <Puzzle className="size-[18px] text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-base">Ecosystem Adapters</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">
              Standalone packages that translate chain-specific operations into 13 composable
              capabilities across 3 tiers. Each adapter is published independently under{' '}
              <code className="text-xs">@openzeppelin/adapter-*</code>.
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
              Unified React hooks from <code className="text-xs">@openzeppelin/ui-react</code> that
              abstract wallet libraries (wagmi, stellar-wallets-kit, etc.) behind a single API
              regardless of ecosystem.
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
              Chain-agnostic React components for wallet connection, forms, network management, and
              more. Built on 7 package layers from <code className="text-xs">ui-types</code> through{' '}
              <code className="text-xs">ui-storage</code>.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Capability Tiers */}
      <Card>
        <CardHeader>
          <CardTitle>13 Capabilities Across 3 Tiers</CardTitle>
          <CardDescription>
            The monolithic adapter interface has been decomposed into small, composable
            capabilities. Tiers enforce physical isolation via sub-path exports — importing Tier 1
            never pulls in wallet SDKs or RPC clients.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tier 1 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
                Tier 1 — Lightweight
              </span>
              <span className="text-xs text-muted-foreground">
                No network, no side-effects, synchronous
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border bg-emerald-50/50 p-3 dark:bg-emerald-950/20">
                <p className="text-sm font-medium">Addressing</p>
                <p className="text-xs text-muted-foreground">
                  Address validation, formatting, checksumming
                </p>
              </div>
              <div className="rounded-lg border bg-emerald-50/50 p-3 dark:bg-emerald-950/20">
                <p className="text-sm font-medium">Explorer</p>
                <p className="text-xs text-muted-foreground">Block explorer URL generation</p>
              </div>
              <div className="rounded-lg border bg-emerald-50/50 p-3 dark:bg-emerald-950/20">
                <p className="text-sm font-medium">NetworkCatalog</p>
                <p className="text-xs text-muted-foreground">Available networks and metadata</p>
              </div>
              <div className="rounded-lg border bg-emerald-50/50 p-3 dark:bg-emerald-950/20">
                <p className="text-sm font-medium">UiLabels</p>
                <p className="text-xs text-muted-foreground">
                  Human-readable ecosystem-specific terms
                </p>
              </div>
            </div>
          </div>

          {/* Tier 2 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/50 dark:text-blue-400">
                Tier 2 — Network-Aware
              </span>
              <span className="text-xs text-muted-foreground">
                Needs NetworkConfig, may be async, no wallet required
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border bg-blue-50/50 p-3 dark:bg-blue-950/20">
                <div className="flex items-center gap-2">
                  <FileSearch className="size-3.5 text-blue-600" />
                  <p className="text-sm font-medium">ContractLoading</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Fetch and parse ABIs/IDLs from explorers
                </p>
              </div>
              <div className="rounded-lg border bg-blue-50/50 p-3 dark:bg-blue-950/20">
                <p className="text-sm font-medium">Schema</p>
                <p className="text-xs text-muted-foreground">
                  Transform definitions into form-renderable schemas
                </p>
              </div>
              <div className="rounded-lg border bg-blue-50/50 p-3 dark:bg-blue-950/20">
                <p className="text-sm font-medium">TypeMapping</p>
                <p className="text-xs text-muted-foreground">
                  Map blockchain types to form field types
                </p>
              </div>
              <div className="rounded-lg border bg-blue-50/50 p-3 dark:bg-blue-950/20">
                <p className="text-sm font-medium">Query</p>
                <p className="text-xs text-muted-foreground">
                  Read-only contract calls (view functions)
                </p>
              </div>
            </div>
          </div>

          {/* Tier 3 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/50 dark:text-violet-400">
                Tier 3 — Stateful Runtime
              </span>
              <span className="text-xs text-muted-foreground">
                Needs wallet state, participates in dispose() lifecycle
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border bg-violet-50/50 p-3 dark:bg-violet-950/20">
                <div className="flex items-center gap-2">
                  <Send className="size-3.5 text-violet-600" />
                  <p className="text-sm font-medium">Execution</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Sign, broadcast, and track transactions
                </p>
              </div>
              <div className="rounded-lg border bg-violet-50/50 p-3 dark:bg-violet-950/20">
                <div className="flex items-center gap-2">
                  <Wallet className="size-3.5 text-violet-600" />
                  <p className="text-sm font-medium">Wallet</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Connect/disconnect, account state, chain switching
                </p>
              </div>
              <div className="rounded-lg border bg-violet-50/50 p-3 dark:bg-violet-950/20">
                <p className="text-sm font-medium">UiKit</p>
                <p className="text-xs text-muted-foreground">
                  Ecosystem-specific React components and hooks
                </p>
              </div>
              <div className="rounded-lg border bg-violet-50/50 p-3 dark:bg-violet-950/20">
                <p className="text-sm font-medium">Relayer</p>
                <p className="text-xs text-muted-foreground">Gas-sponsored transaction execution</p>
              </div>
              <div className="rounded-lg border bg-violet-50/50 p-3 dark:bg-violet-950/20">
                <div className="flex items-center gap-2">
                  <Shield className="size-3.5 text-violet-600" />
                  <p className="text-sm font-medium">AccessControl</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Role management, ownership, permission queries
                </p>
              </div>
            </div>
          </div>

          {/* Extensibility callout */}
          <div className="flex items-center gap-4 rounded-lg bg-muted/50 p-4">
            <div className="flex shrink-0 items-center gap-1">
              <div className="flex size-8 items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/30 bg-background">
                <span className="text-xs font-medium text-muted-foreground">+</span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Extensible by Design</p>
              <p className="text-sm text-muted-foreground">
                Build your own adapter by implementing capability factories.{' '}
                <code className="text-xs">adapter-evm-core</code> provides a reusable foundation for
                any EVM-compatible chain.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* App Profiles */}
      <Card>
        <CardHeader>
          <CardTitle>5 App Profiles</CardTitle>
          <CardDescription>
            Profiles are pre-composed capability bundles that map to common application archetypes.
            Choose one when creating a runtime — each profile enforces that all required
            capabilities are implemented by the adapter.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {PROFILES.map((profile) => (
              <div key={profile.name} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-semibold">{profile.name}</h4>
                  {profile.consumer && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      Used by {profile.consumer}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{profile.description}</p>
                <p className="mt-1.5 font-mono text-xs text-muted-foreground">
                  {profile.capabilities}
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground italic">{profile.useCase}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Supported Adapters */}
      <Card>
        <CardHeader>
          <CardTitle>Ecosystem Adapters</CardTitle>
          <CardDescription>
            Each adapter is a standalone npm package under{' '}
            <code className="text-xs">@openzeppelin/adapter-*</code>, published from the{' '}
            <a
              href="https://github.com/OpenZeppelin/openzeppelin-adapters"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              openzeppelin-adapters
            </a>{' '}
            repository with independent versioning.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3 rounded-lg border p-4">
              <h4 className="flex items-center gap-2.5 font-semibold">
                <Web3NetworkIcon network="ethereum" size={24} />
                EVM Adapter
              </h4>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li>• All 13 capabilities including AccessControl</li>
                <li>• RainbowKit + Wagmi wallet integration</li>
                <li>• Etherscan &amp; Sourcify contract verification</li>
                <li>• Proxy contract detection &amp; resolution</li>
                <li>• EOA and Relayer execution strategies</li>
                <li>• Multi-chain (Ethereum, Polygon, Arbitrum, etc.)</li>
              </ul>
            </div>
            <div className="space-y-3 rounded-lg border p-4">
              <h4 className="flex items-center gap-2.5 font-semibold">
                <Web3NetworkIcon network="stellar" size={24} />
                Stellar Adapter
              </h4>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li>• All 13 capabilities including AccessControl</li>
                <li>• Stellar Wallets Kit integration</li>
                <li>• Soroban smart contract support</li>
                <li>• XDR encoding/decoding</li>
                <li>• Complex type support (Vec, Map, Option)</li>
                <li>• Testnet and mainnet support</li>
              </ul>
            </div>
            <div className="space-y-3 rounded-lg border p-4">
              <h4 className="flex items-center gap-2.5 font-semibold">
                <Web3NetworkIcon network="polkadot" size={24} />
                Polkadot Adapter
              </h4>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li>• 13 capabilities via EVM-compatible path</li>
                <li>• Built on adapter-evm-core for shared logic</li>
                <li>• AccessControl and Relayer support</li>
                <li>• Polkadot EVM-compatible chains</li>
              </ul>
            </div>
            <div className="space-y-3 rounded-lg border p-4">
              <h4 className="flex items-center gap-2.5 font-semibold">
                <Puzzle className="size-5 text-muted-foreground" />
                Midnight &amp; More
              </h4>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li>• Midnight adapter with Tier 1–3 capabilities</li>
                <li>• Solana adapter (placeholder, Tier 1 only)</li>
                <li>
                  • Community adapters can follow the{' '}
                  <a
                    href="https://github.com/OpenZeppelin/openzeppelin-adapters"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Building an Adapter
                  </a>{' '}
                  guide
                </li>
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
            The capability-based adapter pattern solves real problems that blockchain developers
            face every day.
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
                  <span>Import heavyweight SDKs even for simple address validation</span>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-green-600">With OpenZeppelin UI</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li className="flex items-center gap-2.5">
                  <Check className="size-4 shrink-0 text-green-600" />
                  <span>One API for all chains — adapters handle the differences</span>
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
                  <span>Choose a profile — only load the capabilities you need</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="size-4 shrink-0 text-green-600" />
                  <span>Sub-path exports keep your bundle lean</span>
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
            Wrap your app with RuntimeProvider and WalletStateProvider to enable all features. The
            runtime is created from the adapter&apos;s{' '}
            <code className="text-xs">ecosystemDefinition</code> with your chosen profile.
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
            Every composed runtime exposes the same capability model. Tier 1 fields are always
            present; Tier 2 and 3 fields are filled based on the selected profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock code={RUNTIME_INTERFACE_CODE} language="typescript" />
        </CardContent>
      </Card>

      {/* Direct Capability Consumption */}
      <Card>
        <CardHeader>
          <CardTitle>Lightweight Consumption via Sub-Path Exports</CardTitle>
          <CardDescription>
            Apps that only need Tier 1 capabilities can import metadata and networks without loading
            wallet SDKs or RPC clients. The <code className="text-xs">declarative</code> profile
            gives you addresses, explorers, and labels with zero runtime overhead.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeBlock code={DIRECT_CAPABILITY_CODE} language="typescript" />
        </CardContent>
      </Card>

      {/* Facade Hooks */}
      <Card>
        <CardHeader>
          <CardTitle>Using Facade Hooks</CardTitle>
          <CardDescription>
            Write your component once — the hooks automatically use the correct runtime for the
            active ecosystem.
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
                onClick={() => onNavigate?.('contract-interactions')}
                className="inline-flex items-center gap-1.5 rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Contract Interactions
                <ExternalLink className="size-3.5" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </DemoSection>
  );
}
