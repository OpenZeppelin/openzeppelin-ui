import { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  AddressDisplay,
  AddressField,
  AddressLabelProvider,
  AddressSuggestionProvider,
  Checkbox,
  Label,
} from '@openzeppelin/ui-components';
import { AddressBookWidget, AliasEditPopover, useAliasEditState } from '@openzeppelin/ui-renderer';
import {
  useAddressBookWidgetProps,
  useAliasEditCallbacks,
  useAliasLabelResolver,
  useAliasSuggestionResolver,
} from '@openzeppelin/ui-storage';

import { useEcosystem } from '../context';
import { demoDb } from '../core/demoDb';
import {
  createResolveExplorerUrl,
  getAddressPlaceholder,
  getRuntimeAddressPlaceholder,
  resolveAddressing,
} from '../core/networkUtils';
import { DemoSection } from './DemoSection';

const SAMPLE_ADDRESSES = [
  '0x742d35cc6634c0532925a3b844bc9e7595f2bd18',
  '0xdac17f958d2ee523a2206206994597c13d831ec7',
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
];

interface SuggestionDemoForm {
  recipientAddress: string;
}

/**
 * Demo showcasing the Account Alias Storage plugin features:
 * - AddressBookWidget for managing aliases (add, edit, remove, search, import/export)
 * - AddressLabelProvider + useAliasLabelResolver for automatic label resolution
 * - AddressSuggestionProvider + useAliasSuggestionResolver for address autocomplete
 * - AddressDisplay with contextual label rendering
 * - Full network-aware features: network picker, badges, filtering
 */
export function AccountAliasDemo(): React.ReactElement {
  const { capabilities, network, availableNetworks, runtime } = useEcosystem();

  const [filterNetworkIds, setFilterNetworkIds] = useState<string[]>([]);
  const [enableEns, setEnableEns] = useState(false);

  const widgetProps = useAddressBookWidgetProps(demoDb, {
    networkId: network?.id,
    filterNetworkIds,
    onError: (title, err) => {
      // eslint-disable-next-line no-console
      console.error(`${title}:`, err);
    },
  });

  const labelResolver = useAliasLabelResolver(demoDb, { networkId: network?.id });
  const suggestionResolver = useAliasSuggestionResolver(demoDb);
  const editCallbacks = useAliasEditCallbacks(demoDb);

  const { editing, onEditLabel, handleClose, lastClickRef } = useAliasEditState(network?.id);

  const resolveNetwork = useCallback(
    (networkId: string) => availableNetworks.find((n) => n.id === networkId),
    [availableNetworks]
  );

  const resolveExplorerUrl = useMemo(
    () => createResolveExplorerUrl((id) => availableNetworks.find((n) => n.id === id)),
    [availableNetworks]
  );

  const addressPlaceholder = useMemo(() => getRuntimeAddressPlaceholder(runtime), [runtime]);

  const { control } = useForm<SuggestionDemoForm>({
    defaultValues: { recipientAddress: '' },
  });

  return (
    <DemoSection
      title="Account Alias Storage"
      description="The Account Alias plugin provides client-side address aliasing backed by IndexedDB. It includes a full-featured AddressBookWidget for CRUD operations, context-based label resolution, and address field autocomplete suggestions."
      codeExample={`import {
  AddressDisplay,
  AddressField,
  AddressLabelProvider,
  AddressSuggestionProvider,
} from '@openzeppelin/ui-components';
import {
  AddressBookWidget,
  AliasEditPopover,
  useAliasEditState,
} from '@openzeppelin/ui-renderer';
import {
  createDexieDatabase,
  getAliasSchema,
  useAddressBookWidgetProps,
  useAliasEditCallbacks,
  useAliasLabelResolver,
  useAliasSuggestionResolver,
} from '@openzeppelin/ui-storage';

const db = createDexieDatabase('my-app', [
  { version: 1, stores: getAliasSchema() },
]);

function App() {
  const widgetProps = useAddressBookWidgetProps(db, {
    networkId: selectedNetwork?.id,
    filterNetworkIds,
    onError: (title, err) => toast.error(title),
  });

  const labelResolver = useAliasLabelResolver(db);
  const suggestionResolver = useAliasSuggestionResolver(db);
  const editCallbacks = useAliasEditCallbacks(db);
  const { editing, onEditLabel, handleClose, lastClickRef } =
    useAliasEditState(selectedNetwork?.id);

  return (
    <div onPointerDown={(e) => {
      lastClickRef.current = { x: e.clientX, y: e.clientY };
    }}>
      <AddressLabelProvider {...labelResolver} onEditLabel={onEditLabel}>
        <AddressSuggestionProvider {...suggestionResolver}>
          {/* AddressDisplay with inline edit via popover */}
          <AddressDisplay address="0x742d35Cc..." showCopyButton />

          {/* AddressField with alias autocomplete */}
          <AddressField
            id="recipient"
            label="Recipient"
            name="recipient"
            control={control}
          />

          <AddressBookWidget
            {...widgetProps}
            addressing={capabilities ?? undefined}
            networks={availableNetworks}
            resolveNetwork={resolveNetwork}
            resolveExplorerUrl={resolveExplorerUrl}
            resolveAddressing={resolveAddressing}
            filterNetworkIds={filterNetworkIds}
            onFilterNetworkIdsChange={setFilterNetworkIds}
          />
        </AddressSuggestionProvider>
      </AddressLabelProvider>

      {/* Inline alias edit popover */}
      {editing && (
        <AliasEditPopover
          {...editing}
          onClose={handleClose}
          {...editCallbacks}
        />
      )}
    </div>
  );
}`}
    >
      <div
        className="space-y-8"
        onPointerDown={(e) => {
          lastClickRef.current = { x: e.clientX, y: e.clientY };
        }}
      >
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Address Book Widget</h3>
          <p className="text-sm text-muted-foreground">
            Full-featured address book with network picker, network badges, filtering, search,
            import/export, and CRUD operations. Add some aliases below, then scroll down to see them
            automatically resolved.
          </p>

          <div className="bg-muted/40 flex items-start gap-3 rounded-lg border p-3">
            <Checkbox
              id="enable-ens"
              checked={enableEns}
              onCheckedChange={(v) => setEnableEns(v === true)}
            />
            <div className="space-y-1">
              <Label htmlFor="enable-ens" className="font-medium">
                Enable ENS name resolution (
                <code className="bg-muted rounded px-1">enableNameResolution</code>)
              </Label>
              <p className="text-muted-foreground text-xs">
                A single opt-in prop. When on, the Add-alias dialog uses{' '}
                <code className="bg-muted rounded px-1">AddressFieldWithResolvedPreview</code> (type
                a name → it resolves to hex, shows a reverse ENS preview card, and auto-suggests the
                alias) and rows render the base{' '}
                <code className="bg-muted rounded px-1">AddressDisplay</code> fed by the
                reverse-name bridge. Requires ambient{' '}
                <code className="bg-muted rounded px-1">RuntimeProvider</code> +{' '}
                <code className="bg-muted rounded px-1">WalletStateProvider</code> (present here).
                Forward and reverse resolution follow the dialog&apos;s{' '}
                <strong>network dropdown</strong>— pick Ethereum Mainnet in Add Alias to resolve
                real ENS names without changing the app-wide header network.
              </p>
            </div>
          </div>

          <AddressBookWidget
            {...widgetProps}
            enableNameResolution={enableEns}
            addressing={capabilities ?? undefined}
            addressPlaceholder={addressPlaceholder}
            resolveNetwork={resolveNetwork}
            resolveExplorerUrl={resolveExplorerUrl}
            resolveAddressing={resolveAddressing}
            resolveAddressPlaceholder={getAddressPlaceholder}
            networks={availableNetworks}
            currentNetworkId={network?.id}
            filterNetworkIds={filterNetworkIds}
            onFilterNetworkIdsChange={setFilterNetworkIds}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Address Field Autocomplete</h3>
          <p className="text-sm text-muted-foreground">
            When wrapped in an{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              AddressSuggestionProvider
            </code>
            , all AddressField components automatically show alias suggestions as the user types.
            Add some aliases above, then start typing an alias name or address below.
          </p>

          <AddressSuggestionProvider {...suggestionResolver}>
            <div className="max-w-md">
              <AddressField
                id="demo-recipient"
                label="Recipient Address"
                name="recipientAddress"
                placeholder="Start typing an alias name..."
                helperText="Try typing the name of an alias you added above."
                control={control}
                addressing={capabilities ?? undefined}
              />
            </div>
          </AddressSuggestionProvider>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Contextual Label Resolution</h3>
          <p className="text-sm text-muted-foreground">
            All <code className="rounded bg-muted px-1.5 py-0.5 text-xs">AddressDisplay</code>{' '}
            components below automatically show aliases from the address book. Click the pencil icon
            to edit an alias inline, or add one via the widget above.
          </p>

          <div className="space-y-3">
            <AddressLabelProvider {...labelResolver} onEditLabel={onEditLabel}>
              {SAMPLE_ADDRESSES.map((addr) => (
                <div key={addr}>
                  <AddressDisplay address={addr} showCopyButton />
                </div>
              ))}
            </AddressLabelProvider>
          </div>
        </div>

        {editing && (
          <AliasEditPopover
            address={editing.address}
            networkId={editing.networkId}
            anchorRect={editing.anchorRect}
            onClose={handleClose}
            {...editCallbacks}
          />
        )}
      </div>
    </DemoSection>
  );
}
