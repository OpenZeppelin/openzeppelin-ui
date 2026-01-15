/**
 * LearnSections
 *
 * Documentation components for the WalletDemo Learn tab.
 * Explains architecture, adapters, facade hooks, and state management.
 */

import { Boxes, Code2, Network, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  AlertDescription,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openzeppelin/ui-components';
import {
  useDerivedAccountStatus,
  useDerivedChainInfo,
  useDerivedConnectStatus,
  useDerivedSwitchChainStatus,
  useWalletState,
  WalletConnectionUI,
} from '@openzeppelin/ui-react';
import type { AvailableUiKit } from '@openzeppelin/ui-types';

import { CodeBlock } from '../CodeBlock';
import {
  FACADE_HOOKS_CODE,
  STATE_MANAGEMENT_CODE,
  UI_KIT_SWITCHING_CODE,
  WALLET_COMPONENTS_CODE,
} from './code-snippets';

export function FacadeHooksSection(): React.ReactElement {
  const { isConnected, address, chainId } = useDerivedAccountStatus();
  const { isConnecting, error: connectError } = useDerivedConnectStatus();
  const { currentChainId } = useDerivedChainInfo();
  const { isSwitching } = useDerivedSwitchChainStatus();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code2 className="size-5" />
          Facade Hooks
        </CardTitle>
        <CardDescription>
          Unified React hooks that provide consistent wallet state across all ecosystems. These
          hooks abstract away ecosystem-specific libraries like wagmi.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border bg-muted/30 p-4">
          <h4 className="mb-3 text-sm font-medium">Live Hook Values</h4>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-md bg-background px-3 py-2">
              <span className="text-muted-foreground">isConnected</span>
              <code className={isConnected ? 'text-green-600' : 'text-red-600'}>
                {String(isConnected)}
              </code>
            </div>
            <div className="flex items-center justify-between rounded-md bg-background px-3 py-2">
              <span className="text-muted-foreground">isConnecting</span>
              <code className={isConnecting ? 'text-yellow-600' : 'text-muted-foreground'}>
                {String(isConnecting)}
              </code>
            </div>
            <div className="flex items-center justify-between rounded-md bg-background px-3 py-2">
              <span className="text-muted-foreground">address</span>
              <code className="max-w-[120px] truncate text-xs">
                {address || <span className="text-muted-foreground">—</span>}
              </code>
            </div>
            <div className="flex items-center justify-between rounded-md bg-background px-3 py-2">
              <span className="text-muted-foreground">chainId</span>
              <code>{chainId ?? <span className="text-muted-foreground">—</span>}</code>
            </div>
            <div className="flex items-center justify-between rounded-md bg-background px-3 py-2">
              <span className="text-muted-foreground">currentChainId</span>
              <code>{currentChainId ?? <span className="text-muted-foreground">—</span>}</code>
            </div>
            <div className="flex items-center justify-between rounded-md bg-background px-3 py-2">
              <span className="text-muted-foreground">isSwitching</span>
              <code className={isSwitching ? 'text-yellow-600' : 'text-muted-foreground'}>
                {String(isSwitching)}
              </code>
            </div>
          </div>
          {connectError && (
            <Alert variant="destructive" className="mt-3">
              <AlertDescription className="text-xs">{connectError.message}</AlertDescription>
            </Alert>
          )}
        </div>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="hooks">
            <AccordionTrigger>Available Facade Hooks</AccordionTrigger>
            <AccordionContent>
              <CodeBlock code={FACADE_HOOKS_CODE} language="typescript" />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="benefits">
            <AccordionTrigger>Why use facade hooks?</AccordionTrigger>
            <AccordionContent className="space-y-3">
              <ul className="ml-4 list-disc space-y-2 text-sm text-muted-foreground">
                <li>
                  <strong>Ecosystem agnostic</strong> — Same API whether using EVM, Stellar, or
                  other chains
                </li>
                <li>
                  <strong>Type-safe</strong> — Full TypeScript support with proper return types
                </li>
                <li>
                  <strong>Derived state</strong> — Computed values that update automatically
                </li>
                <li>
                  <strong>No library lock-in</strong> — Switch wallet libraries without changing
                  component code
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

export function WalletComponentsSection(): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Boxes className="size-5" />
          Wallet UI Components
        </CardTitle>
        <CardDescription>
          The WalletConnectionUI component dynamically renders wallet UI from the active adapter,
          supporting multiple UI kits.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border-2 border-dashed bg-muted/30 p-6">
          <p className="mb-4 text-center text-sm text-muted-foreground">
            Live WalletConnectionUI component from @openzeppelin/ui-react
          </p>
          <div className="flex justify-center">
            <WalletConnectionUI />
          </div>
        </div>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="how">
            <AccordionTrigger>How WalletConnectionUI works</AccordionTrigger>
            <AccordionContent>
              <CodeBlock code={WALLET_COMPONENTS_CODE} language="tsx" />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="components">
            <AccordionTrigger>Component breakdown</AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="space-y-2">
                <div className="rounded-md border bg-background p-3">
                  <h5 className="font-medium">ConnectButton</h5>
                  <p className="text-sm text-muted-foreground">
                    Primary wallet connection trigger. Renders the kit-specific connect UI
                    (RainbowKit modal, custom button, etc.)
                  </p>
                </div>
                <div className="rounded-md border bg-background p-3">
                  <h5 className="font-medium">AccountDisplay</h5>
                  <p className="text-sm text-muted-foreground">
                    Shows connected account information including truncated address, ENS name (if
                    available), and balance.
                  </p>
                </div>
                <div className="rounded-md border bg-background p-3">
                  <h5 className="font-medium">NetworkSwitcher</h5>
                  <p className="text-sm text-muted-foreground">
                    Allows users to switch between supported networks. Shows current network and
                    available options.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

export function UiKitSwitchingSection(): React.ReactElement {
  const { activeAdapter } = useWalletState();
  const [kits, setKits] = useState<AvailableUiKit[]>([]);

  useEffect(() => {
    if (activeAdapter) {
      activeAdapter
        .getAvailableUiKits()
        .then(setKits)
        .catch(() => setKits([]));
    }
  }, [activeAdapter]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="size-5" />
          Runtime UI Kit Switching
        </CardTitle>
        <CardDescription>
          Switch between wallet UI kits (RainbowKit, custom) at runtime without losing connection
          state.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border bg-muted/30 p-4">
          <h4 className="mb-3 text-sm font-medium">Available UI Kits for Current Adapter</h4>
          {kits.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {kits.map((kit) => (
                <div
                  key={kit.id}
                  className="flex items-center gap-2 rounded-md bg-background px-3 py-2"
                >
                  <div
                    className="size-2 rounded-full"
                    style={{ backgroundColor: kit.id === 'rainbowkit' ? '#7C3AED' : '#10B981' }}
                  />
                  <span className="font-medium">{kit.name}</span>
                  <span className="text-xs text-muted-foreground">({kit.id})</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No adapter active or no UI kits available.
            </p>
          )}
        </div>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="code">
            <AccordionTrigger>Implementing kit switching</AccordionTrigger>
            <AccordionContent>
              <CodeBlock code={UI_KIT_SWITCHING_CODE} language="tsx" />
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="seamless">
            <AccordionTrigger>Seamless switching explained</AccordionTrigger>
            <AccordionContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Kit switching uses <code>reconfigureActiveAdapterUiKit</code> which triggers a
                version bump in WalletStateProvider. This causes the adapter to reconfigure its UI
                kit manager without unmounting the entire provider tree.
              </p>
              <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
                <li>Connection state is preserved across kit switches</li>
                <li>No full page reload required</li>
                <li>Zustand store maintains state across React remounts</li>
                <li>Kit-specific providers are swapped seamlessly</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

export function StateManagementSection(): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="size-5" />
          State Management
        </CardTitle>
        <CardDescription>
          How Zustand and React Context work together to persist wallet state across component
          remounts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="why">
            <AccordionTrigger>Why Zustand for wallet state?</AccordionTrigger>
            <AccordionContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                When switching UI kits (e.g., from Custom to RainbowKit), the wallet provider
                component remounts. Pure React Context would lose state on remount, but Zustand
                stores state outside React&apos;s lifecycle.
              </p>
              <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
                <li>State survives provider remounts</li>
                <li>Selector-based subscriptions minimize re-renders</li>
                <li>Works seamlessly with React Concurrent Features</li>
                <li>No prop drilling needed</li>
              </ul>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="code">
            <AccordionTrigger>Implementation pattern</AccordionTrigger>
            <AccordionContent>
              <CodeBlock code={STATE_MANAGEMENT_CODE} language="typescript" />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
