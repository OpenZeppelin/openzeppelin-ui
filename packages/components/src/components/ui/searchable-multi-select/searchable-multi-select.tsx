/**
 * SearchableMultiSelect: the public multi-select over the internal
 * {@link SearchableSelectCore}. Adds the selection-order rule, the default
 * trigger, the selection summary row, copy defaults, the optional chip list
 * and the narrow trigger pass-throughs a form field needs.
 */
import { ChevronDown } from 'lucide-react';
import * as React from 'react';

import { cn, logger } from '@openzeppelin/ui-utils';

import { Button } from '../button';
import { resolveSelectedItems, toggleId } from './list-model';
import {
  SearchableSelectCore,
  type ListName,
  type SelectionSummary,
} from './searchable-select-core';
import {
  SelectedChips,
  type PendingRemoval,
  type SelectedChipsMode,
  type SelectedEntry,
} from './selected-chips';

const IS_DEV = process.env.NODE_ENV !== 'production';
const DIAGNOSTIC_SYSTEM = 'SearchableMultiSelect';

// The only kit-authored copy. Every string is overridable.
const DEFAULT_PLACEHOLDER = 'Select items';
const DEFAULT_SEARCH_PLACEHOLDER = 'Search...';
const DEFAULT_SEARCH_LABEL = 'Search';
const DEFAULT_EMPTY_TEXT = 'No results found.';
const DEFAULT_CLEAR_ALL_LABEL = 'Clear all';
const defaultFormatCount = (count: number): string => `${count} selected`;
const defaultFormatRemoveLabel = (label: string): string => `Remove ${label}`;
const defaultFormatRemovedAnnouncement = (label: string): string => `${label} removed`;
// A button cannot carry `aria-required` or `aria-readonly`, so these states are hidden text in
// the trigger's description. Fixed copy, like SelectField's "Read-only" description.
const REQUIRED_TEXT = 'Required';
const READ_ONLY_TEXT = 'Read-only';
const TRIGGER_SELECTOR = '[data-slot="searchable-multi-select-trigger"]';

/** Props for {@link SearchableMultiSelect}. */
export interface SearchableMultiSelectProps<T> {
  // ── Data ──────────────────────────────────────────────────────────────
  /** Items to choose from, in display order. */
  readonly items: readonly T[];
  /** Stable, unique identity for an item. This is the value that is stored and emitted. */
  readonly getItemId: (item: T) => string;
  /** Visible text for an item. Also the option's accessible name and the default filter target. */
  readonly getItemLabel: (item: T) => string;
  /**
   * Custom match rule. Called only for a non-empty query, with the query exactly as typed.
   * Default: case-insensitive substring match on `getItemLabel(item)`.
   */
  readonly filterItem?: (item: T, query: string) => boolean;

  // ── Selection (controlled) ────────────────────────────────────────────
  /** Selected item ids, in selection order. */
  readonly selectedIds: readonly string[];
  /**
   * Called with the next id list, always a new array. A newly selected id is
   * appended; a deselected id is removed and the rest keep their order; Clear
   * all emits `[]`. Ids that match no current item are kept.
   */
  readonly onSelectionChange: (ids: string[]) => void;

  // ── Copy (every user-facing string) ───────────────────────────────────
  /** Trigger text when nothing is selected. Default `'Select items'`. */
  readonly placeholder?: string;
  /** Search box placeholder. Default `'Search...'`. */
  readonly searchPlaceholder?: string;
  /** Search box accessible name. Default `'Search'`. */
  readonly searchLabel?: string;
  /** Shown (and announced) when the query matches nothing. Default `'No results found.'`. */
  readonly emptyText?: string;
  /**
   * Trigger text when one or more ids are selected. `count` is `selectedIds.length`
   * and `total` is `items.length`, so a consumer can say "All countries" when
   * `count === total`. `selectedItems` holds the items whose id is selected, in
   * selection order and once each, so the text can name the picks ("France,
   * Spain and 3 more"). Ids that match no current item are left out of
   * `selectedItems` but still counted in `count`.
   * Default: `(count) => \`${count} selected\``.
   */
  readonly formatSelectedCount?: (
    count: number,
    total: number,
    selectedItems: readonly T[]
  ) => string;
  /**
   * Text in the popover's selection row. Gets the same arguments as `formatSelectedCount`.
   * Default: `(count) => \`${count} selected\``.
   */
  readonly formatSelectionSummary?: (
    count: number,
    total: number,
    selectedItems: readonly T[]
  ) => string;
  /** The selection row's clear button text. Default `'Clear all'`. */
  readonly clearAllLabel?: string;

  // ── Closed display ────────────────────────────────────────────────────
  /**
   * How the closed control shows the selection.
   * - `'count'` (default): the trigger text only.
   * - `'chips'`: the trigger text, plus a chip per selected item below the trigger, each
   *   with a remove button. Chips follow selection order. Ids that match no current item
   *   get no chip; they are still counted, kept and emitted, and Clear all removes them.
   *   After a removal is applied, focus moves to the next chip, else the previous one,
   *   else the trigger, and the removal is announced. Read-only and disabled show the
   *   chips without remove buttons.
   */
  readonly showSelected?: 'count' | 'chips';
  /**
   * Accessible name of a chip's remove button. Chips mode only.
   * Default: `(label) => \`Remove ${label}\``.
   */
  readonly formatRemoveLabel?: (label: string, item: T) => string;
  /**
   * Text announced (politely) once a chip removal has been applied. Chips mode only.
   * Default: `(label) => \`${label} removed\``.
   */
  readonly formatRemovedAnnouncement?: (label: string, item: T) => string;
  /**
   * Extra classes on each selected chip. Chips mode only. Merged after the kit
   * chrome, so a consumer can override the border or fill. Ignored in count mode.
   */
  readonly chipClassName?: string;

  // ── Trigger / field integration ───────────────────────────────────────
  /** Ref to the trigger `<button>`. This is what a form ref focuses. */
  readonly ref?: React.Ref<HTMLButtonElement>;
  /**
   * Trigger id. To name the control after a visible label, give the label an id and pass it
   * as `aria-labelledby`, as `SearchableMultiSelectField` does. A `<Label htmlFor>` alone names
   * the trigger with the label text only (hiding its selection text) and leaves the dialog and
   * listbox named by the placeholder, so the missing-name warning still fires.
   */
  readonly id?: string;
  /** Applied to the trigger button, merged with the kit classes. */
  readonly className?: string;
  /** Disables the trigger; the popover cannot open, and an open one closes. */
  readonly disabled?: boolean;
  /**
   * Focusable read-only: the trigger stays enabled and in the tab order, but the popover
   * cannot open and an open one closes. The trigger gets a read-only look and a hidden
   * "Read-only" description.
   */
  readonly readOnly?: boolean;
  /** Fired when the trigger loses focus, including when opening moves focus to the search box. */
  readonly onBlur?: React.FocusEventHandler<HTMLButtonElement>;
  /**
   * Called with the new state each time the popover opens or closes. For a user
   * action (click, Enter / Space / arrows on the trigger, Escape, outside
   * click), it is called synchronously in that event, before focus moves, so
   * it runs before the `onBlur` that opening causes. Not called for an open
   * that `disabled` refuses, nor on mount or unmount.
   */
  readonly onOpenChange?: (open: boolean) => void;
  /**
   * Accessible name for the listbox and the popover dialog. The trigger reads it followed by
   * its current text, for example "Countries 2 selected".
   */
  readonly 'aria-label'?: string;
  /** Accessible name by reference. Same targets and trigger reading as `aria-label`; wins over it. */
  readonly 'aria-labelledby'?: string;
  /** Applied to the trigger only. */
  readonly 'aria-describedby'?: string;
  /** Applied to the trigger only. */
  readonly 'aria-invalid'?: boolean;
  /**
   * Marks the control required. A button cannot carry `aria-required`, so the trigger gets a
   * hidden "Required" description instead.
   */
  readonly 'aria-required'?: boolean;
}

/**
 * Searchable multi-select for any item type. Controlled: the consumer owns
 * `selectedIds`. The trigger is a button that opens a dialog with a search box
 * (a combobox) and a multiselectable listbox; focus stays in the search box
 * while the list is navigated.
 *
 * Label it with `aria-labelledby` or `aria-label`, which name the trigger, the
 * dialog and the listbox. The trigger reads the label and then its current
 * text ("Countries 2 selected").
 */
export function SearchableMultiSelect<T>({
  items,
  getItemId,
  getItemLabel,
  filterItem,
  selectedIds,
  onSelectionChange,
  placeholder = DEFAULT_PLACEHOLDER,
  searchPlaceholder = DEFAULT_SEARCH_PLACEHOLDER,
  searchLabel = DEFAULT_SEARCH_LABEL,
  emptyText = DEFAULT_EMPTY_TEXT,
  formatSelectedCount = defaultFormatCount,
  formatSelectionSummary = defaultFormatCount,
  clearAllLabel = DEFAULT_CLEAR_ALL_LABEL,
  showSelected = 'count',
  formatRemoveLabel = defaultFormatRemoveLabel,
  formatRemovedAnnouncement = defaultFormatRemovedAnnouncement,
  chipClassName,
  ref,
  id,
  className,
  disabled = false,
  readOnly = false,
  onBlur,
  onOpenChange,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  'aria-required': ariaRequired,
}: SearchableMultiSelectProps<T>): React.ReactElement {
  // Selection is read from the prop on every render; the kit keeps no copy.
  const selectedSet = React.useMemo(() => new Set(selectedIds), [selectedIds]);
  const isSelected = React.useCallback(
    (item: T) => selectedSet.has(getItemId(item)),
    [selectedSet, getItemId]
  );

  // A chip removal waiting to be applied. Every other emit drops it, so a removal the
  // consumer refused is never announced when a later change drops that id another way.
  const pendingRemovalRef = React.useRef<PendingRemoval<T> | null>(null);

  // One emit per activation, by the selection-order rule.
  const handleActivate = React.useCallback(
    (item: T) => {
      pendingRemovalRef.current = null;
      onSelectionChange(toggleId(selectedIds, getItemId(item)));
    },
    [onSelectionChange, selectedIds, getItemId]
  );

  // Count is the raw length (stale and duplicate ids included); total is never the filtered length.
  const count = selectedIds.length;
  const total = items.length;
  // Memoised: moving through the list must not call an accessor, so the walk reruns only when
  // the items, the selection or the id accessor change.
  const selectedItems = React.useMemo(
    () => resolveSelectedItems(items, selectedIds, getItemId),
    [items, selectedIds, getItemId]
  );
  const showChips = showSelected === 'chips';
  // The chips are built from the same resolved list the formatters get, so the trigger text
  // and the chips never disagree. Empty (and never walked) in count mode.
  const chipEntries = React.useMemo<readonly SelectedEntry<T>[]>(
    () => (showChips ? selectedItems.map((item) => ({ id: getItemId(item), item })) : []),
    [showChips, selectedItems, getItemId]
  );

  // Labelledby wins; without either, the listbox and dialog fall back to the placeholder.
  // The trigger never gets a copy-derived aria-label, which would hide the count text (its value).
  const listName: ListName = ariaLabelledBy
    ? { 'aria-labelledby': ariaLabelledBy }
    : { 'aria-label': ariaLabel ?? placeholder };

  useDevDiagnostics(items, getItemId, Boolean(ariaLabel || ariaLabelledBy));

  // The trigger is a button, so an aria-labelledby or aria-label alone would replace its text.
  // Its name is the label followed by the text, the way a select reads label then value. With
  // no label it keeps the name from its text.
  const baseId = React.useId();
  const valueId = `${baseId}value`;
  const nameTextId = `${baseId}name`;
  const requiredId = `${baseId}required`;
  const readOnlyId = `${baseId}readonly`;
  const useNameText = !ariaLabelledBy && Boolean(ariaLabel);
  const triggerLabelledBy = ariaLabelledBy
    ? `${ariaLabelledBy} ${valueId}`
    : useNameText
      ? `${nameTextId} ${valueId}`
      : undefined;
  const triggerDescribedBy =
    [ariaDescribedBy, ariaRequired && requiredId, readOnly && readOnlyId]
      .filter(Boolean)
      .join(' ') || undefined;

  const renderTrigger = (): React.ReactElement => (
    <Button
      ref={ref}
      id={id}
      type="button"
      variant="outline"
      disabled={disabled}
      onBlur={onBlur}
      // No role or aria-haspopup here: Radix's PopoverTrigger supplies the dialog-button ARIA
      // (aria-haspopup="dialog", aria-expanded, aria-controls on the open dialog). The search box
      // inside the dialog is the combobox.
      aria-labelledby={triggerLabelledBy}
      aria-describedby={triggerDescribedBy}
      aria-invalid={ariaInvalid}
      data-readonly={readOnly ? '' : undefined}
      data-slot="searchable-multi-select-trigger"
      className={cn(
        'w-full justify-between',
        // The kit's read-only look (muted fill, full-contrast text), as on SelectTrigger.
        readOnly && 'bg-muted text-foreground hover:bg-muted cursor-default',
        className
      )}
    >
      <span id={valueId} className={cn('truncate', count === 0 && 'text-muted-foreground')}>
        {count > 0 ? formatSelectedCount(count, total, selectedItems) : placeholder}
      </span>
      <ChevronDown aria-hidden="true" className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  );

  // The core always renders the row; it shows text and Clear all only with a selection.
  const selectionSummary: SelectionSummary = {
    count,
    text: count > 0 ? formatSelectionSummary(count, total, selectedItems) : '',
    clearLabel: clearAllLabel,
    onClear: () => {
      pendingRemovalRef.current = null;
      onSelectionChange([]);
    },
  };

  // A chip removal follows the same selection-order rule as unpicking in the list.
  const handleRemove = React.useCallback(
    (removedId: string) => onSelectionChange(toggleId(selectedIds, removedId)),
    [onSelectionChange, selectedIds]
  );

  // Scoped to this instance's root, so two instances never focus each other's trigger.
  // The consumer's `ref` stays on the trigger untouched.
  const rootRef = React.useRef<HTMLDivElement>(null);
  const getTrigger = React.useCallback(
    () => rootRef.current?.querySelector<HTMLButtonElement>(TRIGGER_SELECTOR) ?? null,
    []
  );

  // Disabled wins over read-only, as it does for the trigger.
  const chipsMode: SelectedChipsMode = disabled
    ? 'disabled'
    : readOnly
      ? 'readonly'
      : 'interactive';

  const core = (
    <SearchableSelectCore
      items={items}
      getItemId={getItemId}
      getItemLabel={getItemLabel}
      filterItem={filterItem}
      multiple
      isSelected={isSelected}
      onActivate={handleActivate}
      renderTrigger={renderTrigger}
      selectionSummary={selectionSummary}
      searchPlaceholder={searchPlaceholder}
      searchLabel={searchLabel}
      emptyText={emptyText}
      listName={listName}
      disabled={disabled}
      readOnly={readOnly}
      onOpenChange={onOpenChange}
    />
  );

  // Hidden, so they are read only through the trigger's IDREFs and take no layout space.
  const hiddenText = (
    <>
      {useNameText && (
        <span id={nameTextId} hidden>
          {ariaLabel}
        </span>
      )}
      {ariaRequired && (
        <span id={requiredId} hidden>
          {REQUIRED_TEXT}
        </span>
      )}
      {readOnly && (
        <span id={readOnlyId} hidden>
          {READ_ONLY_TEXT}
        </span>
      )}
    </>
  );

  // Count mode keeps its original DOM: no wrapper, no list, no status region.
  if (!showChips) {
    return (
      <>
        {core}
        {hiddenText}
      </>
    );
  }

  // Chips sit below the trigger as its sibling, never inside the button. The root keeps the
  // two together in any parent layout.
  return (
    <>
      <div ref={rootRef} data-slot="searchable-multi-select" className="flex flex-col gap-2">
        {core}
        <SelectedChips
          entries={chipEntries}
          getItemLabel={getItemLabel}
          onRemove={handleRemove}
          formatRemoveLabel={formatRemoveLabel}
          formatRemovedAnnouncement={formatRemovedAnnouncement}
          mode={chipsMode}
          labelledBy={ariaLabelledBy ?? (useNameText ? nameTextId : undefined)}
          getTrigger={getTrigger}
          pendingRef={pendingRemovalRef}
          chipClassName={chipClassName}
        />
      </div>
      {hiddenText}
    </>
  );
}

/**
 * Dev-only warnings, at most once each per instance, never thrown.
 * Runs in an effect, so it never adds accessor calls to navigation renders.
 */
function useDevDiagnostics<T>(
  items: readonly T[],
  getItemId: (item: T) => string,
  hasAccessibleName: boolean
): void {
  const warnedRef = React.useRef(new Set<string>());

  React.useEffect(() => {
    if (!IS_DEV) return;
    const warned = warnedRef.current;
    const warnOnce = (key: string, message: string): void => {
      if (warned.has(key)) return;
      warned.add(key);
      logger.warn(DIAGNOSTIC_SYSTEM, message);
    };

    if (!hasAccessibleName) {
      warnOnce(
        'no-accessible-name',
        'No accessible name. Pass `aria-labelledby` or `aria-label`; otherwise the trigger is named only by its text and the list by the placeholder.'
      );
    }

    if (warned.has('duplicate-id')) return;
    const seen = new Set<string>();
    for (const item of items) {
      const itemId = getItemId(item);
      if (seen.has(itemId)) {
        warnOnce(
          'duplicate-id',
          `Duplicate item id "${itemId}". Items sharing an id are selected and toggled together.`
        );
        return;
      }
      seen.add(itemId);
    }
  }, [items, getItemId, hasAccessibleName]);
}
