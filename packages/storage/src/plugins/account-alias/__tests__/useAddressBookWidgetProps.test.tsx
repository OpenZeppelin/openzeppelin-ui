/**
 * Tests for useAddressBookWidgetProps bridge hook
 *
 * @vitest-environment jsdom
 */
import 'fake-indexeddb/auto';

import { act, renderHook, waitFor } from '@testing-library/react';
import type Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAliasStorage } from '../AliasStorage';
import { useAddressBookWidgetProps } from '../useAddressBookWidgetProps';
import { cleanupTestDatabase, createTestDatabase } from './setup';

const ADDR_A = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
const ADDR_B = '0x1234567890abcdef1234567890abcdef12345678';

describe('useAddressBookWidgetProps', () => {
  let db: Dexie;

  beforeEach(() => {
    db = createTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase(db);
  });

  it('starts in loading state then returns empty aliases', async () => {
    const { result } = renderHook(() => useAddressBookWidgetProps(db));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.aliases).toEqual([]);
  });

  it('returns aliases from storage', async () => {
    const storage = createAliasStorage(db);
    await storage.save({ address: ADDR_A, alias: 'Treasury' });
    await storage.save({ address: ADDR_B, alias: 'Dev Wallet' });

    const { result } = renderHook(() => useAddressBookWidgetProps(db));

    await waitFor(() => {
      expect(result.current.aliases).toHaveLength(2);
    });

    const names = result.current.aliases!.map((a) => a.alias).sort();
    expect(names).toEqual(['Dev Wallet', 'Treasury']);
  });

  it('onSave delegates to storage and returns id', async () => {
    const { result } = renderHook(() => useAddressBookWidgetProps(db));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let id: string;
    await act(async () => {
      id = await result.current.onSave({ address: ADDR_A, alias: 'Treasury' });
    });

    expect(id!).toBeDefined();

    await waitFor(() => {
      expect(result.current.aliases).toHaveLength(1);
      expect(result.current.aliases![0].alias).toBe('Treasury');
    });
  });

  it('onRemove deletes an alias', async () => {
    const storage = createAliasStorage(db);
    const id = await storage.save({ address: ADDR_A, alias: 'Treasury' });

    const { result } = renderHook(() => useAddressBookWidgetProps(db));

    await waitFor(() => {
      expect(result.current.aliases).toHaveLength(1);
    });

    await act(async () => {
      await result.current.onRemove(id);
    });

    await waitFor(() => {
      expect(result.current.aliases).toHaveLength(0);
    });
  });

  it('onClear removes all aliases', async () => {
    const storage = createAliasStorage(db);
    await storage.save({ address: ADDR_A, alias: 'Treasury' });
    await storage.save({ address: ADDR_B, alias: 'Dev' });

    const { result } = renderHook(() => useAddressBookWidgetProps(db));

    await waitFor(() => {
      expect(result.current.aliases).toHaveLength(2);
    });

    await act(async () => {
      await result.current.onClear();
    });

    await waitFor(() => {
      expect(result.current.aliases).toHaveLength(0);
    });
  });

  it('passes currentNetworkId from options', async () => {
    const { result } = renderHook(() =>
      useAddressBookWidgetProps(db, { networkId: 'ethereum-mainnet' })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.currentNetworkId).toBe('ethereum-mainnet');
  });

  it('alias shape includes all required fields', async () => {
    const storage = createAliasStorage(db);
    await storage.save({ address: ADDR_A, alias: 'Treasury', networkId: 'ethereum-mainnet' });

    const { result } = renderHook(() => useAddressBookWidgetProps(db));

    await waitFor(() => {
      expect(result.current.aliases).toHaveLength(1);
    });

    const alias = result.current.aliases![0];
    expect(alias).toHaveProperty('id');
    expect(alias).toHaveProperty('address', ADDR_A);
    expect(alias).toHaveProperty('alias', 'Treasury');
    expect(alias).toHaveProperty('networkId', 'ethereum-mainnet');
    expect(alias).toHaveProperty('createdAt');
    expect(alias).toHaveProperty('updatedAt');
    expect(alias.createdAt).toBeInstanceOf(Date);
    expect(alias.updatedAt).toBeInstanceOf(Date);
  });

  it('calls onError when onSave fails', async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useAddressBookWidgetProps(db, { onError }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Empty alias triggers INVALID_ALIAS validation error
    await expect(
      act(async () => {
        await result.current.onSave({ address: ADDR_A, alias: '' });
      })
    ).rejects.toThrow();

    expect(onError).toHaveBeenCalledWith('Failed to save alias', expect.any(Error));
  });

  it('reactively updates when records change externally', async () => {
    const { result } = renderHook(() => useAddressBookWidgetProps(db));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.aliases).toHaveLength(0);

    const storage = createAliasStorage(db);
    await act(async () => {
      await storage.save({ address: ADDR_A, alias: 'Treasury' });
    });

    await waitFor(() => {
      expect(result.current.aliases).toHaveLength(1);
    });
  });
});
