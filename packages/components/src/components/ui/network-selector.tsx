import { Check, ChevronDown, Search } from 'lucide-react';
import * as React from 'react';

import type { NetworkType } from '@openzeppelin/ui-types';
import { cn } from '@openzeppelin/ui-utils';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
} from '.';

interface NetworkSelectorBaseProps<T> {
  networks: T[];
  getNetworkLabel: (network: T) => string;
  getNetworkIcon?: (network: T) => React.ReactNode;
  getNetworkType?: (network: T) => NetworkType | undefined;
  getNetworkId: (network: T) => string;
  groupByEcosystem?: boolean;
  getEcosystem?: (network: T) => string;
  filterNetwork?: (network: T, query: string) => boolean;
  className?: string;
  placeholder?: string;
}

interface SingleSelectProps<T> {
  multiple?: false;
  selectedNetwork: T | null;
  onSelectNetwork: (network: T) => void;
  selectedNetworkIds?: never;
  onSelectionChange?: never;
  renderTrigger?: never;
}

interface MultiSelectProps<_T> {
  multiple: true;
  selectedNetworkIds: string[];
  onSelectionChange: (ids: string[]) => void;
  /** Override the default trigger button with a custom element. */
  renderTrigger?: (props: { selectedCount: number; open: boolean }) => React.ReactNode;
  selectedNetwork?: never;
  onSelectNetwork?: never;
}

export type NetworkSelectorProps<T> = NetworkSelectorBaseProps<T> &
  (SingleSelectProps<T> | MultiSelectProps<T>);

/** Searchable dropdown selector for blockchain networks with optional grouping and multi-select. */
export function NetworkSelector<T>({
  networks,
  getNetworkLabel,
  getNetworkIcon,
  getNetworkType,
  getNetworkId,
  groupByEcosystem = false,
  getEcosystem,
  filterNetwork,
  className,
  placeholder = 'Select Network',
  ...modeProps
}: NetworkSelectorProps<T>): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const isMultiple = modeProps.multiple === true;

  const selectedNetworkIds = isMultiple ? modeProps.selectedNetworkIds : undefined;
  const onSelectionChange = isMultiple ? modeProps.onSelectionChange : undefined;
  const selectedNetwork = !isMultiple ? modeProps.selectedNetwork : undefined;
  const onSelectNetwork = !isMultiple ? modeProps.onSelectNetwork : undefined;

  const filteredNetworks = React.useMemo(() => {
    if (!searchQuery) return networks;
    if (filterNetwork) return networks.filter((n) => filterNetwork(n, searchQuery));
    return networks.filter((n) =>
      getNetworkLabel(n).toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [networks, searchQuery, filterNetwork, getNetworkLabel]);

  const groupedNetworks = React.useMemo(() => {
    if (!groupByEcosystem || !getEcosystem) {
      return { All: filteredNetworks };
    }
    return filteredNetworks.reduce(
      (acc, network) => {
        const ecosystem = getEcosystem(network);
        if (!acc[ecosystem]) {
          acc[ecosystem] = [];
        }
        acc[ecosystem].push(network);
        return acc;
      },
      {} as Record<string, T[]>
    );
  }, [filteredNetworks, groupByEcosystem, getEcosystem]);

  const isSelected = React.useCallback(
    (network: T): boolean => {
      if (isMultiple && selectedNetworkIds) {
        return selectedNetworkIds.includes(getNetworkId(network));
      }
      return selectedNetwork ? getNetworkId(selectedNetwork) === getNetworkId(network) : false;
    },
    [isMultiple, selectedNetworkIds, selectedNetwork, getNetworkId]
  );

  const handleSelect = React.useCallback(
    (network: T) => {
      if (isMultiple && selectedNetworkIds && onSelectionChange) {
        const id = getNetworkId(network);
        const next = selectedNetworkIds.includes(id)
          ? selectedNetworkIds.filter((x) => x !== id)
          : [...selectedNetworkIds, id];
        onSelectionChange(next);
      } else if (onSelectNetwork) {
        onSelectNetwork(network);
        setOpen(false);
      }
    },
    [isMultiple, selectedNetworkIds, onSelectionChange, onSelectNetwork, getNetworkId]
  );

  const handleClearAll = React.useCallback(() => {
    if (isMultiple && onSelectionChange) {
      onSelectionChange([]);
    }
  }, [isMultiple, onSelectionChange]);

  const selectedCount = selectedNetworkIds?.length ?? 0;
  const renderTrigger = isMultiple ? modeProps.renderTrigger : undefined;

  const triggerContent = (() => {
    if (isMultiple && renderTrigger) {
      return renderTrigger({ selectedCount, open });
    }

    if (isMultiple) {
      return (
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', className)}
        >
          <span className="truncate text-muted-foreground">
            {selectedCount > 0
              ? `${selectedCount} network${selectedCount > 1 ? 's' : ''} selected`
              : placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      );
    }

    return (
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className={cn('w-full justify-between', className)}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedNetwork ? (
            <>
              {getNetworkIcon?.(selectedNetwork)}
              <span className="truncate">{getNetworkLabel(selectedNetwork)}</span>
              {getNetworkType && (
                <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                  {getNetworkType(selectedNetwork)}
                </span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    );
  })();

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{triggerContent}</DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[--radix-dropdown-menu-trigger-width] min-w-[240px] p-0"
        align="start"
      >
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            placeholder="Search network..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter') {
                e.stopPropagation();
              }
            }}
            className="h-9 w-full border-0 bg-transparent p-0 placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
            aria-label="Search networks"
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto p-1">
          {isMultiple && selectedCount > 0 && (
            <>
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {selectedCount} selected
                </span>
                <button
                  onClick={handleClearAll}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear all
                </button>
              </div>
              <DropdownMenuSeparator />
            </>
          )}

          {Object.entries(groupedNetworks).length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No network found.</div>
          ) : (
            Object.entries(groupedNetworks).map(([group, groupNetworks], index) => (
              <React.Fragment key={group}>
                {groupByEcosystem && (
                  <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                    {group}
                  </DropdownMenuLabel>
                )}
                <DropdownMenuGroup>
                  {groupNetworks.map((network) => (
                    <DropdownMenuItem
                      key={getNetworkId(network)}
                      onSelect={(e) => {
                        if (isMultiple) e.preventDefault();
                        handleSelect(network);
                      }}
                      className="gap-2"
                    >
                      {isMultiple ? (
                        <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary">
                          {isSelected(network) && <Check className="h-3 w-3" />}
                        </div>
                      ) : null}
                      {getNetworkIcon?.(network)}
                      <div className="flex flex-1 items-center gap-2 min-w-0">
                        <span className="truncate">{getNetworkLabel(network)}</span>
                        {getNetworkType && (
                          <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                            {getNetworkType(network)}
                          </span>
                        )}
                      </div>
                      {!isMultiple && isSelected(network) && (
                        <Check className="h-4 w-4 opacity-100" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                {index < Object.keys(groupedNetworks).length - 1 && <DropdownMenuSeparator />}
              </React.Fragment>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
