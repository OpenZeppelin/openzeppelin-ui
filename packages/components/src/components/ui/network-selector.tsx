/**
 * NetworkSelector (SF-17): the network picker, built on the kit's internal
 * searchable select core (SF-15). The core owns the popover, the search
 * combobox, the listbox, filtering and the keyboard model. This file adapts
 * the network props onto it and keeps today's copy, trigger markup, option
 * text, group headers and emitted values (INV-1).
 *
 * Stateless apart from `useId` (INV-16), with no effects (INV-23), no throws
 * and no console output (INV-15).
 */
import { Slot } from '@radix-ui/react-slot';
import { Check, ChevronDown } from 'lucide-react';
import * as React from 'react';

import type { NetworkType } from '@openzeppelin/ui-types';
import { cn } from '@openzeppelin/ui-utils';

import { toggleId } from './searchable-multi-select/list-model';
import {
  SearchableSelectCore,
  type ListHeaderContext,
  type ListName,
  type OptionState,
  type TriggerState,
} from './searchable-multi-select/searchable-select-core';

import { Button } from './button';

// INV-10: the pre-rebuild network copy, character for character. Every string is overridable.
const DEFAULT_PLACEHOLDER = 'Select Network';
const DEFAULT_SEARCH_PLACEHOLDER = 'Search network...';
const DEFAULT_SEARCH_LABEL = 'Search networks';
const DEFAULT_EMPTY_TEXT = 'No network found.';
const DEFAULT_CLEAR_ALL_LABEL = 'Clear all';
const defaultFormatSelectedCount = (count: number): string =>
  `${count} network${count > 1 ? 's' : ''} selected`;
const defaultFormatSelectionSummary = (count: number): string => `${count} selected`;

/**
 * INV-6: the group key when grouping is on without `getEcosystem`, which keeps
 * the visible "All" header. Module-level so the adapter keeps its identity (INV-22).
 */
const UNGROUPED_KEY = 'All';
const groupAsAll = (): string => UNGROUPED_KEY;

const TYPE_CHIP_CLASS =
  'shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground';
const DISABLED_PILL_CLASS =
  'shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground';
const CHEVRON_CLASS = 'ml-2 h-4 w-4 shrink-0 opacity-50';

interface NetworkSelectorBaseProps<T> {
  networks: T[];
  getNetworkLabel: (network: T) => string;
  getNetworkIcon?: (network: T) => React.ReactNode;
  getNetworkType?: (network: T) => NetworkType | undefined;
  getNetworkId: (network: T) => string;
  groupByEcosystem?: boolean;
  getEcosystem?: (network: T) => string;
  /**
   * Custom match rule. Called only for a non-empty query, with the query exactly
   * as typed. Default: case-insensitive substring match on the label.
   */
  filterNetwork?: (network: T, query: string) => boolean;
  /** When true, the network cannot be selected */
  isNetworkDisabled?: (network: T) => boolean;
  /** Optional label for disabled networks (e.g. "Self-host required") */
  getNetworkDisabledLabel?: (network: T) => string | undefined;
  className?: string;
  /** Trigger text when nothing is selected. Default `'Select Network'`. */
  placeholder?: string;
  /** Search box placeholder. Default `'Search network...'`. */
  searchPlaceholder?: string;
  /** Search box accessible name. Default `'Search networks'`. */
  searchLabel?: string;
  /** Shown and announced when the query matches nothing. Default `'No network found.'`. */
  emptyText?: string;
}

interface SingleSelectProps<T> {
  multiple?: false;
  selectedNetwork: T | null;
  onSelectNetwork: (network: T) => void;
  selectedNetworkIds?: never;
  onSelectionChange?: never;
  renderTrigger?: never;
  formatSelectedCount?: never;
  formatSelectionSummary?: never;
  clearAllLabel?: never;
}

interface MultiSelectProps<_T> {
  multiple: true;
  selectedNetworkIds: string[];
  onSelectionChange: (ids: string[]) => void;
  /**
   * Override the default trigger button with a custom element. It must be a
   * single element that forwards its ref and spreads unknown props onto a
   * focusable element. It keeps its own role; it receives `id`,
   * `aria-haspopup`, `aria-expanded`, `aria-controls` and the open handlers.
   */
  renderTrigger?: (props: { selectedCount: number; open: boolean }) => React.ReactNode;
  /**
   * Default-trigger text when one or more networks are selected. `total` is
   * `networks.length`. Default: `(n) => \`${n} network${n > 1 ? 's' : ''} selected\``.
   */
  formatSelectedCount?: (count: number, total: number) => string;
  /** Text in the popover's selection row. Default: `(n) => \`${n} selected\``. */
  formatSelectionSummary?: (count: number, total: number) => string;
  /** The selection row's clear button text. Default `'Clear all'`. */
  clearAllLabel?: string;
  selectedNetwork?: never;
  onSelectNetwork?: never;
}

export type NetworkSelectorProps<T> = NetworkSelectorBaseProps<T> &
  (SingleSelectProps<T> | MultiSelectProps<T>);

/**
 * Searchable selector for blockchain networks, single or multiple, with
 * optional grouping. Opens a popover with a search box and a listbox; focus
 * stays in the search box while the arrow keys move through the list.
 */
export function NetworkSelector<T>({
  networks,
  getNetworkLabel,
  getNetworkIcon,
  getNetworkType,
  getNetworkId,
  groupByEcosystem = false,
  getEcosystem,
  filterNetwork,
  isNetworkDisabled,
  getNetworkDisabledLabel,
  className,
  placeholder = DEFAULT_PLACEHOLDER,
  searchPlaceholder = DEFAULT_SEARCH_PLACEHOLDER,
  searchLabel = DEFAULT_SEARCH_LABEL,
  emptyText = DEFAULT_EMPTY_TEXT,
  ...modeProps
}: NetworkSelectorProps<T>): React.ReactElement {
  const isMultiple = modeProps.multiple === true;

  const selectedNetworkIds = isMultiple ? modeProps.selectedNetworkIds : undefined;
  const onSelectionChange = isMultiple ? modeProps.onSelectionChange : undefined;
  const renderCustomTrigger = isMultiple ? modeProps.renderTrigger : undefined;
  const formatSelectedCount =
    (isMultiple ? modeProps.formatSelectedCount : undefined) ?? defaultFormatSelectedCount;
  const formatSelectionSummary =
    (isMultiple ? modeProps.formatSelectionSummary : undefined) ?? defaultFormatSelectionSummary;
  const clearAllLabel =
    (isMultiple ? modeProps.clearAllLabel : undefined) ?? DEFAULT_CLEAR_ALL_LABEL;
  const selectedNetwork = !isMultiple ? modeProps.selectedNetwork : undefined;
  const onSelectNetwork = !isMultiple ? modeProps.onSelectNetwork : undefined;

  // INV-4: one id per instance. Every trigger carries it, and the popup is labelled by it.
  const triggerId = React.useId();
  const listName = React.useMemo<ListName>(() => ({ 'aria-labelledby': triggerId }), [triggerId]);

  // INV-2, INV-7: count is the raw length (stale and duplicate ids included); total is never filtered.
  const count = selectedNetworkIds?.length ?? 0;
  const total = networks.length;

  // INV-6: no grouping → no groups; grouping without `getEcosystem` → one "All" group.
  const getItemGroup = React.useMemo(
    () => (groupByEcosystem ? (getEcosystem ?? groupAsAll) : undefined),
    [groupByEcosystem, getEcosystem]
  );

  // INV-14, INV-16: identity is always `getNetworkId`, read from the props on every render.
  // INV-22: the multi set is rebuilt only when `selectedNetworkIds` changes identity.
  const selectedIdSet = React.useMemo(() => new Set(selectedNetworkIds), [selectedNetworkIds]);
  // Truthiness, as before the rebuild: a falsy `selectedNetwork` means nothing is selected.
  const selectedNetworkId = selectedNetwork ? getNetworkId(selectedNetwork) : null;
  const isSelected = React.useCallback(
    (network: T): boolean =>
      isMultiple
        ? selectedIdSet.has(getNetworkId(network))
        : selectedNetworkId !== null && getNetworkId(network) === selectedNetworkId,
    [isMultiple, selectedIdSet, selectedNetworkId, getNetworkId]
  );

  // INV-13: the core never calls this for a disabled network (SF-15 INV-22).
  const onActivate = React.useCallback(
    (network: T): void => {
      if (selectedNetworkIds && onSelectionChange) {
        // INV-11: append, or remove every copy in place. Never mutates the prop. Stays open.
        onSelectionChange(toggleId(selectedNetworkIds, getNetworkId(network)));
      } else if (onSelectNetwork) {
        // INV-12: the object from `networks`, by reference, on every pick (re-picks included).
        // The core closes single mode (SF-15 INV-32).
        onSelectNetwork(network);
      }
    },
    [selectedNetworkIds, onSelectionChange, onSelectNetwork, getNetworkId]
  );

  // INV-5: the pre-rebuild option text nodes, in the same order. The core owns the option
  // element, its ARIA and the multi checkbox.
  const renderItemContent = React.useCallback(
    (network: T, state: OptionState): React.ReactNode => {
      const disabledLabel = state.disabled ? getNetworkDisabledLabel?.(network) : undefined;
      return (
        <>
          {getNetworkIcon?.(network)}
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <span className="truncate">{getNetworkLabel(network)}</span>
            {getNetworkType && <span className={TYPE_CHIP_CLASS}>{getNetworkType(network)}</span>}
            {disabledLabel ? <span className={DISABLED_PILL_CLASS}>{disabledLabel}</span> : null}
          </div>
          {!isMultiple && state.selected && <Check className="h-4 w-4 text-selected opacity-100" />}
        </>
      );
    },
    [isMultiple, getNetworkIcon, getNetworkLabel, getNetworkType, getNetworkDisabledLabel]
  );

  // INV-7: the selection row exists only in multi mode with a selection.
  const renderListHeader = React.useMemo(() => {
    if (!onSelectionChange || count === 0) return undefined;
    return function renderSelectionRow({ focusSearch }: ListHeaderContext): React.ReactNode {
      return (
        <div
          data-slot="network-selector-summary"
          className="flex items-center justify-between border-b px-3 py-1.5"
        >
          <span className="text-xs font-medium text-muted-foreground">
            {formatSelectionSummary(count, total)}
          </span>
          <button
            // INV-17: never submits an enclosing form.
            type="button"
            data-slot="network-selector-clear"
            className="text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            onClick={() => {
              // INV-21: move focus before this button unmounts, so it never falls to <body>.
              focusSearch();
              onSelectionChange([]); // INV-11
            }}
          >
            {clearAllLabel}
          </button>
        </div>
      );
    };
  }, [onSelectionChange, count, total, formatSelectionSummary, clearAllLabel]);

  const renderTrigger = React.useCallback(
    ({ open, triggerAria }: TriggerState): React.ReactElement => {
      if (renderCustomTrigger) {
        // INV-3: the consumer's element keeps its own role and name. `role="combobox"` would
        // drop the name an icon button takes from its content, so it is not forwarded.
        // Slot merges these onto the consumer's element; the consumer's own props win (A1, A2).
        return (
          <Slot
            id={triggerId}
            aria-haspopup={triggerAria['aria-haspopup']}
            aria-expanded={triggerAria['aria-expanded']}
            aria-controls={triggerAria['aria-controls']}
          >
            {renderCustomTrigger({ selectedCount: count, open })}
          </Slot>
        );
      }

      // INV-2: the pre-rebuild trigger markup. `triggerAria` is spread last, so the core's
      // combobox ARIA wins over Radix's `aria-haspopup="dialog"`. No name is added.
      return (
        <Button
          id={triggerId}
          type="button"
          variant="outline"
          data-slot="network-selector-trigger"
          className={cn('w-full justify-between', className)}
          {...triggerAria}
        >
          {isMultiple ? (
            <span className="truncate text-muted-foreground">
              {count > 0 ? formatSelectedCount(count, total) : placeholder}
            </span>
          ) : (
            <span className="flex items-center gap-2 truncate">
              {selectedNetwork ? (
                <>
                  {getNetworkIcon?.(selectedNetwork)}
                  <span className="truncate">{getNetworkLabel(selectedNetwork)}</span>
                  {getNetworkType && (
                    <span className={TYPE_CHIP_CLASS}>{getNetworkType(selectedNetwork)}</span>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </span>
          )}
          <ChevronDown className={CHEVRON_CLASS} />
        </Button>
      );
    },
    [
      renderCustomTrigger,
      triggerId,
      count,
      total,
      className,
      isMultiple,
      formatSelectedCount,
      placeholder,
      selectedNetwork,
      getNetworkIcon,
      getNetworkLabel,
      getNetworkType,
    ]
  );

  return (
    <SearchableSelectCore
      items={networks}
      getItemId={getNetworkId}
      getItemLabel={getNetworkLabel}
      filterItem={filterNetwork}
      isItemDisabled={isNetworkDisabled}
      getItemGroup={getItemGroup}
      renderItemContent={renderItemContent}
      multiple={isMultiple}
      isSelected={isSelected}
      onActivate={onActivate}
      renderTrigger={renderTrigger}
      renderListHeader={renderListHeader}
      searchPlaceholder={searchPlaceholder}
      searchLabel={searchLabel}
      // INV-24 (P-1): shown and announced in every mode; no grouped-only fallback.
      emptyText={emptyText}
      listName={listName}
      // Its own slot names, so CSS or tests aimed at SearchableMultiSelect don't hit it.
      slotPrefix="network-selector"
    />
  );
}
