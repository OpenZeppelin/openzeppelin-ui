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
import type { AddressingCapability, NetworkConfig } from '@openzeppelin/ui-types';

interface AddAliasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: { address: string; alias: string; networkId?: string }) => Promise<string>;
  currentNetworkId?: string;
  addressing?: AddressingCapability;
  resolveAddressing?: (network: NetworkConfig) => Promise<AddressingCapability | undefined>;
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
  addressing: defaultAddressing,
  resolveAddressing,
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
  const [activeAddressing, setActiveAddressing] = useState<AddressingCapability | undefined>(
    defaultAddressing
  );
  const [activePlaceholder, setActivePlaceholder] = useState<string | undefined>(
    defaultPlaceholder
  );

  useEffect(() => {
    if (open) {
      setSelectedNetwork(initialNetwork ?? null);
      setActiveAddressing(defaultAddressing);
      setActivePlaceholder(defaultPlaceholder);
    }
  }, [open, initialNetwork, defaultAddressing, defaultPlaceholder]);

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

      if (resolveAddressing) {
        const nextAddressing = await resolveAddressing(network);
        setActiveAddressing(nextAddressing);
        trigger('address');
      }
    },
    [resolveAddressing, resolveAddressPlaceholder, trigger]
  );

  const canSubmit = formState.isValid && !saving;

  const onSubmit = useCallback(
    async (data: AddAliasFormData) => {
      const networkId = selectedNetwork?.id;
      setSaving(true);
      try {
        await onSave({
          address: data.address.trim(),
          alias: data.alias.trim(),
          networkId,
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
        setActiveAddressing(defaultAddressing);
        setActivePlaceholder(defaultPlaceholder);
      }
      onOpenChange(nextOpen);
    },
    [defaultAddressing, defaultPlaceholder, initialNetwork, onOpenChange, reset]
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
            addressing={activeAddressing}
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
