# @openzeppelin/ui-storage

A React-first storage abstraction built on Dexie.js for IndexedDB.

[![npm version](https://img.shields.io/npm/v/@openzeppelin/ui-storage.svg)](https://www.npmjs.com/package/@openzeppelin/ui-storage)

## Installation

```bash
# Using npm
npm install @openzeppelin/ui-storage

# Using yarn
yarn add @openzeppelin/ui-storage

# Using pnpm
pnpm add @openzeppelin/ui-storage
```

## Peer Dependencies

```bash
pnpm add react
```

## Overview

This package provides a generic storage infrastructure built on top of IndexedDB using Dexie.js. It includes base classes for creating type-safe storage services, a React live-query hook, database creation utilities, and helpful abstractions. Each consuming application defines its own database name, schema, and domain-specific storage classes.

## Features

- **Entity Storage**: `EntityStorage` class for creating entity/record storage services
- **Key-Value Storage**: `KeyValueStorage` class for settings, preferences, and configuration stores
- **React Support**: `useLiveQuery` re-exported for convenience
- **App-Agnostic Schemas**: Each app defines its own DB name and stores
- **Type Safety**: Full TypeScript support with generics
- **Performance**: Optimized for large datasets with configurable limits
- **CRUD Operations**: Create, Read, Update, Delete helpers
- **Bulk Operations**: Efficient bulk add/put/delete
- **Index Queries**: Query by indexed fields
- **Quota Handling**: Cross-browser quota exceeded error detection
- **[Account Alias Plugin](./src/plugins/account-alias/README.md)**: Map blockchain addresses to human-readable names

## Quick Start

### 1. Define Your Database Schema

```typescript
import { createDexieDatabase } from '@openzeppelin/ui-storage';

export const db = createDexieDatabase('MyApp', [
  {
    version: 1,
    stores: {
      items: '++id, name, createdAt, updatedAt',
      settings: '&key',
    },
  },
  {
    version: 2,
    stores: {
      items: '++id, name, createdAt, updatedAt, category',
      settings: '&key',
    },
    upgrade: async (trans) => {
      // Migration logic for version 2
    },
  },
]);
```

### 2. Define Your Record Types

```typescript
import type { BaseRecord } from '@openzeppelin/ui-storage';

export interface ItemRecord extends BaseRecord {
  name: string;
  category?: string;
}
```

### 3. Create Storage Services

```typescript
import { EntityStorage, useLiveQuery } from '@openzeppelin/ui-storage';

import { db } from './database';
import type { ItemRecord } from './types';

export class ItemStorage extends EntityStorage<ItemRecord> {
  constructor() {
    super(db, 'items');
  }

  async getByName(name: string): Promise<ItemRecord | undefined> {
    return await this.findByIndex('name', name).then((results) => results[0]);
  }

  async getByCategory(category: string): Promise<ItemRecord[]> {
    return await this.findByIndex('category', category);
  }
}

export const itemStorage = new ItemStorage();

export function useItems() {
  const items = useLiveQuery(() => itemStorage.getAll());
  const isLoading = items === undefined;
  return { items, isLoading };
}
```

## API Reference

### `createDexieDatabase(name, versions)`

Creates a configured Dexie database instance with versioned stores.

**Parameters:**

- `name: string` - Database name (e.g., 'UIBuilder', 'RoleManager')
- `versions: DbVersion[]` - Array of version definitions

**Returns:** `Dexie` - Configured database instance

### `EntityStorage<T>`

Abstract base class for entity storage. Use this for collections of records with auto-generated IDs.

| Use Case                                     | Base Class           | Schema      |
| -------------------------------------------- | -------------------- | ----------- |
| Entity collections (users, items, contracts) | `EntityStorage<T>`   | `++id, ...` |
| Settings, preferences, config                | `KeyValueStorage<V>` | `&key`      |

**Methods:**

- `save(record)`: Create a new record
- `update(id, updates)`: Update an existing record
- `delete(id)`: Delete a record
- `get(id)`: Get a record by ID
- `getAll()`: Get all records
- `has(id)`: Check if record exists
- `count()`: Count records
- `clear()`: Delete all records
- `bulkAdd(records)`: Add multiple records
- `bulkPut(records)`: Upsert multiple records
- `bulkDelete(ids)`: Delete multiple records
- `findByIndex(index, value)`: Query by index

### `KeyValueStorage<V>`

Abstract base class for key-value storage. Use for settings, preferences, and configuration.

**Methods:**

- `set(key, value)`: Set a value (upsert)
- `get<T>(key)`: Get a value with type casting
- `getOrDefault<T>(key, defaultValue)`: Get with fallback
- `delete(key)`: Delete a key
- `has(key)`: Check if key exists
- `keys()`: Get all keys
- `getAll()`: Get all records
- `clear()`: Clear all entries
- `count()`: Count entries
- `setMany(entries)`: Bulk set
- `getMany(keys)`: Bulk get
- `deleteMany(keys)`: Bulk delete

### `BaseRecord`

```typescript
interface BaseRecord {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## Examples

### Entity Storage

```typescript
import { createDexieDatabase, EntityStorage } from '@openzeppelin/ui-storage';

export const db = createDexieDatabase('MyApp', [
  {
    version: 1,
    stores: {
      items: '++id, title, createdAt, updatedAt',
    },
  },
]);

export class ItemStorage extends EntityStorage<ItemRecord> {
  constructor() {
    super(db, 'items', { maxRecordSizeBytes: 50 * 1024 * 1024 });
  }
}
```

### Key-Value Storage

```typescript
import { createDexieDatabase, KeyValueStorage } from '@openzeppelin/ui-storage';

export const db = createDexieDatabase('MyApp', [
  {
    version: 1,
    stores: {
      settings: '&key',
    },
  },
]);

class SettingsStorage extends KeyValueStorage<unknown> {
  constructor() {
    super(db, 'settings');
  }

  async getTheme(): Promise<'light' | 'dark'> {
    return (await this.get<'light' | 'dark'>('theme')) ?? 'light';
  }

  async setTheme(theme: 'light' | 'dark'): Promise<void> {
    await this.set('theme', theme);
  }
}

export const settingsStorage = new SettingsStorage();

// Usage
await settingsStorage.set('theme', 'dark');
await settingsStorage.set('language', 'en');
const theme = await settingsStorage.get<string>('theme'); // 'dark'
```

## Plugins

The storage package ships with domain-specific plugins that build on top of the core infrastructure. Each plugin has its own documentation.

| Plugin            | Description                                                                                                                            | Docs                                            |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **Account Alias** | Map blockchain addresses to human-readable names with multi-network support, React hooks, import/export, and ui-components integration | [README](./src/plugins/account-alias/README.md) |

See the [plugins directory](./src/plugins/README.md) for an overview.

## Development

```bash
# Build the package
pnpm build

# Run tests
pnpm test

# Lint
pnpm lint
```

## License

[AGPL-3.0](https://github.com/OpenZeppelin/openzeppelin-ui/blob/main/LICENSE)
