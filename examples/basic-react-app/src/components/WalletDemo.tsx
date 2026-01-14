/**
 * WalletDemo
 *
 * Phase 8 requirements:
 * - Fully interactive (no mocks)
 * - No kit-specific wiring/custom wallet logic
 * - Seamless adapter + UI kit switching (UI Builder parity)
 * - Show real UI kit configs as code previews (no hardcoded strings)
 */

import { Info, Loader2, RefreshCcw, Wallet, Zap } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  useDerivedChainInfo,
  useDerivedConnectStatus,
  useDerivedSwitchChainStatus,
  useWalletState,
  WalletConnectionUI,
} from '@openzeppelin/ui-react';
import type { AvailableUiKit, UiKitConfiguration, UiKitName } from '@openzeppelin/ui-types';

import { useEcosystem } from '../context';
import { useSelectedKitName, useSetSelectedKitName } from '../stores';
import { CodeBlock } from './CodeBlock';
import { DemoSection } from './DemoSection';

// ============================================================================
// Real config source loading (no hardcoded strings)
// ============================================================================

const kitConfigSourceImporters = import.meta.glob('../config/wallet/*.config.ts', { as: 'raw' });
const kitConfigModuleImporters = import.meta.glob('../config/wallet/*.config.ts');

async function loadKitConfigSource(kitName: string): Promise<string | null> {
  const importer = kitConfigSourceImporters[`../config/wallet/${kitName}.config.ts`];
  if (!importer) return null;
  try {
    return (await importer()) as string;
  } catch {
    return null;
  }
}

async function loadKitConfigModule(kitName: string): Promise<Record<string, unknown> | null> {
  const importer = kitConfigModuleImporters[`../config/wallet/${kitName}.config.ts`];
  if (!importer) return null;
  try {
    const mod = (await importer()) as { default?: Record<string, unknown> } & Record<
      string,
      unknown
    >;
    return mod.default || mod;
  } catch {
    return null;
  }
}

function buildAppliedConfigSnippet(kitName: string): string {
  return `import type { UiKitConfiguration } from '@openzeppelin/ui-types';
import { useWalletState } from '@openzeppelin/ui-react';

export function KitSwitcher() {
  const { reconfigureActiveAdapterUiKit } = useWalletState();

  const config: Partial<UiKitConfiguration> = {
    kitName: '${kitName}',
  };

  return (
    <button onClick={() => reconfigureActiveAdapterUiKit(config)}>
      Switch kit
    </button>
  );
}`;
}

// ============================================================================
// Sub-components
// ============================================================================

interface WalletKitSwitcherProps {
  selectedKitName: string | null;
  onSelectKitName: (kitName: string) => void;
  onKitsLoaded?: (kits: AvailableUiKit[]) => void;
}

function WalletKitSwitcher({
  selectedKitName,
  onSelectKitName,
  onKitsLoaded,
}: WalletKitSwitcherProps): React.ReactElement {
  const { activeAdapter, isAdapterLoading, reconfigureActiveAdapterUiKit } = useWalletState();
  const [availableKits, setAvailableKits] = useState<AvailableUiKit[]>([]);
  const [isLoadingKits, setIsLoadingKits] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchKits() {
      if (!activeAdapter) {
        if (!isMounted) return;
        setAvailableKits([]);
        setIsLoadingKits(false);
        return;
      }

      setIsLoadingKits(true);
      try {
        const kits = await activeAdapter.getAvailableUiKits();
        if (!isMounted) return;

        setAvailableKits(kits);
        onKitsLoaded?.(kits);

        // Ensure the selected kit is valid for this adapter. Default to first kit (UI Builder behavior).
        if (kits.length > 0 && (!selectedKitName || !kits.some((k) => k.id === selectedKitName))) {
          const defaultKit = kits[0].id;
          reconfigureActiveAdapterUiKit({ kitName: defaultKit as UiKitName });
          onSelectKitName(defaultKit);
        }
      } catch {
        if (!isMounted) return;
        setAvailableKits([]);
      } finally {
        if (!isMounted) return;
        setIsLoadingKits(false);
      }
    }

    void fetchKits();
    return () => {
      isMounted = false;
    };
  }, [
    activeAdapter,
    onKitsLoaded,
    onSelectKitName,
    reconfigureActiveAdapterUiKit,
    selectedKitName,
  ]);

  const canSelect = !isAdapterLoading && !isLoadingKits && availableKits.length > 0;

  if (isAdapterLoading || isLoadingKits) {
    return (
      <div className="flex items-center gap-2 py-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span className="text-sm">Loading available kits...</span>
      </div>
    );
  }

  if (!activeAdapter || availableKits.length === 0) {
    return (
      <Alert>
        <Info className="size-4" />
        <AlertDescription>No wallet UI kits available for the current adapter.</AlertDescription>
      </Alert>
    );
  }

  if (availableKits.length === 1) {
    return (
      <div className="space-y-1">
        <p className="text-sm">
          <span className="font-medium">Active kit:</span> {availableKits[0].name}
        </p>
        <p className="text-xs text-muted-foreground">
          This adapter exposes a single wallet UI kit.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Wallet UI Kit</label>
      <Select
        value={selectedKitName ?? undefined}
        onValueChange={(nextKitName) => {
          reconfigureActiveAdapterUiKit({ kitName: nextKitName as UiKitName });
          onSelectKitName(nextKitName);
        }}
        disabled={!canSelect}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a wallet kit" />
        </SelectTrigger>
        <SelectContent>
          {availableKits.map((kit) => (
            <SelectItem key={kit.id} value={kit.id}>
              {kit.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">Switch kits at runtime (UI Builder parity).</p>
    </div>
  );
}

function WalletStatusPanel({
  selectedKitName,
}: {
  selectedKitName: string | null;
}): React.ReactElement {
  const { activeAdapter, activeNetworkConfig, isAdapterLoading } = useWalletState();
  const { isConnected, chainId } = useDerivedAccountStatus();
  const { currentChainId } = useDerivedChainInfo();
  const { error: connectError, isConnecting } = useDerivedConnectStatus();
  const { switchChain, error: switchError, isSwitching } = useDerivedSwitchChainStatus();

  const [nativeConfigStatus, setNativeConfigStatus] = useState<
    'none' | 'loading' | 'available' | 'missing' | 'invalid'
  >('none');

  useEffect(() => {
    let isMounted = true;

    async function checkNativeConfig() {
      if (!selectedKitName) {
        if (!isMounted) return;
        setNativeConfigStatus('none');
        return;
      }

      setNativeConfigStatus('loading');
      const config = await loadKitConfigModule(selectedKitName);
      if (!isMounted) return;

      // If a config file exists but fails to load (returns null), treat as missing/invalid.
      // This catches the common case where the kit expects a native config module.
      const importerExists =
        !!kitConfigModuleImporters[`../config/wallet/${selectedKitName}.config.ts`];

      if (!importerExists) {
        setNativeConfigStatus('missing');
        return;
      }

      if (!config) {
        setNativeConfigStatus('invalid');
        return;
      }

      setNativeConfigStatus('available');
    }

    void checkNativeConfig();
    return () => {
      isMounted = false;
    };
  }, [selectedKitName]);

  const walletComponentsAvailability = useMemo(() => {
    if (!activeAdapter) {
      return { isAvailable: false, reason: 'No active adapter.' };
    }

    if (typeof activeAdapter.getEcosystemWalletComponents !== 'function') {
      return { isAvailable: false, reason: 'Adapter does not expose wallet components.' };
    }

    try {
      const comps = activeAdapter.getEcosystemWalletComponents();
      if (!comps)
        return { isAvailable: false, reason: 'No wallet components for this adapter/kit.' };
      return { isAvailable: true, reason: null as string | null };
    } catch {
      return {
        isAvailable: false,
        reason: 'Failed to resolve wallet components (possible context/version mismatch).',
      };
    }
  }, [activeAdapter]);

  const expectedChainId =
    activeNetworkConfig &&
    'chainId' in activeNetworkConfig &&
    typeof activeNetworkConfig.chainId === 'number'
      ? activeNetworkConfig.chainId
      : undefined;
  const hasNetworkMismatch =
    isConnected &&
    typeof expectedChainId === 'number' &&
    typeof currentChainId === 'number' &&
    expectedChainId !== currentChainId;

  const canAttemptSwitch =
    hasNetworkMismatch && typeof expectedChainId === 'number' && typeof switchChain === 'function';

  const isBusy = isAdapterLoading || isConnecting || isSwitching;

  return (
    <div className="space-y-3">
      {isAdapterLoading && (
        <Alert>
          <Loader2 className="size-4 animate-spin" />
          <AlertDescription>Initializing adapter…</AlertDescription>
        </Alert>
      )}

      {!isAdapterLoading && !activeAdapter && (
        <Alert>
          <Info className="size-4" />
          <AlertDescription>
            No active adapter is available for the selected network.
          </AlertDescription>
        </Alert>
      )}

      {selectedKitName && !isBusy && (
        <Alert>
          <Info className="size-4" />
          <AlertDescription>
            Active kit: <span className="font-medium">{selectedKitName}</span>
          </AlertDescription>
        </Alert>
      )}

      {selectedKitName && nativeConfigStatus === 'missing' && (
        <Alert variant="destructive">
          <AlertDescription>
            Native config module is missing for this kit:{' '}
            <span className="font-medium">{selectedKitName}</span>. Add{' '}
            <code>src/config/wallet/{selectedKitName}.config.ts</code> if the kit requires it.
          </AlertDescription>
        </Alert>
      )}

      {selectedKitName && nativeConfigStatus === 'invalid' && (
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load native config module for{' '}
            <span className="font-medium">{selectedKitName}</span>. Check the file exports and
            runtime errors.
          </AlertDescription>
        </Alert>
      )}

      {!walletComponentsAvailability.isAvailable && !isAdapterLoading && (
        <Alert variant="destructive">
          <AlertDescription>{walletComponentsAvailability.reason}</AlertDescription>
        </Alert>
      )}

      {connectError && (
        <Alert variant="destructive">
          <AlertDescription>
            Wallet connection error: <span className="font-medium">{connectError.message}</span>
          </AlertDescription>
        </Alert>
      )}

      {switchError && (
        <Alert variant="destructive">
          <AlertDescription>
            Network switch error: <span className="font-medium">{switchError.message}</span>
          </AlertDescription>
        </Alert>
      )}

      {hasNetworkMismatch && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-col gap-2">
            <span>
              Network mismatch. Wallet chainId <span className="font-medium">{chainId}</span> does
              not match selected network chainId{' '}
              <span className="font-medium">{expectedChainId}</span>.
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!canAttemptSwitch}
                onClick={() => {
                  if (typeof expectedChainId === 'number') {
                    switchChain?.({ chainId: expectedChainId });
                  }
                }}
              >
                <RefreshCcw className="mr-2 size-4" />
                Switch network
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function WalletKitConfigPreview({
  selectedKit,
  selectedKitName,
}: {
  selectedKit: AvailableUiKit | null;
  selectedKitName: string | null;
}): React.ReactElement {
  const [nativeConfigSource, setNativeConfigSource] = useState<string | null>(null);
  const [nativeConfigObject, setNativeConfigObject] = useState<Record<string, unknown> | null>(
    null
  );

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!selectedKitName) {
        if (!isMounted) return;
        setNativeConfigSource(null);
        setNativeConfigObject(null);
        return;
      }

      const [src, mod] = await Promise.all([
        loadKitConfigSource(selectedKitName),
        loadKitConfigModule(selectedKitName),
      ]);

      if (!isMounted) return;
      setNativeConfigSource(src);
      setNativeConfigObject(mod);
    }

    void load();
    return () => {
      isMounted = false;
    };
  }, [selectedKitName]);

  const previews = useMemo(() => {
    if (!selectedKitName) return [];

    const items: Array<{ title: string; code: string; language: 'tsx' | 'typescript' | 'json' }> =
      [];

    // Always show the applied runtime config snippet (adapter-controlled).
    items.push({
      title: 'Applied kit selection (runtime)',
      code: buildAppliedConfigSnippet(selectedKitName),
      language: 'tsx',
    });

    // Prefer adapter-provided default code (UI Builder uses this when available).
    if (selectedKit?.defaultCode) {
      items.push({
        title: 'Kit config (adapter-provided)',
        code: selectedKit.defaultCode,
        language: 'typescript',
      });
      return items;
    }

    // Fall back to the real native config file if present in the example app.
    if (nativeConfigSource) {
      items.push({
        title: `Native config file: src/config/wallet/${selectedKitName}.config.ts`,
        code: nativeConfigSource,
        language: 'typescript',
      });
      return items;
    }

    // Final fallback: show the imported module object if it exists.
    if (nativeConfigObject) {
      items.push({
        title: `Native config module (loaded): ${selectedKitName}.config.ts`,
        code: JSON.stringify(nativeConfigObject, null, 2),
        language: 'json',
      });
    }

    return items;
  }, [nativeConfigObject, nativeConfigSource, selectedKit?.defaultCode, selectedKitName]);

  if (!selectedKitName) {
    return (
      <Alert>
        <Info className="size-4" />
        <AlertDescription>Select a kit to view its configuration.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {!selectedKit?.defaultCode && !nativeConfigSource && !nativeConfigObject && (
        <Alert variant="destructive">
          <AlertDescription>
            No config preview is available for{' '}
            <span className="font-medium">{selectedKitName}</span>. The adapter did not provide{' '}
            <code>defaultCode</code> and there is no matching native config module under{' '}
            <code>src/config/wallet</code>.
          </AlertDescription>
        </Alert>
      )}
      {previews.map((p) => (
        <div key={p.title} className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{p.title}</p>
          <CodeBlock code={p.code} language={p.language} />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function WalletDemo(): React.ReactElement {
  const { ecosystem } = useEcosystem();

  const [tab, setTab] = useState<'demo' | 'config' | 'status'>('demo');
  // Use Zustand store for selectedKitName to survive React remounts
  // (RainbowKit provider changes cause the component tree to remount)
  const selectedKitName = useSelectedKitName();
  const setSelectedKitName = useSetSelectedKitName();
  const [kits, setKits] = useState<AvailableUiKit[]>([]);

  const selectedKit = useMemo(
    () => (selectedKitName ? (kits.find((k) => k.id === selectedKitName) ?? null) : null),
    [kits, selectedKitName]
  );

  const appliedUiKitConfig = useMemo<Partial<UiKitConfiguration> | null>(() => {
    if (!selectedKitName) return null;
    return { kitName: selectedKitName as UiKitName };
  }, [selectedKitName]);

  const handleKitsLoaded = useCallback((nextKits: AvailableUiKit[]) => {
    setKits(nextKits);
  }, []);

  return (
    <DemoSection
      title="Wallet Integration"
      description="Live wallet connection demo driven entirely by adapters and @openzeppelin/ui-react (UI Builder parity). Switch ecosystems, networks, and wallet UI kits at runtime."
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="demo">Live</TabsTrigger>
          <TabsTrigger value="config">Config</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
        </TabsList>

        <TabsContent value="demo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="size-5" />
                Wallet Connection
              </CardTitle>
              <CardDescription>Connect, then switch UI kits without mocks.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed bg-muted/30 p-6">
                <WalletConnectionUI className="justify-center" />
              </div>

              <div className="text-xs text-muted-foreground">
                Active ecosystem: <span className="font-medium">{ecosystem}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="size-4" />
                Wallet UI Kit
              </CardTitle>
              <CardDescription className="text-sm">
                Available kits come from the active adapter.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <WalletKitSwitcher
                selectedKitName={selectedKitName}
                onSelectKitName={setSelectedKitName}
                onKitsLoaded={handleKitsLoaded}
              />

              {appliedUiKitConfig && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Applied UiKitConfiguration
                  </p>
                  <CodeBlock code={JSON.stringify(appliedUiKitConfig, null, 2)} language="json" />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Kit Configuration Preview</CardTitle>
              <CardDescription>
                Uses adapter metadata and real native config modules from{' '}
                <code>src/config/wallet</code> (no hardcoded strings).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WalletKitConfigPreview selectedKit={selectedKit} selectedKitName={selectedKitName} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Runtime Status</CardTitle>
              <CardDescription>
                Derived from real adapter + hook state (connection errors, network mismatch, etc.).
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
