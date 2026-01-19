/**
 * WalletDemo
 *
 * Main wallet demo component that orchestrates the wallet integration demo.
 * Shows live wallet connection, kit switching, configuration, and status.
 *
 * Phase 8 requirements:
 * - Fully interactive (no mocks)
 * - No kit-specific wiring/custom wallet logic
 * - Seamless adapter + UI kit switching (UI Builder parity)
 * - Show real UI kit configs as code previews (no hardcoded strings)
 */

import { ArrowDown, ArrowRight, BookOpen, Code2, Info, Layers, Palette } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@openzeppelin/ui-components';
import {
  useDerivedAccountStatus,
  useWalletComponents,
  WalletConnectionUI,
} from '@openzeppelin/ui-react';
import type {
  AvailableUiKit,
  WalletComponentSize,
  WalletComponentVariant,
} from '@openzeppelin/ui-types';

import {
  useSelectedKitName,
  useSetSelectedKitName,
  useSetWalletDemoTab,
  useWalletDemoTab,
  type WalletDemoTab,
} from '../../stores';
import { CodeBlock } from '../CodeBlock';
import { DemoSection } from '../DemoSection';
import { EcosystemSwitcher } from '../EcosystemSwitcher';
import {
  USE_WALLET_COMPONENTS_EXAMPLE,
  USE_WALLET_COMPONENTS_SIGNATURE,
  WALLET_CONNECTION_UI_EXAMPLE,
} from './code-snippets';
import {
  FacadeHooksSection,
  StateManagementSection,
  UiKitSwitchingSection,
  WalletComponentsSection,
} from './LearnSections';
import { WalletKitConfigPreview } from './WalletKitConfigPreview';
import { WalletKitSwitcher } from './WalletKitSwitcher';
import { WalletStatusPanel } from './WalletStatusPanel';

/**
 * Demo component showing custom layout with useWalletComponents hook
 */
function CustomLayoutDemo(): React.ReactElement {
  const walletComponents = useWalletComponents();
  const { isConnected } = useDerivedAccountStatus();

  if (!walletComponents) {
    return (
      <div className="text-center text-sm text-muted-foreground">Loading wallet components...</div>
    );
  }

  const { ConnectButton, NetworkSwitcher, AccountDisplay } = walletComponents;

  // Show different layouts for connected vs disconnected state
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="text-center space-y-2">
          <h4 className="font-semibold text-lg">Connect Your Wallet</h4>
          <p className="text-sm text-muted-foreground max-w-xs">
            Connect to access the full custom layout demo with styled components
          </p>
        </div>
        {ConnectButton && (
          <ConnectButton
            size="xl"
            variant="default"
            className="font-bold shadow-lg hover:shadow-xl transition-shadow"
          />
        )}
      </div>
    );
  }

  // Connected state - show rich custom layout
  return (
    <div className="space-y-4">
      {/* Header with gradient background */}
      <div className="rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Large styled account display */}
            {AccountDisplay && (
              <AccountDisplay size="lg" variant="ghost" className="font-mono text-primary" />
            )}
          </div>
          {/* Styled network switcher */}
          {NetworkSwitcher && (
            <NetworkSwitcher size="default" variant="outline" className="border-primary/30" />
          )}
        </div>
      </div>

      {/* Action buttons row */}
      <div className="flex gap-2">
        {ConnectButton && <ConnectButton size="sm" variant="secondary" className="flex-1" />}
      </div>

      {/* Info footer */}
      <div className="rounded-md bg-muted/50 p-3 text-center">
        <p className="text-xs text-muted-foreground">
          Custom layout using <code className="text-primary">useWalletComponents()</code> hook
        </p>
      </div>
    </div>
  );
}

export function WalletDemo(): React.ReactElement {
  // Use Zustand store for tab and selectedKitName to survive React remounts
  // (RainbowKit provider changes cause the component tree to remount)
  const tab = useWalletDemoTab();
  const setTab = useSetWalletDemoTab();
  const selectedKitName = useSelectedKitName();
  const setSelectedKitName = useSetSelectedKitName();
  const [kits, setKits] = useState<AvailableUiKit[]>([]);

  // Customization state for testing new props
  const [buttonSize, setButtonSize] = useState<WalletComponentSize>('default');
  const [buttonVariant, setButtonVariant] = useState<WalletComponentVariant>('outline');
  const [fullWidth, setFullWidth] = useState(false);

  const selectedKit = useMemo(
    () => (selectedKitName ? (kits.find((k) => k.id === selectedKitName) ?? null) : null),
    [kits, selectedKitName]
  );

  const handleKitsLoaded = useCallback((nextKits: AvailableUiKit[]) => {
    setKits(nextKits);
  }, []);

  return (
    <DemoSection
      title="Wallet Integration"
      description="Live wallet connection demo driven entirely by adapters and @openzeppelin/ui-react. Switch kits and see changes in real-time."
    >
      {/* Always-visible Live Wallet Section */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Labels Row */}
            <div className="hidden items-center gap-2 sm:flex sm:gap-3">
              <span className="min-w-[120px] text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Adapter
              </span>
              <span className="size-4" /> {/* Spacer for arrow alignment */}
              <span className="flex-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Available Kits
              </span>
              <span className="size-4" /> {/* Spacer for arrow alignment */}
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Wallet
              </span>
            </div>

            {/* Components Row */}
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <div className="min-w-[100px] sm:min-w-[120px]">
                <EcosystemSwitcher />
              </div>
              <ArrowDown className="mx-auto size-4 text-muted-foreground/40 sm:hidden" />
              <ArrowRight className="hidden size-4 text-muted-foreground/40 sm:block" />
              <div className="flex-1">
                <WalletKitSwitcher
                  selectedKitName={selectedKitName}
                  onSelectKitName={setSelectedKitName}
                  onKitsLoaded={handleKitsLoaded}
                />
              </div>
              <ArrowDown className="mx-auto size-4 text-muted-foreground/40 sm:hidden" />
              <ArrowRight className="hidden size-4 text-muted-foreground/40 sm:block" />
              <div className="flex items-center justify-center rounded-lg border border-dashed bg-muted/30 px-4 py-3">
                <WalletConnectionUI className="justify-center" />
              </div>
            </div>

            {/* Helper text */}
            <p className="-mt-2 text-xs text-muted-foreground">
              Toggle between kits to see their documentation, configuration and status below.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Learn/Customize/Config/Status */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as WalletDemoTab)} className="w-full">
        {/* NOTE: grid-cols-4 is coupled to the number of TabsTrigger items below. Update this when adding/removing tabs. */}
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="learn" className="gap-1.5">
            <BookOpen className="size-3.5" />
            Learn
          </TabsTrigger>
          <TabsTrigger value="customize" className="gap-1.5">
            <Palette className="size-3.5" />
            Customize
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-1.5">
            <Code2 className="size-3.5" />
            Config
          </TabsTrigger>
          <TabsTrigger value="status" className="gap-1.5">
            <Info className="size-3.5" />
            Status
          </TabsTrigger>
        </TabsList>

        <TabsContent value="learn" className="mt-6 space-y-6">
          <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
            <Layers className="size-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              Wallet integration is powered by adapters and facade hooks. See the{' '}
              <strong>Architecture</strong> page for how adapters work.
            </AlertDescription>
          </Alert>

          <WalletComponentsSection />
          <FacadeHooksSection />
          <UiKitSwitchingSection />
          <StateManagementSection />

          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="rounded-full bg-muted p-3">
                <Code2 className="size-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Ready to implement?</p>
                <p className="text-sm text-muted-foreground">
                  Check the Config and Status tabs to see real configuration and live state from the
                  hooks.
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setTab('config')}>
                  View Config
                </Button>
                <Button size="sm" variant="outline" onClick={() => setTab('status')}>
                  View Status
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customize" className="mt-6 space-y-6">
          {/* Interactive Playground */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="size-5" />
                Interactive Playground
              </CardTitle>
              <CardDescription>
                Test the customization props on wallet components in real-time.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Controls */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="size-select">Size</Label>
                  <Select
                    value={buttonSize}
                    onValueChange={(v) => setButtonSize(v as WalletComponentSize)}
                  >
                    <SelectTrigger id="size-select">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sm">Small (sm)</SelectItem>
                      <SelectItem value="default">Default</SelectItem>
                      <SelectItem value="lg">Large (lg)</SelectItem>
                      <SelectItem value="xl">Extra Large (xl)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="variant-select">Variant</Label>
                  <Select
                    value={buttonVariant}
                    onValueChange={(v) => setButtonVariant(v as WalletComponentVariant)}
                  >
                    <SelectTrigger id="variant-select">
                      <SelectValue placeholder="Select variant" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outline">Outline (default)</SelectItem>
                      <SelectItem value="default">Filled</SelectItem>
                      <SelectItem value="ghost">Ghost</SelectItem>
                      <SelectItem value="secondary">Secondary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullwidth-select">Full Width</Label>
                  <Select
                    value={fullWidth ? 'true' : 'false'}
                    onValueChange={(v) => setFullWidth(v === 'true')}
                  >
                    <SelectTrigger id="fullwidth-select">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">No</SelectItem>
                      <SelectItem value="true">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-3">
                <Label>Preview</Label>
                <div className="rounded-lg border border-dashed bg-muted/30 p-6">
                  <WalletConnectionUI
                    connectButtonProps={{
                      size: buttonSize,
                      variant: buttonVariant,
                      fullWidth: fullWidth,
                    }}
                    accountDisplayProps={{
                      size: buttonSize,
                      variant: buttonVariant,
                    }}
                    networkSwitcherProps={{
                      size: buttonSize,
                    }}
                  />
                </div>
              </div>

              {/* Size Comparison */}
              <div className="space-y-3">
                <Label>Size Comparison</Label>
                <div className="space-y-4 rounded-lg border border-dashed bg-muted/30 p-6">
                  {(['sm', 'default', 'lg', 'xl'] as WalletComponentSize[]).map((size) => (
                    <div key={size} className="flex items-center gap-4">
                      <span className="w-20 text-xs font-medium text-muted-foreground">{size}</span>
                      <WalletConnectionUI
                        connectButtonProps={{ size, variant: 'outline' }}
                        accountDisplayProps={{ size }}
                        networkSwitcherProps={{ size }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Reference */}
          <Card>
            <CardHeader>
              <CardTitle>Customization API Reference</CardTitle>
              <CardDescription>
                Two approaches for customizing wallet components: using{' '}
                <code>WalletConnectionUI</code> props or the <code>useWalletComponents</code> hook.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Approach 1: WalletConnectionUI */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold">Approach 1: WalletConnectionUI Props</h4>
                  <p className="text-sm text-muted-foreground">
                    Use the pre-built component with prop forwarding. Best for standard layouts.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>WalletConnectionUIProps</Label>
                  <div className="overflow-x-auto rounded-lg bg-muted p-4">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="py-2 text-left font-medium">Prop</th>
                          <th className="py-2 text-left font-medium">Type</th>
                          <th className="py-2 text-left font-medium">Description</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono">
                        <tr className="border-b border-dashed">
                          <td className="py-2 text-blue-600 dark:text-blue-400">className</td>
                          <td className="py-2 text-muted-foreground">string</td>
                          <td className="py-2 font-sans">Classes for the wrapper container</td>
                        </tr>
                        <tr className="border-b border-dashed">
                          <td className="py-2 text-blue-600 dark:text-blue-400">
                            connectButtonProps
                          </td>
                          <td className="py-2 text-muted-foreground">BaseComponentProps</td>
                          <td className="py-2 font-sans">Props forwarded to ConnectButton</td>
                        </tr>
                        <tr className="border-b border-dashed">
                          <td className="py-2 text-blue-600 dark:text-blue-400">
                            accountDisplayProps
                          </td>
                          <td className="py-2 text-muted-foreground">BaseComponentProps</td>
                          <td className="py-2 font-sans">Props forwarded to AccountDisplay</td>
                        </tr>
                        <tr>
                          <td className="py-2 text-blue-600 dark:text-blue-400">
                            networkSwitcherProps
                          </td>
                          <td className="py-2 text-muted-foreground">BaseComponentProps</td>
                          <td className="py-2 font-sans">Props forwarded to NetworkSwitcher</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Example</Label>
                  <CodeBlock language="tsx" code={WALLET_CONNECTION_UI_EXAMPLE} />
                </div>
              </div>

              {/* Approach 2: useWalletComponents Hook */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold">Approach 2: useWalletComponents Hook</h4>
                  <p className="text-sm text-muted-foreground">
                    Get direct access to individual components for full layout control.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Hook Signature</Label>
                  <CodeBlock language="typescript" code={USE_WALLET_COMPONENTS_SIGNATURE} />
                </div>

                <div className="space-y-2">
                  <Label>Example: Custom Layout</Label>
                  <CodeBlock language="tsx" code={USE_WALLET_COMPONENTS_EXAMPLE} />
                </div>

                {/* Live Demo of useWalletComponents */}
                <div className="space-y-2">
                  <Label>Live Demo: Custom Layout with Hook</Label>
                  <div className="rounded-lg border border-dashed bg-muted/30 p-6">
                    <CustomLayoutDemo />
                  </div>
                </div>
              </div>

              {/* BaseComponentProps Reference */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold">BaseComponentProps Reference</h4>
                  <p className="text-sm text-muted-foreground">
                    All wallet components accept these props for customization.
                  </p>
                </div>

                <div className="overflow-x-auto rounded-lg bg-muted p-4">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 text-left font-medium">Prop</th>
                        <th className="py-2 text-left font-medium">Type</th>
                        <th className="py-2 text-left font-medium">Default</th>
                        <th className="py-2 text-left font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      <tr className="border-b border-dashed">
                        <td className="py-2 text-blue-600 dark:text-blue-400">className</td>
                        <td className="py-2 text-muted-foreground">string</td>
                        <td className="py-2 text-muted-foreground">-</td>
                        <td className="py-2 font-sans">Additional CSS classes</td>
                      </tr>
                      <tr className="border-b border-dashed">
                        <td className="py-2 text-blue-600 dark:text-blue-400">size</td>
                        <td className="py-2 text-muted-foreground">
                          {`'sm' | 'default' | 'lg' | 'xl'`}
                        </td>
                        <td className="py-2 text-muted-foreground">{`'default'`}</td>
                        <td className="py-2 font-sans">Component size preset</td>
                      </tr>
                      <tr className="border-b border-dashed">
                        <td className="py-2 text-blue-600 dark:text-blue-400">variant</td>
                        <td className="py-2 text-muted-foreground">
                          {`'outline' | 'default' | 'ghost' | 'secondary'`}
                        </td>
                        <td className="py-2 text-muted-foreground">{`'outline'`}</td>
                        <td className="py-2 font-sans">Visual style variant</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-blue-600 dark:text-blue-400">fullWidth</td>
                        <td className="py-2 text-muted-foreground">boolean</td>
                        <td className="py-2 text-muted-foreground">false</td>
                        <td className="py-2 font-sans">Expand to fill container width</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Size Reference */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold">Size Reference</h4>
                  <p className="text-sm text-muted-foreground">
                    Approximate dimensions for each size preset.
                  </p>
                </div>

                <div className="overflow-x-auto rounded-lg bg-muted p-4">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 text-left font-medium">Size</th>
                        <th className="py-2 text-left font-medium">Height</th>
                        <th className="py-2 text-left font-medium">Padding</th>
                        <th className="py-2 text-left font-medium">Text</th>
                        <th className="py-2 text-left font-medium">Use Case</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      <tr className="border-b border-dashed">
                        <td className="py-2 text-blue-600 dark:text-blue-400">sm</td>
                        <td className="py-2">32px (h-8)</td>
                        <td className="py-2">8px (px-2)</td>
                        <td className="py-2">12px (text-xs)</td>
                        <td className="py-2 font-sans">Compact headers, toolbars</td>
                      </tr>
                      <tr className="border-b border-dashed">
                        <td className="py-2 text-blue-600 dark:text-blue-400">default</td>
                        <td className="py-2">36px (h-9)</td>
                        <td className="py-2">12px (px-3)</td>
                        <td className="py-2">14px (text-sm)</td>
                        <td className="py-2 font-sans">Standard UI elements</td>
                      </tr>
                      <tr className="border-b border-dashed">
                        <td className="py-2 text-blue-600 dark:text-blue-400">lg</td>
                        <td className="py-2">40px (h-10)</td>
                        <td className="py-2">16px (px-4)</td>
                        <td className="py-2">16px (text-base)</td>
                        <td className="py-2 font-sans">Prominent actions</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-blue-600 dark:text-blue-400">xl</td>
                        <td className="py-2">48px (h-12)</td>
                        <td className="py-2">24px (px-6)</td>
                        <td className="py-2">16px (text-base)</td>
                        <td className="py-2 font-sans">Hero sections, landing pages</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code2 className="size-5" />
                Kit Configuration Preview
              </CardTitle>
              <CardDescription>
                Real configuration from <code>src/config/wallet</code> — no hardcoded strings.
                Adapter metadata and native config modules are loaded dynamically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WalletKitConfigPreview selectedKit={selectedKit} selectedKitName={selectedKitName} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="size-5" />
                Runtime Status
              </CardTitle>
              <CardDescription>
                Live state derived from real adapter + facade hooks. Shows connection errors,
                network mismatches, and component availability.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WalletStatusPanel selectedKitName={selectedKitName} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DemoSection>
  );
}
