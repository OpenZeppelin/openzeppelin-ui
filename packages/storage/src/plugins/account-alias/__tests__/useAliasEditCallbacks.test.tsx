/**
 * Tests for useAliasEditCallbacks hook
 *
 * Tests cover:
 * - onLookup returns undefined when no alias exists
 * - onLookup returns { id, alias } when alias exists
 * - onSave creates a new alias and returns the record ID
 * - onSave updates an existing alias
 * - onRemove deletes an alias by ID
 * - Respects networkId for lookups
 *
 * @vitest-environment jsdom
 */
import 'fake-indexeddb/auto';

import { renderHook } from '@testing-library/react';
import type Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createAliasStorage } from '../AliasStorage';
import { useAliasEditCallbacks } from '../useAliasEditCallbacks';
import { cleanupTestDatabase, createTestDatabase } from './setup';

const ADDR = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

describe('useAliasEditCallbacks', () => {
  let db: Dexie;

  beforeEach(() => {
    db = createTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase(db);
  });

  it('onLookup returns undefined when no alias exists', async () => {
    const { result } = renderHook(() => useAliasEditCallbacks(db));

    const lookup = await result.current.onLookup(ADDR);
    expect(lookup).toBeUndefined();
  });

  it('onLookup returns id and alias when alias exists', async () => {
    const storage = createAliasStorage(db);
    const id = await storage.save({ address: ADDR, alias: 'Treasury' });

    const { result } = renderHook(() => useAliasEditCallbacks(db));

    const lookup = await result.current.onLookup(ADDR);
    expect(lookup).toEqual({ id, alias: 'Treasury' });
  });

  it('onLookup respects networkId', async () => {
    const storage = createAliasStorage(db);
    await storage.save({ address: ADDR, alias: 'Mainnet Treasury', networkId: 'ethereum-mainnet' });
    await storage.save({ address: ADDR, alias: 'Testnet Treasury', networkId: 'ethereum-sepolia' });

    const { result } = renderHook(() => useAliasEditCallbacks(db));

    const mainnet = await result.current.onLookup(ADDR, 'ethereum-mainnet');
    expect(mainnet?.alias).toBe('Mainnet Treasury');

    const testnet = await result.current.onLookup(ADDR, 'ethereum-sepolia');
    expect(testnet?.alias).toBe('Testnet Treasury');
  });

  it('onSave creates a new alias and returns the record ID', async () => {
    const { result } = renderHook(() => useAliasEditCallbacks(db));

    const id = await result.current.onSave({ address: ADDR, alias: 'New Alias' });
    expect(id).toBeTruthy();

    const lookup = await result.current.onLookup(ADDR);
    expect(lookup?.alias).toBe('New Alias');
  });

  it('onSave updates an existing alias', async () => {
    const { result } = renderHook(() => useAliasEditCallbacks(db));

    await result.current.onSave({ address: ADDR, alias: 'Original' });
    await result.current.onSave({ address: ADDR, alias: 'Updated' });

    const lookup = await result.current.onLookup(ADDR);
    expect(lookup?.alias).toBe('Updated');
  });

  it('onRemove deletes an alias by ID', async () => {
    const { result } = renderHook(() => useAliasEditCallbacks(db));

    const id = await result.current.onSave({ address: ADDR, alias: 'To Remove' });

    const beforeRemove = await result.current.onLookup(ADDR);
    expect(beforeRemove).toBeDefined();

    await result.current.onRemove(id);

    const afterRemove = await result.current.onLookup(ADDR);
    expect(afterRemove).toBeUndefined();
  });
});
