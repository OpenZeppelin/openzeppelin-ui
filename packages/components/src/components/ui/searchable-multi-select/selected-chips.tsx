/**
 * SelectedChips: the chip list `SearchableMultiSelect` renders below its trigger
 * in chips mode. Internal; not exported from the package.
 *
 * It owns the announcement text. The removal waiting to be applied lives in a
 * ref the owner passes in, so the owner can drop it when it emits a selection
 * through another path (a list pick, Clear all). The chips themselves derive from `entries` on
 * every render, so the consumer's `selectedIds` stays the single source.
 */
import { X } from 'lucide-react';
import * as React from 'react';

import { cn } from '@openzeppelin/ui-utils';

const REMOVE_BUTTON_SLOT = 'searchable-multi-select-chip-remove';

/** One resolved pick: the selected id and the item it resolves to. */
export interface SelectedEntry<T> {
  readonly id: string;
  readonly item: T;
}

/** What the chip list renders: remove buttons, or plain chips. */
export type SelectedChipsMode = 'interactive' | 'readonly' | 'disabled';

/** Props for {@link SelectedChips}. */
export interface SelectedChipsProps<T> {
  /** Resolved picks, in selection order, one per distinct id. */
  readonly entries: readonly SelectedEntry<T>[];
  readonly getItemLabel: (item: T) => string;
  /** Asks the owner to remove one id. The owner emits; the chips react only once it is applied. */
  readonly onRemove: (id: string) => void;
  readonly formatRemoveLabel: (label: string, item: T) => string;
  readonly formatRemovedAnnouncement: (label: string, item: T) => string;
  /** Only `'interactive'` renders remove buttons. */
  readonly mode: SelectedChipsMode;
  /** Names the list after the control's label. Absent: the list has no name. */
  readonly labelledBy: string | undefined;
  /** Focus target once the last chip is gone. */
  readonly getTrigger: () => HTMLButtonElement | null;
  /** Holds the removal waiting to be applied. The owner sets it to `null` when it emits through another path. */
  readonly pendingRef: React.MutableRefObject<PendingRemoval<T> | null>;
  /**
   * Extra classes on each chip. Merged after the kit chrome, so a consumer can
   * override the border or fill without forking the list.
   */
  readonly chipClassName?: string;
}

/** A removal the user asked for, waiting for the consumer to apply it. */
export interface PendingRemoval<T> {
  readonly id: string;
  /** The resolved ids, keyed like `idsKey`, once this removal alone is applied. */
  readonly expectedKey: string;
  /** Position among the rendered chips, so stale ids never shift the focus target. */
  readonly index: number;
  readonly label: string;
  readonly item: T;
  /** The button that was activated, to tell whether focus is still "ours" when it applies. */
  readonly button: HTMLButtonElement;
}

/**
 * A wrapping list of chips, one per resolved pick, each with a remove button in
 * interactive mode. After a removal the consumer applies, focus moves to the
 * next chip, else the previous one, else the trigger, and a polite status
 * region announces the removal.
 */
export function SelectedChips<T>({
  entries,
  getItemLabel,
  onRemove,
  formatRemoveLabel,
  formatRemovedAnnouncement,
  mode,
  labelledBy,
  getTrigger,
  pendingRef,
  chipClassName,
}: SelectedChipsProps<T>): React.ReactElement {
  const [announcement, setAnnouncement] = React.useState('');
  const listRef = React.useRef<HTMLUListElement>(null);

  // The effect below must run when the resolved ids change, not when a consumer re-renders
  // with a new but equal array (or new inline formatters), so it keys on content.
  const idsKey = JSON.stringify(entries.map((entry) => entry.id));

  // Layout effect: the removed button unmounts in this same commit, so moving focus before
  // paint means no frame shows focus lost to <body>.
  React.useLayoutEffect(() => {
    const pending = pendingRef.current;
    pendingRef.current = null;

    // Not a chip removal, one the consumer refused, or a change other than that removal
    // (a reset, or a removal applied together with other changes): whatever was announced is stale.
    if (!pending || idsKey !== pending.expectedKey) {
      setAnnouncement('');
      return;
    }

    // Move focus only if it is still on the removed button or fell to <body> when that
    // button unmounted. If the user moved on while an async consumer worked, leave it.
    const active = document.activeElement;
    if (active === pending.button || active === null || active === document.body) {
      const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>(
        `[data-slot="${REMOVE_BUTTON_SLOT}"]`
      );
      const next = buttons?.[pending.index] ?? buttons?.[buttons.length - 1] ?? getTrigger();
      next?.focus();
    }

    setAnnouncement(formatRemovedAnnouncement(pending.label, pending.item));
    // Keyed on idsKey on purpose (see above); the other values are read at the time it runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  const interactive = mode === 'interactive';

  return (
    <>
      {entries.length > 0 && (
        <ul
          ref={listRef}
          aria-labelledby={labelledBy}
          data-slot="searchable-multi-select-chips"
          className={cn('flex flex-wrap gap-1', mode === 'disabled' && 'opacity-50')}
        >
          {entries.map((entry, index) => {
            const label = getItemLabel(entry.item);
            return (
              <li
                key={entry.id}
                data-slot="searchable-multi-select-chip"
                className={cn(
                  // Bordered bg-background so chips stay visible on muted surfaces (outline-Badge look).
                  // Interactive uses py-px (not py-0.5) so the 1px border keeps the chip at min-h-7 (28px),
                  // matching read-only / disabled.
                  'border-border bg-background text-foreground inline-flex min-h-7 max-w-full items-center gap-1 rounded-md border text-xs',
                  interactive ? 'py-px pr-0.5 pl-2' : 'px-2 py-1',
                  chipClassName
                )}
              >
                {/* Truncated visually only; the full label stays in the text and the button's name. */}
                <span className="min-w-0 truncate">{label}</span>
                {interactive && (
                  <button
                    type="button"
                    aria-label={formatRemoveLabel(label, entry.item)}
                    data-slot={REMOVE_BUTTON_SLOT}
                    onClick={(event) => {
                      pendingRef.current = {
                        id: entry.id,
                        expectedKey: JSON.stringify(
                          entries.filter((other) => other.id !== entry.id).map((other) => other.id)
                        ),
                        index,
                        label,
                        item: entry.item,
                        button: event.currentTarget,
                      };
                      onRemove(entry.id);
                    }}
                    className={cn(
                      // 24×24 hit area: WCAG 2.2 target size minimum.
                      // text-foreground (not muted) keeps the × ≥ 3:1 on the chip fill.
                      'text-foreground inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-sm transition-colors',
                      'hover:bg-muted',
                      'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none'
                    )}
                  >
                    <X aria-hidden="true" className="h-3 w-3" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {/* Mounted from the first render, so the first removal is announced. */}
      <span
        role="status"
        aria-live="polite"
        data-slot="searchable-multi-select-chips-status"
        className="sr-only"
      >
        {announcement}
      </span>
    </>
  );
}
