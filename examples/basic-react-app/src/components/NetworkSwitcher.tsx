/**
 * Network Switcher Component
 *
 * Global selector that switches the app's active network across ecosystems.
 * Selecting an entry drives `useEcosystem().setNetwork`, which the ecosystem
 * store bridges to the app-wide `WalletStateProvider` (swapping ecosystem,
 * network, and runtime in one step). Every demo that reads the active runtime
 * — address validation, explorer links, ENS name resolution — follows it.
 */

import { ChevronDown } from 'lucide-react';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@openzeppelin/ui-components';

import { useEcosystem } from '../context';
import { getNetworkById } from '../core/ecosystemManager';
import { NETWORK_OPTIONS } from './networkOptions';
import { Web3NetworkIcon } from './Web3NetworkIcon';

// =============================================================================
// Component
// =============================================================================

/**
 * Dropdown for switching the app-wide active network across ecosystems.
 * Integrates with `EcosystemContext` so the whole app reacts to the change.
 */
export function NetworkSwitcher(): React.ReactElement {
  const { network, setNetwork, isLoading } = useEcosystem();

  const activeOption = NETWORK_OPTIONS.find((option) => option.id === network?.id);

  const handleSelect = (id: string): void => {
    if (id === network?.id) {
      return;
    }
    void getNetworkById(id).then((config) => {
      if (config) {
        void setNetwork(config);
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={isLoading}>
          {activeOption && (
            <Web3NetworkIcon key={activeOption.id} network={activeOption.icon} size={16} />
          )}
          <span className="hidden sm:inline">
            {activeOption?.label ?? network?.name ?? 'Select network'}
          </span>
          <ChevronDown className="size-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {NETWORK_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.id}
            onClick={() => handleSelect(option.id)}
            className={network?.id === option.id ? 'bg-accent' : ''}
          >
            <Web3NetworkIcon network={option.icon} size={16} className="mr-2" />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
