import { BookUser, Filter, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  NetworkIcon,
  NetworkSelector,
} from '@openzeppelin/ui-components';
import type { AddressBookWidgetProps } from '@openzeppelin/ui-types';
import { cn } from '@openzeppelin/ui-utils';

import { AddAliasDialog } from './AddAliasDialog';
import { AliasRow } from './AliasRow';
import { ImportExportBar } from './ImportExportBar';

/** Widget for managing a personal address book with aliases, search, and network filtering. */
export function AddressBookWidget({
  aliases,
  isLoading,
  onSave,
  onRemove,
  onClear,
  onExport,
  onImport,
  currentNetworkId,
  resolveNetwork,
  resolveExplorerUrl,
  addressing,
  resolveAddressing,
  addressPlaceholder,
  resolveAddressPlaceholder,
  networks,
  filterNetworkIds,
  onFilterNetworkIdsChange,
  title = 'Address Book',
  className,
  enableNameResolution,
}: AddressBookWidgetProps) {
  const [search, setSearch] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearInput, setClearInput] = useState('');

  const activeFilterIds = useMemo(() => filterNetworkIds ?? [], [filterNetworkIds]);
  const hasActiveFilter = activeFilterIds.length > 0;

  const filteredAliases = useMemo(() => {
    if (!aliases) return undefined;
    if (!search.trim()) return aliases;

    const lower = search.toLowerCase();
    return aliases.filter(
      (a) => a.alias.toLowerCase().includes(lower) || a.address.toLowerCase().includes(lower)
    );
  }, [aliases, search]);

  const handleClear = useCallback(async () => {
    await onClear();
    setConfirmClear(false);
    setClearInput('');
  }, [onClear]);

  const handleCancelClear = useCallback(() => {
    setConfirmClear(false);
    setClearInput('');
  }, []);

  const canFilter = networks && networks.length > 0 && onFilterNetworkIdsChange;

  if (isLoading || aliases === undefined) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookUser className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookUser className="h-5 w-5" />
            {title}
            {aliases.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">({aliases.length})</span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Add Alias
            </Button>
            <ImportExportBar
              onExport={onExport}
              onImport={onImport}
              exportDisabled={aliases.length === 0}
            />
          </div>
        </div>
      </CardHeader>

      <AddAliasDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSave={onSave}
        currentNetworkId={currentNetworkId}
        addressing={addressing}
        resolveAddressing={resolveAddressing}
        addressPlaceholder={addressPlaceholder}
        resolveAddressPlaceholder={resolveAddressPlaceholder}
        resolveNetwork={resolveNetwork}
        networks={networks}
        enableNameResolution={enableNameResolution}
      />

      <CardContent className="space-y-4">
        {(aliases.length > 0 || hasActiveFilter) && (
          <>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by alias or address…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>

              {canFilter && (
                <NetworkSelector
                  multiple
                  networks={networks}
                  selectedNetworkIds={activeFilterIds}
                  onSelectionChange={onFilterNetworkIdsChange}
                  getNetworkLabel={(n) => n.name}
                  getNetworkId={(n) => n.id}
                  getNetworkIcon={(n) => <NetworkIcon network={n} size={14} />}
                  getNetworkType={(n) => n.type}
                  groupByEcosystem
                  getEcosystem={(n) => n.ecosystem.toUpperCase()}
                  renderTrigger={({ selectedCount }) => (
                    <Button variant="outline" size="icon" className="relative shrink-0">
                      <Filter className="h-4 w-4" />
                      {selectedCount > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                          {selectedCount}
                        </span>
                      )}
                    </Button>
                  )}
                />
              )}
            </div>

            <div className="space-y-2">
              {filteredAliases?.map((alias) => (
                <AliasRow
                  key={alias.id}
                  alias={alias}
                  onSave={onSave}
                  onRemove={onRemove}
                  resolveNetwork={resolveNetwork}
                  resolveExplorerUrl={resolveExplorerUrl}
                  enableNameResolution={enableNameResolution}
                />
              ))}

              {filteredAliases?.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {hasActiveFilter ? (
                    'No aliases match the current filters.'
                  ) : (
                    <>No aliases match &ldquo;{search}&rdquo;</>
                  )}
                </p>
              )}
            </div>

            <div className="border-t pt-4">
              {confirmClear ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Type <span className="font-mono font-semibold">clear</span> to confirm removing
                    all aliases.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={clearInput}
                      onChange={(e) => setClearInput(e.target.value)}
                      placeholder='Type "clear"'
                      className="max-w-[200px]"
                      autoFocus
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={clearInput !== 'clear'}
                      onClick={handleClear}
                    >
                      Confirm
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCancelClear}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setConfirmClear(true)}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Clear All
                </Button>
              )}
            </div>
          </>
        )}

        {aliases.length === 0 && !hasActiveFilter && (
          <EmptyState
            icon={<BookUser className="h-10 w-10" />}
            title="No aliases yet"
            description="Add your first alias above to start building your address book."
            size="small"
          />
        )}
      </CardContent>
    </Card>
  );
}
