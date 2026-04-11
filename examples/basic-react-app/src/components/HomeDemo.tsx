import {
  ArrowRight,
  ExternalLink,
  FileCode2,
  Globe,
  Layers,
  Shield,
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
import { DOCS_ECOSYSTEM_ADAPTERS, DOCS_UIKIT } from '../docsUrls';
import { Web3NetworkIcon } from './Web3NetworkIcon';

export interface HomeDemoProps {
  onNavigate?: (demoKey: string) => void;
}

// Ecosystem icon helper
function EcosystemIcon({ ecosystem, size = 24 }: { ecosystem: DemoEcosystem; size?: number }) {
  return <Web3NetworkIcon network={getEcosystemStaticMetadata(ecosystem).iconName} size={size} />;
}

export function HomeDemo({ onNavigate }: HomeDemoProps): React.ReactElement {
  const { ecosystem, setEcosystem, capabilities, sampleAddresses, metadata, isLoading } =
    useEcosystem();
  const [testAddress, setTestAddress] = useState('');

  // Show loading state while ecosystem data is being loaded
  if (isLoading || !capabilities || !metadata) {
    return (
      <section className="flex min-h-[400px] items-center justify-center">
        <div className="text-muted-foreground">Loading runtime...</div>
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
          One component library. Switch adapters—the UI adapts automatically.
        </p>
        <p className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <a
            href={DOCS_UIKIT}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary inline-flex items-center gap-1 hover:underline"
          >
            UIKit documentation
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
          <span className="text-muted-foreground/60" aria-hidden>
            ·
          </span>
          <a
            href={DOCS_ECOSYSTEM_ADAPTERS}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary inline-flex items-center gap-1 hover:underline"
          >
            Ecosystem Adapters documentation
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
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
                capabilities.isValidAddress(testAddress) ? 'text-green-600' : 'text-red-500'
              }`}
            >
              {capabilities.isValidAddress(testAddress)
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
          Choose a profile that matches your app — from lightweight address validation to full
          contract UIs with wallet integration.
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
            <span className="mt-2 inline-block rounded-full bg-pink-100 px-2 py-0.5 text-xs font-medium text-pink-700 dark:bg-pink-900/40 dark:text-pink-400">
              Transactor profile
            </span>
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
            <span className="mt-2 inline-block rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/40 dark:text-purple-400">
              Composer profile
            </span>
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
              Network switching, chain icons, status badges. Support EVM, Stellar, Polkadot, and
              more without extra code.
            </p>
            <span className="mt-2 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
              Viewer profile
            </span>
          </button>

          <button
            onClick={() => onNavigate?.('type-mapping')}
            className="group rounded-lg border p-5 text-left transition-colors hover:border-primary hover:bg-primary/5"
          >
            <div className="flex items-center gap-2">
              <Shield className="size-5 text-cyan-600" />
              <h3 className="font-semibold">Access Control &amp; Admin Tools</h3>
              <ArrowRight className="text-muted-foreground ml-auto size-4 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
            </div>
            <p className="text-muted-foreground mt-2 text-sm">
              Build role management, ownership transfer, or governance UIs. The AccessControl
              capability handles Ownable, AccessControl, and role enumeration patterns.
            </p>
            <span className="mt-2 inline-block rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-medium text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400">
              Operator profile
            </span>
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
              Pre-built components and adapter profiles mean less boilerplate. Focus on your
              product, not wallet integration.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="font-medium">One codebase, 5+ chains</p>
            <p className="text-muted-foreground mt-1 text-sm">
              EVM, Stellar, Polkadot, Midnight, and more. Capability-based adapters handle the
              differences behind a unified API.
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="font-medium">Pay for what you use</p>
            <p className="text-muted-foreground mt-1 text-sm">
              13 capabilities across 3 tiers with sub-path exports. A config wizard loads zero
              wallet code; a full dApp gets everything.
            </p>
          </div>
        </div>
      </div>

      {/* Powering Production Apps */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Powering Production Apps</h2>
        <p className="text-muted-foreground">
          These libraries and adapters are already powering real OpenZeppelin products in production
          — each using a different adapter profile matched to its needs.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <a
            href="https://builder.openzeppelin.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-4 rounded-lg border p-5 transition-colors hover:border-primary hover:bg-primary/5"
          >
            <div className="bg-primary/10 shrink-0 rounded-lg p-2.5">
              <Wand2 className="text-primary size-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">UI Builder</h3>
                <ExternalLink className="text-muted-foreground size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                Visual editor for smart contract interfaces. Uses the <strong>Composer</strong>{' '}
                profile for full contract loading, form rendering, execution, and relayer support
                across ecosystems.
              </p>
            </div>
          </a>

          <a
            href="https://rolemanager.openzeppelin.com"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-4 rounded-lg border p-5 transition-colors hover:border-primary hover:bg-primary/5"
          >
            <div className="bg-primary/10 shrink-0 rounded-lg p-2.5">
              <Shield className="text-primary size-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Role Manager</h3>
                <ExternalLink className="text-muted-foreground size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                Manage access control roles for smart contracts. Uses the <strong>Operator</strong>{' '}
                profile with full AccessControl capability for role queries, ownership transfers,
                and admin lifecycle.
              </p>
            </div>
          </a>

          <a
            href="https://github.com/OpenZeppelin"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-4 rounded-lg border p-5 transition-colors hover:border-primary hover:bg-primary/5"
          >
            <div className="bg-primary/10 shrink-0 rounded-lg p-2.5">
              <FileCode2 className="text-primary size-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">RWA Wizard</h3>
                <ExternalLink className="text-muted-foreground size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                Real-world asset token generation. Uses the lightweight <strong>Declarative</strong>{' '}
                profile — only address validation, network catalogs, and explorer links, with zero
                wallet SDK overhead.
              </p>
            </div>
          </a>
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
              Learn how 13 capabilities, 5 profiles, and tiered sub-path exports make adapters both
              powerful and lightweight. Or explore the Component Gallery.
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
