# Quickstart: Account Alias Storage

Get started with the Account Alias Storage plugin in under 5 minutes.

## Installation

The plugin is included in `@openzeppelin/ui-storage`. No additional installation required.

```bash
pnpm add @openzeppelin/ui-storage
```

## Basic Usage (3 Lines)

```typescript
import { ALIAS_SCHEMA, createAliasStorage, createDexieDatabase } from '@openzeppelin/ui-storage';

// 1. Create database with alias schema
const db = createDexieDatabase('MyApp', [{ version: 1, stores: ALIAS_SCHEMA }]);

// 2. Create alias storage
const aliasStorage = createAliasStorage(db);

// 3. Start using it!
await aliasStorage.save({ address: '0x742d35Cc...', alias: 'Treasury' });
```

## Core Operations

### Create an Alias

```typescript
// Simple alias
await aliasStorage.save({
  address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  alias: 'Treasury',
});

// With metadata
await aliasStorage.save({
  address: '0x1234...',
  alias: 'Dev Wallet',
  metadata: {
    category: 'development',
    chainId: 1,
    notes: 'Main development wallet',
  },
});
```

### Lookup by Alias

```typescript
// Get full record
const record = await aliasStorage.getByAlias('Treasury');
console.log(record?.address); // '0x742d35Cc...'

// Quick resolve to address
const address = await aliasStorage.resolveAlias('Treasury');
console.log(address); // '0x742d35Cc...'
```

### Lookup by Address

```typescript
// Get full record
const record = await aliasStorage.getByAddress('0x742d35Cc...');
console.log(record?.alias); // 'Treasury'

// Quick resolve to alias
const alias = await aliasStorage.resolveAddress('0x742d35Cc...');
console.log(alias); // 'Treasury'
```

### Update an Alias

```typescript
// Get record first
const record = await aliasStorage.getByAddress('0x742d35Cc...');

// Update alias name
await aliasStorage.update(record.id, { alias: 'Main Treasury' });

// Or update just metadata
await aliasStorage.update(record.id, {
  metadata: { ...record.metadata, verified: true },
});
```

### Delete an Alias

```typescript
// By address
await aliasStorage.deleteByAddress('0x742d35Cc...');

// By alias name
await aliasStorage.deleteByAlias('Treasury');

// By record ID
await aliasStorage.delete(record.id);
```

### List All Aliases

```typescript
const allAliases = await aliasStorage.getAll();
console.log(`Total aliases: ${allAliases.length}`);

allAliases.forEach((record) => {
  console.log(`${record.alias}: ${record.address}`);
});
```

## Configuration Options

### Duplicate Handling

```typescript
// Strict mode (default) - reject duplicates
const strict = createAliasStorage(db, { duplicateMode: 'strict' });

// Warn mode - allow with callback
const warn = createAliasStorage(db, {
  duplicateMode: 'warn',
  onDuplicate: (alias, existingAddr) => {
    console.warn(`Alias "${alias}" already used by ${existingAddr}`);
  },
});

// Allow mode - silently allow duplicates
const allow = createAliasStorage(db, { duplicateMode: 'allow' });
```

### Length Limits

```typescript
// Custom max length
const storage = createAliasStorage(db, { maxAliasLength: 32 });

// Disable length checking
const noLimit = createAliasStorage(db, { maxAliasLength: undefined });
```

### Logging

```typescript
// Enable debug logging
const storage = createAliasStorage(db, {
  enableLogging: true,
  logLevel: 'debug',
});

// Disable all logging
const silent = createAliasStorage(db, { enableLogging: false });
```

## React Integration

### Using the Hook

```tsx
import { createUseAliasStorage } from '@openzeppelin/ui-storage';

// Create the hook (once, at app level)
const useAliasStorage = createUseAliasStorage(db, {
  onError: (title, err) => toast.error(title),
});

// Use in components
function AddressBook() {
  const { records, isLoading, save, remove, resolveAddress } = useAliasStorage();

  if (isLoading) return <Spinner />;

  return (
    <ul>
      {records?.map((record) => (
        <li key={record.id}>
          {record.alias}: {record.address}
          <button onClick={() => remove(record.id)}>Delete</button>
        </li>
      ))}
    </ul>
  );
}
```

### Live Updates

The hook automatically updates when aliases change:

```tsx
function AliasDisplay({ address }: { address: string }) {
  const { records } = useAliasStorage();

  // Automatically re-renders when any alias changes
  const alias = records?.find((r) => r.address === address)?.alias;

  return <span>{alias || address}</span>;
}
```

## Adding to Existing Projects

If you already have a database, add the alias schema in a new version:

```typescript
import { ALIAS_SCHEMA, createDexieDatabase } from '@openzeppelin/ui-storage';

const db = createDexieDatabase('MyExistingApp', [
  // Your existing schemas
  { version: 1, stores: { users: '++id, email', settings: '&key' } },
  { version: 2, stores: { users: '++id, email', posts: '++id, userId' } },

  // Add alias plugin in new version
  {
    version: 3,
    stores: {
      users: '++id, email',
      posts: '++id, userId',
      ...ALIAS_SCHEMA, // Adds 'aliases' table
    },
  },
]);
```

## Import/Export

### Export to JSON

```typescript
// Export all
const json = await aliasStorage.exportJson();
downloadFile('aliases.json', json);

// Export specific records
const json = await aliasStorage.exportJson(['id1', 'id2', 'id3']);
```

### Import from JSON

```typescript
const json = await readFile('aliases.json');
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
        console.error('This alias name is already in use');
        break;
      case 'ALIAS_TOO_LONG':
        console.error('Alias name exceeds maximum length');
        break;
      case 'STORAGE_QUOTA_EXCEEDED':
        console.error('Browser storage is full');
        break;
    }
  }
}
```

## TypeScript Support

Full type safety is included:

```typescript
import type {
  AliasInput,
  AliasRecord,
  AliasStorageOptions,
  ImportResult,
} from '@openzeppelin/ui-storage';

// Type-safe input
const input: AliasInput = {
  address: '0x...',
  alias: 'Treasury',
  metadata: { category: 'main' },
};

// Type-safe record access
const record: AliasRecord | undefined = await aliasStorage.getByAlias('Treasury');
if (record) {
  console.log(record.createdAt); // Date
  console.log(record.metadata?.category); // unknown
}
```
