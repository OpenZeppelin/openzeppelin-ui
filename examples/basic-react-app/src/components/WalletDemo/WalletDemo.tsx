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

import { ArrowDown, ArrowRight, BookOpen, Code2, Info, Layers } from 'lucide-react';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@openzeppelin/ui-components';
import { WalletConnectionUI } from '@openzeppelin/ui-react';
import type { AvailableUiKit } from '@openzeppelin/ui-types';

import {
  useSelectedKitName,
  useSetSelectedKitName,
  useSetWalletDemoTab,
  useWalletDemoTab,
  type WalletDemoTab,
} from '../../stores';
import { DemoSection } from '../DemoSection';
import { EcosystemSwitcher } from '../EcosystemSwitcher';
import {
  FacadeHooksSection,
  StateManagementSection,
  UiKitSwitchingSection,
  WalletComponentsSection,
} from './LearnSections';
import { WalletKitConfigPreview } from './WalletKitConfigPreview';
import { WalletKitSwitcher } from './WalletKitSwitcher';
import { WalletStatusPanel } from './WalletStatusPanel';

export function WalletDemo(): React.ReactElement {
  // Use Zustand store for tab and selectedKitName to survive React remounts
  // (RainbowKit provider changes cause the component tree to remount)
  const tab = useWalletDemoTab();
  const setTab = useSetWalletDemoTab();
  const selectedKitName = useSelectedKitName();
  const setSelectedKitName = useSetSelectedKitName();
  const [kits, setKits] = useState<AvailableUiKit[]>([]);

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
                Ecosystem
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

      {/* Tabs for Learn/Config/Status */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as WalletDemoTab)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="learn" className="gap-1.5">
            <BookOpen className="size-3.5" />
            Learn
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
              <strong>Architecture</strong> page for how adapters work across all ecosystems.
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
