import { Check, Pencil, Trash2, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import {
  AddressDisplay,
  AddressLabelProvider,
  Button,
  Input,
  NetworkStatusBadge,
} from '@openzeppelin/ui-components';
import type { AddressBookAlias, NetworkConfig } from '@openzeppelin/ui-types';

import { AddressNameResolutionProvider } from '../AddressNameResolutionProvider';

interface AliasRowProps {
  alias: AddressBookAlias;
  onSave: (input: { address: string; alias: string; networkId?: string }) => Promise<string>;
  onRemove: (id: string) => Promise<void>;
  resolveNetwork?: (networkId: string) => NetworkConfig | undefined;
  resolveExplorerUrl?: (address: string, networkId?: string) => string | undefined;
}

/** Single row in the Address Book widget displaying an alias record. */
export function AliasRow({
  alias,
  onSave,
  onRemove,
  resolveNetwork,
  resolveExplorerUrl,
}: AliasRowProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(alias.alias);
  const [busy, setBusy] = useState(false);

  const network = useMemo(
    () => (alias.networkId && resolveNetwork ? resolveNetwork(alias.networkId) : undefined),
    [alias.networkId, resolveNetwork]
  );

  const explorerUrl = useMemo(
    () => resolveExplorerUrl?.(alias.address, alias.networkId),
    [alias.address, alias.networkId, resolveExplorerUrl]
  );

  const handleEdit = useCallback(() => {
    setEditValue(alias.alias);
    setEditing(true);
  }, [alias.alias]);

  const handleCancel = useCallback(() => {
    setEditing(false);
  }, []);

  const handleSave = useCallback(async () => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === alias.alias) {
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      await onSave({
        address: alias.address,
        alias: trimmed,
        networkId: alias.networkId,
      });
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }, [alias, editValue, onSave]);

  const handleRemove = useCallback(async () => {
    setBusy(true);
    try {
      await onRemove(alias.id);
    } finally {
      setBusy(false);
    }
  }, [alias.id, onRemove]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSave();
      if (e.key === 'Escape') handleCancel();
    },
    [handleSave, handleCancel]
  );

  return (
    <div className="flex items-center gap-3 rounded-md border p-3">
      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="mb-2 max-w-sm">
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8 text-base font-semibold"
              autoFocus
              disabled={busy}
            />
          </div>
        ) : (
          <h3 className="mb-2.5 truncate text-base font-semibold text-foreground">{alias.alias}</h3>
        )}
        <div className="flex items-center gap-2">
          {alias.networkId && (
            <NetworkStatusBadge network={network ?? null} className="shrink-0 gap-1.5 px-2 py-1" />
          )}
          <div className="min-w-0 flex-1">
            <AddressLabelProvider resolveLabel={() => undefined}>
              <AddressNameResolutionProvider address={alias.address}>
                <AddressDisplay
                  address={alias.address}
                  networkId={alias.networkId}
                  truncate={false}
                  showCopyButton
                  explorerUrl={explorerUrl}
                  className="text-xs text-muted-foreground"
                />
              </AddressNameResolutionProvider>
            </AddressLabelProvider>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 gap-1">
        {editing ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleSave}
              disabled={busy}
              aria-label="Save"
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleCancel}
              disabled={busy}
              aria-label="Cancel"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleEdit}
              disabled={busy}
              aria-label="Edit alias"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={handleRemove}
              disabled={busy}
              aria-label="Remove alias"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
