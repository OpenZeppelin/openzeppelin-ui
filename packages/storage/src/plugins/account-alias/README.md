# Account Alias Plugin

Address-to-alias mapping for blockchain addresses. Map addresses to human-readable names with configurable duplicate handling, multi-network support, import/export, and React hook integration.

## Basic Usage

```typescript
import { ALIAS_SCHEMA, createAliasStorage, createDexieDatabase } from '@openzeppelin/ui-storage';

// Create database with alias schema
const db = createDexieDatabase('MyApp', [{ version: 1, stores: ALIAS_SCHEMA }]);

// Create alias storage
const aliasStorage = createAliasStorage(db);

// Save an alias
await aliasStorage.save({ address: '0x742d35Cc...', alias: 'Treasury' });

// Lookup by address
const record = await aliasStorage.getByAddress('0x742d35Cc...');
console.log(record?.alias); // 'Treasury'

// Resolve alias to address
const address = await aliasStorage.resolveAlias('Treasury');
console.log(address); // '0x742d35Cc...'
```

## Multi-Network Support

The same address can have different aliases on different networks:

```typescript
// Global alias (no networkId)
await aliasStorage.save({ address: '0x123...', alias: 'Treasury' });

// Network-specific aliases
await aliasStorage.save({
  address: '0x123...',
  networkId: 'ethereum-mainnet',
  alias: 'ETH Treasury',
});
await aliasStorage.save({
  address: '0x123...',
  networkId: 'polygon-mainnet',
  alias: 'Polygon Treasury',
});

// Lookup by address and network
const ethRecord = await aliasStorage.getByAddressAndNetwork('0x123...', 'ethereum-mainnet');
console.log(ethRecord?.alias); // 'ETH Treasury'

// Get all aliases for an address
const allAliases = await aliasStorage.findByAddress('0x123...');
console.log(allAliases.length); // 3

// Filter by multiple networks
const records = await aliasStorage.getByNetworkIds(['ethereum-mainnet', 'polygon-mainnet']);
```

## Configuration Options

```typescript
const aliasStorage = createAliasStorage(db, {
  duplicateMode: 'strict', // 'strict' | 'warn' | 'allow'
  maxAliasLength: 64, // Max alias length (undefined to disable)
  enableLogging: true, // Enable/disable logging
  logLevel: 'info', // 'debug' | 'info' | 'warn' | 'error'
  onDuplicate: (alias, existingAddr) => {
    console.warn(`Duplicate alias: ${alias}`);
  },
});
```

## React Hook Integration

```tsx
import { createUseAliasStorage } from '@openzeppelin/ui-storage';

const useAliasStorage = createUseAliasStorage(db, {
  onError: (title, error) => toast.error(title),
});

function AddressBook() {
  const { records, isLoading, save, remove } = useAliasStorage();

  if (isLoading) return <div>Loading...</div>;

  return (
    <ul>
      {records?.map((r) => (
        <li key={r.id}>
          {r.alias}: {r.address}
        </li>
      ))}
    </ul>
  );
}
```

## Import/Export

```typescript
// Export all aliases to JSON
const json = await aliasStorage.exportJson();

// Import aliases from JSON
const result = await aliasStorage.importJson(json);
console.log(`Imported: ${result.imported}, Skipped: ${result.skipped}`);
```

## Error Handling

```typescript
import { AliasStorageError } from '@openzeppelin/ui-storage';

try {
  await aliasStorage.save({ address: '0x...', alias: 'Treasury' });
} catch (error) {
  if (error instanceof AliasStorageError) {
    switch (error.code) {
      case 'DUPLICATE_ALIAS':
        console.error('Alias already in use');
        break;
      case 'ALIAS_TOO_LONG':
        console.error('Alias exceeds max length');
        break;
      case 'STORAGE_QUOTA_EXCEEDED':
        console.error('Storage quota exceeded');
        break;
    }
  }
}
```

## Adding to Existing Projects

Add the alias schema in a new database version:

```typescript
import { ALIAS_SCHEMA, createDexieDatabase } from '@openzeppelin/ui-storage';

const db = createDexieDatabase('MyApp', [
  { version: 1, stores: { users: '++id, email' } },
  { version: 2, stores: { users: '++id, email', ...ALIAS_SCHEMA } },
]);
```

## UI Integration Hooks

These hooks bridge alias data into `@openzeppelin/ui-components` context providers, enabling automatic label resolution and address autocomplete with zero call-site changes.

### `useAliasLabelResolver(db, options?)`

Returns an `AddressLabelResolver` that can be spread into `AddressLabelProvider`. All `AddressDisplay` instances in the subtree automatically resolve aliases.

```tsx
import { AddressLabelProvider } from '@openzeppelin/ui-components';
import { useAliasLabelResolver } from '@openzeppelin/ui-storage';

function App() {
  const labelResolver = useAliasLabelResolver(db, { networkId: 'ethereum-mainnet' });

  return (
    <AddressLabelProvider {...labelResolver}>
      {/* Every AddressDisplay below auto-resolves aliases */}
      <AddressDisplay address="0x742d35Cc..." showCopyButton />
    </AddressLabelProvider>
  );
}
```

**Options:**

- `networkId?: string` — Scope label resolution to a specific network

### `useAliasSuggestionResolver(db)`

Returns an `AddressSuggestionResolver` that can be spread into `AddressSuggestionProvider`. All `AddressField` instances in the subtree automatically show alias suggestions.

```tsx
import { AddressSuggestionProvider } from '@openzeppelin/ui-components';
import { useAliasSuggestionResolver } from '@openzeppelin/ui-storage';

function App() {
  const suggestionResolver = useAliasSuggestionResolver(db);

  return (
    <AddressSuggestionProvider {...suggestionResolver}>
      {/* Every AddressField below gets autocomplete */}
      <AddressField id="to" name="to" control={control} />
    </AddressSuggestionProvider>
  );
}
```

### `useAddressBookWidgetProps(db, options?)`

Returns spread-ready props for the `AddressBookWidget` component from `@openzeppelin/ui-renderer`. Handles all CRUD operations, import/export, and network filtering.

```tsx
import { AddressBookWidget } from '@openzeppelin/ui-renderer';
import { useAddressBookWidgetProps } from '@openzeppelin/ui-storage';

function Settings() {
  const widgetProps = useAddressBookWidgetProps(db, {
    networkId: selectedNetwork?.id,
    filterNetworkIds,
    onError: (title, err) => toast.error(title),
  });

  return <AddressBookWidget {...widgetProps} />;
}
```

**Options:**

- `networkId?: string` — Current network for scoping display
- `filterNetworkIds?: string[]` — Multi-network filter (empty = show all)
- `onError?: (title: string, error: unknown) => void` — Error callback

### `useAliasEditCallbacks(db)`

Returns `onLookup` and `onSave` callbacks for the `AliasEditPopover` from `@openzeppelin/ui-renderer`.

```tsx
import { AliasEditPopover } from '@openzeppelin/ui-renderer';
import { useAliasEditCallbacks } from '@openzeppelin/ui-storage';

const editCallbacks = useAliasEditCallbacks(db);

<AliasEditPopover {...editing} onClose={handleClose} {...editCallbacks} />;
```
