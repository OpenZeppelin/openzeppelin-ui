/**
 * AliasEditPopover
 *
 * Floating popover anchored to the pencil-icon click position.
 * Allows creating, editing, and removing an alias for a single address.
 *
 * This is a presentational component — all storage operations are
 * provided via callback props so it remains storage-agnostic.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { Popover, PopoverAnchor, PopoverContent } from '@openzeppelin/ui-components';

export interface AliasEditLookupResult {
  id: string;
  alias: string;
}

export interface AliasEditPopoverProps {
  address: string;
  networkId?: string;
  anchorRect: DOMRect;
  onClose: () => void;
  /** Look up the current alias for the given (address, networkId) pair. */
  onLookup: (address: string, networkId?: string) => Promise<AliasEditLookupResult | undefined>;
  /** Save (create or update) an alias. Returns the record ID. */
  onSave: (input: { address: string; alias: string; networkId?: string }) => Promise<string>;
  /** Remove an alias by record ID. */
  onRemove: (id: string) => Promise<void>;
}

/** Inline popover for creating, editing, or removing an address alias. */
export function AliasEditPopover({
  address,
  networkId,
  anchorRect,
  onClose,
  onLookup,
  onSave,
  onRemove,
}: AliasEditPopoverProps) {
  const [alias, setAlias] = useState('');
  const [existingId, setExistingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    onLookup(address, networkId).then((record) => {
      if (cancelled) return;
      if (record) {
        setAlias(record.alias);
        setExistingId(record.id);
      }
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [address, networkId, onLookup]);

  useEffect(() => {
    if (loaded) inputRef.current?.focus();
  }, [loaded]);

  const handleSave = useCallback(async () => {
    const trimmed = alias.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await onSave({ address, alias: trimmed, networkId });
      onClose();
    } finally {
      setBusy(false);
    }
  }, [address, alias, networkId, onSave, onClose]);

  const handleRemove = useCallback(async () => {
    if (!existingId) return;
    setBusy(true);
    try {
      await onRemove(existingId);
      onClose();
    } finally {
      setBusy(false);
    }
  }, [existingId, onRemove, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSave();
      if (e.key === 'Escape') onClose();
    },
    [handleSave, onClose]
  );

  return (
    <Popover open onOpenChange={(open) => !open && onClose()}>
      <PopoverAnchor
        style={{
          position: 'fixed',
          left: anchorRect.x,
          top: anchorRect.y,
          width: 0,
          height: 0,
          pointerEvents: 'none',
        }}
      />
      <PopoverContent side="bottom" align="start" className="w-64 space-y-3 p-3">
        {!loaded ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div>
              <label
                htmlFor="alias-edit-input"
                className="text-xs font-medium text-muted-foreground"
              >
                Alias
              </label>
              <input
                ref={inputRef}
                id="alias-edit-input"
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={busy}
                placeholder="e.g. Treasury"
                className="mt-1 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div className="flex justify-between gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={busy || !alias.trim()}
                  className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={busy}
                  className="rounded-md border px-3 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>

              {existingId && (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={busy}
                  className="rounded-md px-3 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
                >
                  Remove
                </button>
              )}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
