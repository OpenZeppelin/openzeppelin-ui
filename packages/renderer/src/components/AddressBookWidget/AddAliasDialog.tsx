import { Plus } from 'lucide-react';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import {
  AddressField,
  AddressFieldWithResolvedPreview,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  NameResolverProvider,
  NetworkIcon,
  NetworkSelector,
  TextField,
  type AddressFieldProps,
} from '@openzeppelin/ui-components';
import { useRuntimeNameResolver, WalletStateContext } from '@openzeppelin/ui-react';
import type { AddressingCapability, NetworkConfig } from '@openzeppelin/ui-types';

import { ResolvedAddressFieldPreviewWithNameResolution } from '../ResolvedAddressFieldPreviewWithNameResolution';

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
  /**
   * When true, wire the address field to the active runtime's name resolution
   * (ENS) via the injected NameResolverContext. Degrades gracefully without a
   * WalletStateProvider / capability: names surface UNSUPPORTED_NETWORK, hex
   * entry is unchanged.
   */
  enableNameResolution?: boolean;
}

interface AddAliasFormData {
  address: string;
  alias: string;
}

interface ResolvingAliasAddressFieldProps extends AddressFieldProps<AddAliasFormData> {
  /**
   * Network the dialog will save the alias under. The SF-6 chain-scope gate
   * must compare provenance against THIS id (not the wallet's active network),
   * otherwise a mainnet resolve can be saved as a Base-scoped book entry.
   */
  dialogNetworkId?: string | null;
  dialogNetworkName?: string;
}

/**
 * ENS-capable variant of the alias address field (SF-5 over SF-3 Rev-2): the
 * base `AddressField` wired to the active runtime through the injected
 * `NameResolverContext`. A separate component so the runtime wiring hook
 * mounts only when `enableNameResolution` is on — the legacy branch stays
 * hook-free and byte-identical (INV-95 / INV-107).
 *
 * Chain-scope gate uses the dialog-selected network (fallback: wallet active)
 * so the gate network matches `onSave`'s `networkId`.
 */
function ResolvingAliasAddressField({
  dialogNetworkId,
  dialogNetworkName,
  ...props
}: ResolvingAliasAddressFieldProps) {
  const resolver = useRuntimeNameResolver();
  const walletState = useContext(WalletStateContext);
  const previewAddress = useWatch({ control: props.control, name: props.name });

  return (
    <NameResolverProvider
      {...resolver}
      activeNetworkId={dialogNetworkId ?? walletState?.activeNetworkId ?? null}
      activeNetworkName={dialogNetworkName ?? walletState?.activeNetworkConfig?.name}
    >
      <AddressFieldWithResolvedPreview<AddAliasFormData>
        {...props}
        previewAddress={previewAddress}
        previewNetworkId={dialogNetworkId ?? undefined}
        preview={
          <ResolvedAddressFieldPreviewWithNameResolution
            address={previewAddress}
            networkId={dialogNetworkId ?? undefined}
            addressing={props.addressing}
          />
        }
      />
    </NameResolverProvider>
  );
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
  enableNameResolution,
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

  const { control, handleSubmit, reset, trigger, formState, setValue, getValues } =
    useForm<AddAliasFormData>({
      defaultValues: { address: '', alias: '' },
      mode: 'onChange',
    });

  // INV-103 / INV-112: "the user claimed the alias" is tracked from the alias
  // field's OWN user edits (`TextField.onUserEdit`), set synchronously inside the
  // keystroke handler — strictly before any resolution effect can flush, so a
  // settling suggestion can never clobber a just-typed alias. RHF's `dirtyFields`
  // cannot carry this: an address keystroke's form-wide dirty recompute
  // retroactively marks the seeded (value ≠ default) alias dirty even though it
  // was written with `shouldDirty: false`, which suppressed every later re-seed
  // (INV-102/INV-105). Sticky for the dialog session; cleared with each `reset()`.
  // Inert on the legacy path (nothing reads it when `enableNameResolution` is
  // off — INV-107).
  const aliasClaimedRef = useRef(false);
  const handleAliasUserEdit = useCallback(() => {
    aliasClaimedRef.current = true;
  }, []);

  // Alias auto-suggestion from the resolved ENS name (wired ONLY to the ENS-aware field).
  const handleResolvedName = useCallback(
    (name: string | undefined) => {
      // INV-103: once the user has typed in the alias, the field is theirs for the rest
      // of the dialog session — neither a new suggestion nor a withdrawal touches it.
      if (aliasClaimedRef.current) return;
      const next = name ?? '';
      // INV-96 parity: with nothing to seed and nothing to withdraw, leave the
      // field alone. In particular the mount-time `undefined` emission must not
      // validate the pristine alias — the ENS branch mounts as clean as legacy
      // ("This field is required" never appears before any interaction).
      if (next === getValues('alias')) return;
      // INV-102 (seed while unclaimed) + INV-104 (withdraw to '' on `undefined` while
      // unclaimed — CQ3: blank while re-resolving, never show a stale name that no longer
      // matches the address being resolved) + INV-105 (successive resolutions keep
      // updating the unclaimed seed). INV-116: writes a value only, never focus.
      setValue('alias', next, { shouldDirty: false, shouldValidate: true });
    },
    [getValues, setValue]
  );

  // When the dialog opens, seed network + addressing/placeholder from the props.
  // If an `initialNetwork` is preselected and matching resolvers are provided,
  // also resolve addressing/placeholder for that network so the AddressField has
  // a network-specific validator from the first render. Without this, the field
  // would only get the explicit `addressing` default (often `undefined`) until
  // the user manually changed the network selector — silently accepting any
  // non-empty input as valid in the meantime.
  useEffect(() => {
    if (!open) return;

    setSelectedNetwork(initialNetwork ?? null);
    setActiveAddressing(defaultAddressing);
    setActivePlaceholder(
      initialNetwork && resolveAddressPlaceholder
        ? (resolveAddressPlaceholder(initialNetwork) ?? defaultPlaceholder)
        : defaultPlaceholder
    );

    if (!initialNetwork || !resolveAddressing) return;

    let cancelled = false;
    void resolveAddressing(initialNetwork).then((nextAddressing) => {
      if (cancelled) return;
      setActiveAddressing(nextAddressing);
      // Re-validate the address field once the network-specific validator is in place.
      trigger('address');
    });
    return () => {
      cancelled = true;
    };
  }, [
    open,
    initialNetwork,
    defaultAddressing,
    defaultPlaceholder,
    resolveAddressing,
    resolveAddressPlaceholder,
    trigger,
  ]);

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
        aliasClaimedRef.current = false;
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
        aliasClaimedRef.current = false;
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

          {/* INV-95: a single static branch over element choice only — never a
              conditional hook, never both fields mounted. All props are identical across
              branches except the ENS-only `onResolvedNameChange` notification. */}
          {enableNameResolution ? (
            <ResolvingAliasAddressField
              id="new-alias-address"
              name="address"
              label="Address"
              placeholder={activePlaceholder}
              control={control}
              validation={{ required: true }}
              addressing={activeAddressing}
              onResolvedNameChange={handleResolvedName}
              dialogNetworkId={selectedNetwork?.id}
              dialogNetworkName={selectedNetwork?.name}
            />
          ) : (
            <AddressField
              id="new-alias-address"
              name="address"
              label="Address"
              placeholder={activePlaceholder}
              control={control}
              validation={{ required: true }}
              addressing={activeAddressing}
            />
          )}
          <TextField
            id="new-alias-name"
            name="alias"
            label="Alias"
            placeholder="e.g. Treasury"
            control={control}
            validation={{ required: true }}
            onUserEdit={handleAliasUserEdit}
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
