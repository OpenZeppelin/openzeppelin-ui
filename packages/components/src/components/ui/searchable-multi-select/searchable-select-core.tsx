/**
 * Internal searchable select core (SF-15, Design D1).
 *
 * Owns the modal popover, the search combobox, the listbox, filtering, keyboard
 * handling and ARIA wiring. Focus stays in the search box while the list is
 * navigated through `aria-activedescendant` (D2).
 *
 * Internal: NOT exported from the package barrel (INV-7). `SearchableMultiSelect`
 * wraps it for multi-select; SF-17's `NetworkSelector` imports it by path for
 * single mode, grouping, disabled items and custom option content.
 */
import { Check, Search } from 'lucide-react';
import * as React from 'react';

import { cn } from '@openzeppelin/ui-utils';

import { Input } from '../input';
import { Popover, PopoverContent, PopoverTrigger } from '../popover';
import { buildListModel, firstEnabledIndex, stepEnabledIndex, type ListOption } from './list-model';

/** Live state of one option, passed to `renderItemContent`. */
export interface OptionState {
  readonly selected: boolean;
  readonly disabled: boolean;
  readonly active: boolean;
}

/** Combobox ARIA the trigger must carry. Spread it onto the trigger element. */
export interface TriggerAria {
  readonly role: 'combobox';
  readonly 'aria-haspopup': 'listbox';
  readonly 'aria-expanded': boolean;
  /** The listbox id while open; absent while closed (INV-1, INV-2). */
  readonly 'aria-controls': string | undefined;
}

/** Passed to `renderTrigger`. */
export interface TriggerState {
  readonly open: boolean;
  readonly triggerAria: TriggerAria;
}

/** Passed to `renderListHeader`. */
export interface ListHeaderContext {
  /** Move focus back to the search box (e.g. after a header control unmounts itself). */
  readonly focusSearch: () => void;
}

/** Accessible name for the listbox and the popover dialog (INV-17). */
export interface ListName {
  readonly 'aria-label'?: string;
  readonly 'aria-labelledby'?: string;
}

/** Props for {@link SearchableSelectCore}. */
export interface SearchableSelectCoreProps<T> {
  readonly items: readonly T[];
  readonly getItemId: (item: T) => string;
  readonly getItemLabel: (item: T) => string;
  readonly filterItem?: (item: T, query: string) => boolean;
  /** Disabled options are announced, skipped by arrows and inert (INV-22). */
  readonly isItemDisabled?: (item: T) => boolean;
  /** Group key per item. Without it no `role="group"` is rendered (INV-21). */
  readonly getItemGroup?: (item: T) => string;
  /** Option body. Default: the label. The core always owns the option element and its ARIA (INV-23). */
  readonly renderItemContent?: (item: T, state: OptionState) => React.ReactNode;

  /** `true` → multiselectable, stays open on activate. `false` → closes and refocuses the trigger (INV-32). */
  readonly multiple: boolean;
  readonly isSelected: (item: T) => boolean;
  /** Called once for an enabled option on Enter or click. The caller decides what selection means. */
  readonly onActivate: (item: T) => void;

  /**
   * Renders the trigger. Must be one element that forwards its ref and spreads
   * unknown props onto a focusable `<button>` (Radix `PopoverTrigger asChild`),
   * with `state.triggerAria` spread onto it.
   */
  readonly renderTrigger: (state: TriggerState) => React.ReactElement;
  /** Rendered between the search box and the listbox. */
  readonly renderListHeader?: (context: ListHeaderContext) => React.ReactNode;

  readonly searchPlaceholder: string;
  readonly searchLabel: string;
  readonly emptyText: string;
  readonly listName: ListName;
  /** Nothing opens; an open popover closes (INV-25). */
  readonly disabled?: boolean;
  /**
   * Called once per change of the effective open state (SF-16 INV-14). User
   * acts report synchronously in their event, before the popover moves focus;
   * a `disabled`-forced close reports from a layout effect. Never on mount or unmount.
   */
  readonly onOpenChange?: (open: boolean) => void;
}

/** `aria-activedescendant` target id. Uses the source index, never the item id (D12, INV-4). */
function optionDomId(listboxId: string, option: ListOption<unknown>): string {
  return `${listboxId}-opt-${option.sourceIndex}`;
}

/** IME composition Enter belongs to the IME (Dev Notes A4). 229 is the legacy "composing" keyCode. */
const IME_COMPOSING_KEY_CODE = 229;

function isComposing(event: React.KeyboardEvent): boolean {
  return event.nativeEvent.isComposing || event.keyCode === IME_COMPOSING_KEY_CODE;
}

/**
 * Searchable select core: trigger + modal popover with a search combobox that
 * drives a listbox through `aria-activedescendant`.
 */
export function SearchableSelectCore<T>({
  items,
  getItemId,
  getItemLabel,
  filterItem,
  isItemDisabled,
  getItemGroup,
  renderItemContent,
  multiple,
  isSelected,
  onActivate,
  renderTrigger,
  renderListHeader,
  searchPlaceholder,
  searchLabel,
  emptyText,
  listName,
  disabled = false,
  onOpenChange,
}: SearchableSelectCoreProps<T>): React.ReactElement {
  const [openState, setOpenState] = React.useState(false);
  // Query survives close and reopen (D7, INV-31).
  const [query, setQuery] = React.useState('');
  // `null` = "first enabled option". Resolved against the current model during render (INV-26).
  const [storedActive, setStoredActive] = React.useState<number | null>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const listboxId = `${React.useId()}listbox`;

  // INV-25: disabling while open closes for good (not just hidden until re-enabled).
  if (disabled && openState) setOpenState(false);
  const open = openState && !disabled;

  // SF-16 INV-14: the last open state reported to `onOpenChange`. Starts closed, so mount
  // (StrictMode included) reports nothing.
  const reportedOpenRef = React.useRef(false);
  const reportOpenChange = (next: boolean): void => {
    if (reportedOpenRef.current === next) return; // once per effective change, strictly alternating
    reportedOpenRef.current = next;
    onOpenChange?.(next);
  };
  // SF-16 INV-14: catches changes no event reported, i.e. the render-phase forced close above.
  // A layout effect, so the consumer hears it after commit and never during render.
  React.useLayoutEffect(() => {
    if (reportedOpenRef.current === open) return;
    reportedOpenRef.current = open;
    onOpenChange?.(open);
  }, [open, onOpenChange]);

  // Navigation and hover only touch `storedActive`, so they never rebuild this (INV-35).
  const model = React.useMemo(
    () =>
      buildListModel({
        items,
        query,
        getItemId,
        getItemLabel,
        filterItem,
        isItemDisabled,
        getItemGroup,
      }),
    [items, query, getItemId, getItemLabel, filterItem, isItemDisabled, getItemGroup]
  );
  const { flat } = model;

  const selectedFlags = React.useMemo(
    () => flat.map((option) => isSelected(option.item)),
    [flat, isSelected]
  );

  // INV-26: the stored index survives only while in range and enabled; else first enabled.
  const storedOption = storedActive === null ? undefined : flat[storedActive];
  const activeIndex =
    storedActive !== null && storedOption !== undefined && !storedOption.disabled
      ? storedActive
      : firstEnabledIndex(flat);
  const activeOption = activeIndex >= 0 ? flat[activeIndex] : undefined;
  const isEmpty = flat.length === 0;

  const handleOpenChange = (next: boolean): void => {
    if (next && disabled) return;
    // SF-16 INV-14: report inside the event, before the popover's focus move commits.
    reportOpenChange(next);
    // INV-26: a fresh open starts on the first enabled option.
    if (next) setStoredActive(null);
    setOpenState(next);
  };

  const focusSearch = React.useCallback(() => searchRef.current?.focus(), []);

  const activate = (option: ListOption<T>, index: number): void => {
    // INV-22: disabled options do nothing, not even move the highlight.
    if (option.disabled) return;
    setStoredActive(index);
    onActivate(option.item); // INV-11: the only emit path besides the wrapper's Clear all.
    // INV-32: single mode closes; Radix's modal onCloseAutoFocus returns focus to the trigger (INV-40).
    if (!multiple) {
      reportOpenChange(false); // SF-16 INV-14
      setOpenState(false);
    }
  };

  const scrollOptionIntoView = (index: number): void => {
    const option = flat[index];
    if (!option) return;
    // Optional call: jsdom has no scrollIntoView.
    document.getElementById(optionDomId(listboxId, option))?.scrollIntoView?.({ block: 'nearest' });
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      // INV-27: keep the caret where it is, wrap over enabled options, scroll into view.
      event.preventDefault();
      const next = stepEnabledIndex(flat, activeIndex, event.key === 'ArrowDown' ? 1 : -1);
      if (next < 0) return;
      setStoredActive(next);
      scrollOptionIntoView(next);
      return;
    }
    if (event.key === 'Enter') {
      if (isComposing(event)) return; // A4: confirm IME text, toggle nothing.
      // INV-28: never let an enclosing form submit from the open popover.
      event.preventDefault();
      if (activeOption) activate(activeOption, activeIndex);
    }
    // Home / End / Left / Right / Space: native text editing, not intercepted.
  };

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLElement>): void => {
    // Click / Enter / Space open through the native button; arrows open here (Design § Interaction).
    if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      handleOpenChange(true);
    }
  };

  const triggerAria: TriggerAria = {
    role: 'combobox',
    'aria-haspopup': 'listbox',
    'aria-expanded': open,
    'aria-controls': open ? listboxId : undefined,
  };

  const renderOption = (option: ListOption<T>, index: number): React.ReactElement => {
    const state: OptionState = {
      selected: selectedFlags[index] ?? false,
      disabled: option.disabled,
      active: index === activeIndex,
    };
    return (
      <div
        key={option.sourceIndex}
        id={optionDomId(listboxId, option)}
        role="option"
        // INV-4: explicit "true" / "false", never absent.
        aria-selected={state.selected}
        aria-disabled={state.disabled || undefined}
        data-active={state.active ? '' : undefined}
        data-slot="searchable-multi-select-option"
        className={cn(
          'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
          // INV-41: active is a highlight distinct from the selected check.
          'data-[active]:bg-accent data-[active]:text-accent-foreground',
          // Dark theme: the accent fill alone is ~1.3:1 on the surface, so the active row also gets an inset ring.
          '[.dark_&]:data-[active]:ring-1 [.dark_&]:data-[active]:ring-inset [.dark_&]:data-[active]:ring-muted-foreground',
          state.disabled && 'cursor-not-allowed opacity-60'
        )}
        // INV-29: keep focus in the search box.
        onPointerDown={(event) => event.preventDefault()}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => activate(option, index)}
        onPointerMove={() => {
          // A5: hover moves the highlight but never scrolls.
          if (!option.disabled && index !== activeIndex) setStoredActive(index);
        }}
      >
        {multiple && (
          <span
            aria-hidden="true"
            className={cn(
              'flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors',
              state.selected
                ? 'border-selected bg-selected text-selected-foreground'
                : 'border-input bg-background [.dark_&]:border-muted-foreground'
            )}
          >
            {state.selected && <Check className="h-3 w-3" />}
          </span>
        )}
        {renderItemContent ? (
          renderItemContent(option.item, state)
        ) : (
          <span className="truncate">{option.label}</span>
        )}
      </div>
    );
  };

  // Flat index of each group's first option, so grouped options keep their keyboard index.
  let flatOffset = 0;

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal>
      <PopoverTrigger asChild disabled={disabled} onKeyDown={handleTriggerKeyDown}>
        {renderTrigger({ open, triggerAria })}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        data-slot="searchable-multi-select-content"
        className="w-[var(--radix-popover-trigger-width)] min-w-[240px] p-0"
        {...listName}
        onOpenAutoFocus={(event) => {
          // Focus the search box directly rather than the first tabbable node.
          event.preventDefault();
          searchRef.current?.focus();
        }}
      >
        <div className="flex items-center border-b px-3">
          <Search aria-hidden="true" className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            ref={searchRef}
            role="combobox"
            aria-label={searchLabel}
            aria-autocomplete="list"
            aria-expanded={true}
            aria-controls={listboxId}
            aria-activedescendant={activeOption ? optionDomId(listboxId, activeOption) : undefined}
            data-slot="searchable-multi-select-search"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setStoredActive(null); // INV-26: query change → first enabled option.
            }}
            onKeyDown={handleSearchKeyDown}
            autoComplete="off"
            className="h-9 w-full border-0 bg-transparent p-0 placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        {renderListHeader?.({ focusSearch })}
        <div
          id={listboxId}
          role="listbox"
          aria-multiselectable={multiple || undefined}
          {...listName}
          // D11: keep the id resolvable for aria-controls, but hide an empty listbox.
          hidden={isEmpty || undefined}
          data-slot="searchable-multi-select-listbox"
          className="max-h-[300px] overflow-y-auto p-1"
        >
          {model.groups.map((group, groupIndex) => {
            const offset = flatOffset;
            flatOffset += group.options.length;
            const options = group.options.map((option, i) => renderOption(option, offset + i));
            if (group.key === null) {
              return <React.Fragment key="ungrouped">{options}</React.Fragment>;
            }
            const headerId = `${listboxId}-grp-${groupIndex}`;
            return (
              <div key={headerId} role="group" aria-labelledby={headerId}>
                <div
                  id={headerId}
                  role="presentation"
                  className="px-2 py-1.5 text-xs font-medium text-muted-foreground"
                >
                  {group.key}
                </div>
                {options}
              </div>
            );
          })}
        </div>
        {/* D11, INV-38: always mounted while open; only its text changes. */}
        <div
          role="status"
          aria-live="polite"
          data-slot="searchable-multi-select-empty"
          className={cn(isEmpty && 'py-6 text-center text-sm text-muted-foreground')}
        >
          {isEmpty ? emptyText : ''}
        </div>
      </PopoverContent>
    </Popover>
  );
}
