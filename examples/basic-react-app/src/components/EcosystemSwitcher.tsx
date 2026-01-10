/**
 * Ecosystem Switcher Component
 *
 * A dropdown component that allows users to switch between blockchain ecosystems.
 * Displays the current ecosystem and provides a selection of available options.
 */

import { NetworkIcon } from '@web3icons/react';
import { ChevronDown } from 'lucide-react';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@openzeppelin/ui-components';

import { useEcosystem } from '../context';
import { ecosystemRegistry, getSupportedEcosystems } from '../core/ecosystemManager';

// =============================================================================
// Component
// =============================================================================

/**
 * EcosystemSwitcher
 *
 * Dropdown component for switching between blockchain ecosystems.
 * Integrates with the EcosystemContext to manage global ecosystem state.
 */
export function EcosystemSwitcher(): React.ReactElement {
  const { ecosystem, setEcosystem } = useEcosystem();
  const availableEcosystems = getSupportedEcosystems();

  const currentMeta = ecosystemRegistry[ecosystem];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <NetworkIcon key={ecosystem} network={currentMeta.iconName} size={16} />
          <span className="hidden sm:inline">{currentMeta.name}</span>
          <ChevronDown className="size-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableEcosystems.map((eco) => {
          const meta = ecosystemRegistry[eco];
          return (
            <DropdownMenuItem
              key={eco}
              onClick={() => setEcosystem(eco)}
              className={ecosystem === eco ? 'bg-accent' : ''}
            >
              <NetworkIcon network={meta.iconName} size={16} className="mr-2" />
              {meta.name}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
