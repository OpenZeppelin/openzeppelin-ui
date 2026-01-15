import { NetworkIcon } from '@web3icons/react';
import { ArrowLeftRight, ArrowRight, Globe, Layers, Wallet, Wand2 } from 'lucide-react';
import { useState } from 'react';

import { AddressDisplay, Input } from '@openzeppelin/ui-components';

import { useEcosystem } from '../context';
import {
  getEcosystemStaticMetadata,
  getSupportedEcosystems,
  type DemoEcosystem,
} from '../core/ecosystemManager';

export interface HomeDemoProps {
  onNavigate?: (demoKey: string) => void;
}

// Ecosystem icon helper
function EcosystemIcon({ ecosystem, size = 24 }: { ecosystem: DemoEcosystem; size?: number }) {
  return <NetworkIcon network={getEcosystemStaticMetadata(ecosystem).iconName} size={size} />;
}

export function HomeDemo({ onNavigate }: HomeDemoProps): React.ReactElement {
  const { ecosystem, setEcosystem, adapter, sampleAddresses, metadata, isLoading } = useEcosystem();
  const [testAddress, setTestAddress] = useState('');

  // Show loading state while ecosystem data is being loaded
  if (isLoading || !adapter || !metadata) {
    return (
      <section className="flex min-h-[400px] items-center justify-center">
        <div className="text-muted-foreground">Loading ecosystem...</div>
      </section>
    );
  }

  return (
    <section className="space-y-12">
      {/* Hero */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">
          Build for <span className="text-primary">any blockchain</span>
        </h1>
        <p className="text-muted-foreground text-lg">
          One component library. Switch ecosystems—the UI adapts automatically.
        </p>
      </div>

      {/* Live Demo - The "Wow" Moment */}
      <div className="space-y-6 rounded-xl border-2 border-dashed p-6">
        <div className="flex items-center gap-2">
          <span className="bg-primary/10 text-primary rounded-full px-3 py-1 text-sm font-medium">
            Try it now
          </span>
        </div>

        {/* Ecosystem Switcher */}
        <div className="flex flex-wrap gap-3">
          {getSupportedEcosystems().map((eco) => {
            const info = getEcosystemStaticMetadata(eco);
            const isActive = ecosystem === eco;
            return (
              <button
                key={eco}
                onClick={() => {
                  void setEcosystem(eco);
                  setTestAddress('');
                }}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-all ${
                  isActive
                    ? 'border-primary bg-primary/5 ring-primary/20 ring-2'
                    : 'hover:bg-muted/50'
                }`}
              >
                <EcosystemIcon ecosystem={eco} size={20} />
                <span className="font-medium">{info.name}</span>
              </button>
            );
          })}
        </div>

        {/* Address Validation */}
        <div className="space-y-3">
          <Input
            placeholder={`Enter ${metadata.name} address to validate...`}
            value={testAddress}
            onChange={(e) => setTestAddress(e.target.value)}
            className="text-base"
          />
          {testAddress ? (
            <p
              className={`flex items-center gap-2 text-sm font-medium ${
                adapter.isValidAddress(testAddress) ? 'text-green-600' : 'text-red-500'
              }`}
            >
              {adapter.isValidAddress(testAddress)
                ? `✓ Valid ${metadata.name} address`
                : `✗ Invalid ${metadata.name} address`}
            </p>
          ) : (
            <p className="text-muted-foreground flex items-center gap-2 text-sm">
              Try a sample:{' '}
              <button
                type="button"
                onClick={() => setTestAddress(sampleAddresses.wallet)}
                className="hover:ring-primary/50 rounded-md transition-shadow hover:ring-2"
              >
                <AddressDisplay address={sampleAddresses.wallet} startChars={6} endChars={6} />
              </button>
            </p>
          )}
        </div>

        <p className="text-muted-foreground text-sm">
          Same component, same code—different validation logic per ecosystem. The adapter handles it
          all.
        </p>
      </div>

      {/* What You Can Build */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">What you can build</h2>
        <p className="text-muted-foreground">
          Build any web3 app with production-ready components. Stop rebuilding from scratch.
        </p>

        {/* Solution Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            onClick={() => onNavigate?.('wallet')}
            className="group rounded-lg border p-5 text-left transition-colors hover:border-primary hover:bg-primary/5"
          >
            <div className="flex items-center gap-2">
              <Wallet className="size-5 text-pink-600" />
              <h3 className="font-semibold">Multi-Wallet dApps</h3>
              <ArrowRight className="text-muted-foreground ml-auto size-4 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
            </div>
            <p className="text-muted-foreground mt-2 text-sm">
              Connect MetaMask, WalletConnect, Freighter, and more. Same code, any chain. Users pick
              their wallet, you ship faster.
            </p>
          </button>

          <button
            onClick={() => onNavigate?.('renderer')}
            className="group rounded-lg border p-5 text-left transition-colors hover:border-primary hover:bg-primary/5"
          >
            <div className="flex items-center gap-2">
              <Wand2 className="size-5 text-purple-600" />
              <h3 className="font-semibold">Contract Interaction UIs</h3>
              <ArrowRight className="text-muted-foreground ml-auto size-4 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
            </div>
            <p className="text-muted-foreground mt-2 text-sm">
              Auto-generate forms from any contract ABI. Full transaction execution and contract
              read capabilities, with type-safe inputs and validation built-in.
            </p>
          </button>

          <button
            onClick={() => onNavigate?.('network')}
            className="group rounded-lg border p-5 text-left transition-colors hover:border-primary hover:bg-primary/5"
          >
            <div className="flex items-center gap-2">
              <Globe className="size-5 text-blue-600" />
              <h3 className="font-semibold">Multi-Chain Dashboards</h3>
              <ArrowRight className="text-muted-foreground ml-auto size-4 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
            </div>
            <p className="text-muted-foreground mt-2 text-sm">
              Network switching, chain icons, status badges. Support mainnet, testnet, and custom
              RPCs without extra code.
            </p>
          </button>

          <button
            onClick={() => onNavigate?.('type-mapping')}
            className="group rounded-lg border p-5 text-left transition-colors hover:border-primary hover:bg-primary/5"
          >
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="size-5 text-green-600" />
              <h3 className="font-semibold">Admin & Management Tools</h3>
              <ArrowRight className="text-muted-foreground ml-auto size-4 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
            </div>
            <p className="text-muted-foreground mt-2 text-sm">
              Build token management, access control panels, or governance UIs. Type mapping
              automatically handles all blockchain-specific data types.
            </p>
          </button>
        </div>
      </div>

      {/* Why OpenZeppelin UI */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Why OpenZeppelin UI?</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border p-4">
            <p className="font-medium">Ship faster</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Pre-built components mean less boilerplate. Focus on your product, not wallet
              integration.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="font-medium">One codebase</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Support multiple blockchains without maintaining separate code paths. Adapters handle
              the differences.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="font-medium">Production ready</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Battle-tested components from OpenZeppelin. Accessible, themeable, and designed for
              real-world use.
            </p>
          </div>
        </div>
      </div>

      {/* Dive Deeper */}
      <div className="rounded-xl border-2 border-dashed p-6">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <div className="bg-primary/10 shrink-0 rounded-lg p-3">
            <Layers className="text-primary size-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Ready to dive deeper?</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Learn how adapters, facade hooks, and UI components work together. Or explore the
              Component Gallery to see individual components in action.
            </p>
          </div>
          <button
            onClick={() => onNavigate?.('architecture')}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors"
          >
            View Architecture
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
