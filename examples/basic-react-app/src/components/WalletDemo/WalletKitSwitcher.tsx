/**
 * WalletKitSwitcher
 *
 * A button group component for switching between available wallet UI kits.
 * Fetches available kits from the active runtime and allows runtime switching.
 */

import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@openzeppelin/ui-components';
import { useWalletState } from '@openzeppelin/ui-react';
import type { AvailableUiKit, UiKitName } from '@openzeppelin/ui-types';

export interface WalletKitSwitcherProps {
  selectedKitName: string | null;
  onSelectKitName: (kitName: string) => void;
  onKitsLoaded?: (kits: AvailableUiKit[]) => void;
}

export function WalletKitSwitcher({
  selectedKitName,
  onSelectKitName,
  onKitsLoaded,
}: WalletKitSwitcherProps): React.ReactElement {
  const { activeRuntime, isRuntimeLoading, reconfigureActiveUiKit } = useWalletState();
  const [availableKits, setAvailableKits] = useState<AvailableUiKit[]>([]);
  const [isLoadingKits, setIsLoadingKits] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchKits() {
      if (!activeRuntime?.uiKit) {
        if (!isMounted) return;
        setAvailableKits([]);
        setIsLoadingKits(false);
        return;
      }

      setIsLoadingKits(true);
      try {
        const kits = await activeRuntime.uiKit.getAvailableUiKits();
        if (!isMounted) return;

        setAvailableKits(kits);
        onKitsLoaded?.(kits);

        // Ensure the selected kit is valid for this adapter. Default to first kit (UI Builder behavior).
        if (kits.length > 0 && (!selectedKitName || !kits.some((k) => k.id === selectedKitName))) {
          const defaultKit = kits[0].id;
          reconfigureActiveUiKit({ kitName: defaultKit as UiKitName });
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
  }, [activeRuntime, onKitsLoaded, onSelectKitName, reconfigureActiveUiKit, selectedKitName]);

  const canSelect = !isRuntimeLoading && !isLoadingKits && availableKits.length > 0;

  if (isRuntimeLoading || isLoadingKits) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span className="text-sm">Loading kits...</span>
      </div>
    );
  }

  if (!activeRuntime?.uiKit || availableKits.length === 0) {
    return <span className="text-sm text-muted-foreground">No kits available</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {availableKits.map((kit) => (
        <Button
          key={kit.id}
          size="sm"
          variant={selectedKitName === kit.id ? 'default' : 'outline'}
          disabled={!canSelect}
          onClick={() => {
            reconfigureActiveUiKit({ kitName: kit.id as UiKitName });
            onSelectKitName(kit.id);
          }}
          className="h-8"
        >
          {kit.name}
        </Button>
      ))}
    </div>
  );
}
