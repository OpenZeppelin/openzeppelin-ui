import { NetworkIcon } from '@web3icons/react';
import {
  ArrowLeftRight,
  ArrowRight,
  BadgeCheck,
  FileSearch,
  Globe,
  Layers,
  Send,
  Wallet,
  Wand2,
} from 'lucide-react';
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

      {/* What Adapters Do - Full Capabilities */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Adapters power everything</h2>
        <p className="text-muted-foreground">
          Address validation is just the tip of the iceberg. Each adapter implements the full{' '}
          <code className="bg-muted rounded px-1.5 py-0.5 text-sm">ContractAdapter</code> interface:
        </p>

        {/* Capability Grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => onNavigate?.('architecture')}
            className="group flex items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:border-primary hover:bg-primary/5"
          >
            <FileSearch className="text-muted-foreground size-5 shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <h3 className="font-medium">Contract Loading</h3>
                <ArrowRight className="text-muted-foreground size-3 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
              </div>
              <p className="text-muted-foreground mt-0.5 text-sm">
                Load from Etherscan, Sourcify, or Soroban
              </p>
            </div>
          </button>

          <button
            onClick={() => onNavigate?.('type-mapping')}
            className="group flex items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:border-primary hover:bg-primary/5"
          >
            <ArrowLeftRight className="text-muted-foreground size-5 shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <h3 className="font-medium">Type Mapping</h3>
                <ArrowRight className="text-muted-foreground size-3 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
              </div>
              <p className="text-muted-foreground mt-0.5 text-sm">
                Blockchain types → form fields automatically
              </p>
            </div>
          </button>

          <button
            onClick={() => onNavigate?.('renderer')}
            className="group flex items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:border-primary hover:bg-primary/5"
          >
            <Send className="text-muted-foreground size-5 shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <h3 className="font-medium">Transaction Execution</h3>
                <ArrowRight className="text-muted-foreground size-3 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
              </div>
              <p className="text-muted-foreground mt-0.5 text-sm">
                EOA or Relayer, with status callbacks
              </p>
            </div>
          </button>

          <button
            onClick={() => onNavigate?.('wallet')}
            className="group flex items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:border-primary hover:bg-primary/5"
          >
            <Wallet className="text-muted-foreground size-5 shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <h3 className="font-medium">Wallet Integration</h3>
                <ArrowRight className="text-muted-foreground size-3 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
              </div>
              <p className="text-muted-foreground mt-0.5 text-sm">
                RainbowKit, Stellar Wallets Kit, and more
              </p>
            </div>
          </button>

          <button
            onClick={() => onNavigate?.('network')}
            className="group flex items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:border-primary hover:bg-primary/5"
          >
            <Globe className="text-muted-foreground size-5 shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <h3 className="font-medium">Network Management</h3>
                <ArrowRight className="text-muted-foreground size-3 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
              </div>
              <p className="text-muted-foreground mt-0.5 text-sm">
                Multi-chain support with network switching
              </p>
            </div>
          </button>

          <button
            onClick={() => onNavigate?.('form-fields')}
            className="group flex items-start gap-3 rounded-lg border p-4 text-left transition-colors hover:border-primary hover:bg-primary/5"
          >
            <BadgeCheck className="text-muted-foreground size-5 shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <h3 className="font-medium">Address Validation</h3>
                <ArrowRight className="text-muted-foreground size-3 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
              </div>
              <p className="text-muted-foreground mt-0.5 text-sm">
                Ecosystem-specific format validation
              </p>
            </div>
          </button>
        </div>

        {/* One-liner value prop */}
        <p className="text-muted-foreground text-sm italic">
          Write once, deploy everywhere. The adapter handles the blockchain-specific details.
        </p>
      </div>

      {/* Highlighted Demos */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Start here</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <button
            onClick={() => onNavigate?.('architecture')}
            className="group flex items-start gap-4 rounded-xl border-2 border-primary/30 bg-primary/5 p-5 text-left transition-colors hover:border-primary"
          >
            <div className="bg-primary text-primary-foreground shrink-0 rounded-lg p-3">
              <Layers className="size-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Architecture</h3>
                <ArrowRight className="text-primary size-4 transition-transform group-hover:translate-x-1" />
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                The big picture. How adapters, hooks, and components fit together.
              </p>
            </div>
          </button>
          <button
            onClick={() => onNavigate?.('type-mapping')}
            className="group flex items-start gap-4 rounded-xl border-2 border-primary/30 bg-primary/5 p-5 text-left transition-colors hover:border-primary"
          >
            <div className="bg-primary text-primary-foreground shrink-0 rounded-lg p-3">
              <ArrowLeftRight className="size-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Type Mapping</h3>
                <ArrowRight className="text-primary size-4 transition-transform group-hover:translate-x-1" />
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                See blockchain types become form fields automatically.
              </p>
            </div>
          </button>
          <button
            onClick={() => onNavigate?.('renderer')}
            className="group flex items-start gap-4 rounded-xl border-2 border-primary/30 bg-primary/5 p-5 text-left transition-colors hover:border-primary"
          >
            <div className="bg-primary text-primary-foreground shrink-0 rounded-lg p-3">
              <Wand2 className="size-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Form Renderer</h3>
                <ArrowRight className="text-primary size-4 transition-transform group-hover:translate-x-1" />
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                Generate complete forms from contract schemas.
              </p>
            </div>
          </button>
        </div>
      </div>
    </section>
  );
}
