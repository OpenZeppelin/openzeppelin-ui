import { Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  AddressField,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  NetworkIcon,
  NetworkSelector,
  TextField,
} from '@openzeppelin/ui-components';
import type { ContractAdapter, NetworkConfig } from '@openzeppelin/ui-types';

interface AddAliasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: { address: string; alias: string; networkId?: string }) => Promise<string>;
  currentNetworkId?: string;
  adapter?: ContractAdapter;
  resolveAdapter?: (network: NetworkConfig) => Promise<ContractAdapter | undefined>;
  addressPlaceholder?: string;
  resolveAddressPlaceholder?: (network: NetworkConfig) => string | undefined;
  resolveNetwork?: (networkId: string) => NetworkConfig | undefined;
  networks?: NetworkConfig[];
}

interface AddAliasFormData {
  address: string;
  alias: string;
}

/** Dialog for creating a new address alias entry. */
export function AddAliasDialog({
  open,
  onOpenChange,
  onSave,
  currentNetworkId,
  adapter: defaultAdapter,
  resolveAdapter,
  addressPlaceholder: defaultPlaceholder,
  resolveAddressPlaceholder,
  resolveNetwork,
  networks,
}: AddAliasDialogProps) {
  const [saving, setSaving] = useState(false);

  const initialNetwork = useMemo(
    () => (currentNetworkId && resolveNetwork ? resolveNetwork(currentNetworkId) : undefined),
    [currentNetworkId, resolveNetwork]
  );

  const [selectedNetwork, setSelectedNetwork] = useState<NetworkConfig | null>(
    initialNetwork ?? null
  );
  const [activeAdapter, setActiveAdapter] = useState<ContractAdapter | undefined>(defaultAdapter);
  const [activePlaceholder, setActivePlaceholder] = useState<string | undefined>(
    defaultPlaceholder
  );

  useEffect(() => {
    if (open) {
      setSelectedNetwork(initialNetwork ?? null);
      setActiveAdapter(defaultAdapter);
      setActivePlaceholder(defaultPlaceholder);
    }
  }, [open, initialNetwork, defaultAdapter, defaultPlaceholder]);

  const { control, handleSubmit, reset, trigger, formState } = useForm<AddAliasFormData>({
    defaultValues: { address: '', alias: '' },
    mode: 'onChange',
  });

  const handleNetworkChange = useCallback(
    async (network: NetworkConfig) => {
      setSelectedNetwork(network);

      if (resolveAddressPlaceholder) {
        setActivePlaceholder(resolveAddressPlaceholder(network));
      }

      if (resolveAdapter) {
        const newAdapter = await resolveAdapter(network);
        setActiveAdapter(newAdapter);
        trigger('address');
      }
    },
    [resolveAdapter, resolveAddressPlaceholder, trigger]
  );

  const canSubmit = formState.isValid && !saving;

  const onSubmit = useCallback(
    async (data: AddAliasFormData) => {
      setSaving(true);
      try {
        await onSave({
          address: data.address.trim(),
          alias: data.alias.trim(),
          networkId: selectedNetwork?.id,
        });
        reset();
        onOpenChange(false);
      } finally {
        setSaving(false);
      }
    },
    [onOpenChange, onSave, reset, selectedNetwork]
  );

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        reset();
        setSelectedNetwork(initialNetwork ?? null);
        setActiveAdapter(defaultAdapter);
        setActivePlaceholder(defaultPlaceholder);
      }
      onOpenChange(nextOpen);
    },
    [defaultAdapter, defaultPlaceholder, initialNetwork, onOpenChange, reset]
  );

  const hasNetworkSelection = networks && networks.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Alias</DialogTitle>
          <DialogDescription>Create a human-readable name for an address.</DialogDescription>
        </DialogHeader>

        <form id="add-alias-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {hasNetworkSelection && (
            <div className="space-y-2">
              <Label htmlFor="alias-network">Network</Label>
              <NetworkSelector
                networks={networks}
                selectedNetwork={selectedNetwork}
                onSelectNetwork={handleNetworkChange}
                getNetworkLabel={(n) => n.name}
                getNetworkId={(n) => n.id}
                getNetworkIcon={(n) => <NetworkIcon network={n} />}
                getNetworkType={(n) => n.type}
                groupByEcosystem
                getEcosystem={(n) => n.ecosystem.toUpperCase()}
                placeholder="Select network…"
              />
            </div>
          )}

          <AddressField
            id="new-alias-address"
            name="address"
            label="Address"
            placeholder={activePlaceholder}
            control={control}
            validation={{ required: true }}
            adapter={activeAdapter}
          />
          <TextField
            id="new-alias-name"
            name="alias"
            label="Alias"
            placeholder="e.g. Treasury"
            control={control}
            validation={{ required: true }}
          />
        </form>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="add-alias-form" size="sm" disabled={!canSubmit}>
            <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {saving ? 'Adding…' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
