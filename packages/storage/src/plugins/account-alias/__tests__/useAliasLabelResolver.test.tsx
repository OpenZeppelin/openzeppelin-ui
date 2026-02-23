/**
 * Tests for useAliasLabelResolver hook
 *
 * Tests cover:
 * - Returns undefined when no aliases exist
 * - Resolves label after alias is saved
 * - Respects networkId filtering
 * - Falls back to global alias when no network-specific match
 * - Case-insensitive address matching
 *
 * @vitest-environment jsdom
 */
import 'fake-indexeddb/auto';

import { act, renderHook, waitFor } from '@testing-library/react';
import type Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createAliasStorage } from '../AliasStorage';
import { useAliasLabelResolver } from '../useAliasLabelResolver';
import { cleanupTestDatabase, createTestDatabase } from './setup';

const ADDR_TREASURY = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
const ADDR_DEV = '0x1234567890abcdef1234567890abcdef12345678';

describe('useAliasLabelResolver', () => {
  let db: Dexie;

  beforeEach(() => {
    db = createTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase(db);
  });

  it('returns undefined when no aliases exist', async () => {
    const { result } = renderHook(() => useAliasLabelResolver(db));

    await waitFor(() => {
      expect(result.current.resolveLabel(ADDR_TREASURY)).toBeUndefined();
    });
  });

  it('resolves label after alias is saved', async () => {
    const storage = createAliasStorage(db);
    await storage.save({ address: ADDR_TREASURY, alias: 'Treasury' });

    const { result } = renderHook(() => useAliasLabelResolver(db));

    await waitFor(() => {
      expect(result.current.resolveLabel(ADDR_TREASURY)).toBe('Treasury');
    });
  });

  it('resolves label case-insensitively', async () => {
    const storage = createAliasStorage(db);
    await storage.save({ address: ADDR_TREASURY, alias: 'Treasury' });

    const { result } = renderHook(() => useAliasLabelResolver(db));

    await waitFor(() => {
      expect(result.current.resolveLabel(ADDR_TREASURY.toLowerCase())).toBe('Treasury');
      expect(result.current.resolveLabel(ADDR_TREASURY.toUpperCase())).toBe('Treasury');
    });
  });

  it('returns undefined for unknown address', async () => {
    const storage = createAliasStorage(db);
    await storage.save({ address: ADDR_TREASURY, alias: 'Treasury' });

    const { result } = renderHook(() => useAliasLabelResolver(db));

    await waitFor(() => {
      expect(result.current.resolveLabel(ADDR_TREASURY)).toBe('Treasury');
    });

    expect(result.current.resolveLabel(ADDR_DEV)).toBeUndefined();
  });

  describe('network-specific resolution', () => {
    it('resolves network-specific alias when networkId is passed to resolveLabel', async () => {
      const storage = createAliasStorage(db);
      await storage.save({
        address: ADDR_TREASURY,
        alias: 'Treasury ETH',
        networkId: 'ethereum-mainnet',
      });

      const { result } = renderHook(() => useAliasLabelResolver(db));

      await waitFor(() => {
        expect(result.current.resolveLabel(ADDR_TREASURY, 'ethereum-mainnet')).toBe('Treasury ETH');
      });
    });

    it('uses default networkId from options', async () => {
      const storage = createAliasStorage(db);
      await storage.save({
        address: ADDR_TREASURY,
        alias: 'Treasury Polygon',
        networkId: 'polygon-mainnet',
      });

      const { result } = renderHook(() =>
        useAliasLabelResolver(db, { networkId: 'polygon-mainnet' })
      );

      await waitFor(() => {
        expect(result.current.resolveLabel(ADDR_TREASURY)).toBe('Treasury Polygon');
      });
    });

    it('caller networkId overrides default networkId', async () => {
      const storage = createAliasStorage(db);
      await storage.save({
        address: ADDR_TREASURY,
        alias: 'Treasury ETH',
        networkId: 'ethereum-mainnet',
      });
      await storage.save({
        address: ADDR_TREASURY,
        alias: 'Treasury Polygon',
        networkId: 'polygon-mainnet',
      });

      const { result } = renderHook(() =>
        useAliasLabelResolver(db, { networkId: 'polygon-mainnet' })
      );

      await waitFor(() => {
        expect(result.current.resolveLabel(ADDR_TREASURY, 'ethereum-mainnet')).toBe('Treasury ETH');
      });
    });

    it('falls back to global alias when no network-specific match', async () => {
      const storage = createAliasStorage(db);
      await storage.save({ address: ADDR_TREASURY, alias: 'Treasury Global' });

      const { result } = renderHook(() =>
        useAliasLabelResolver(db, { networkId: 'ethereum-mainnet' })
      );

      await waitFor(() => {
        expect(result.current.resolveLabel(ADDR_TREASURY)).toBe('Treasury Global');
      });
    });

    it('prefers network-specific over global', async () => {
      const storage = createAliasStorage(db);
      await storage.save({ address: ADDR_TREASURY, alias: 'Treasury Global' });
      await storage.save({
        address: ADDR_TREASURY,
        alias: 'Treasury ETH',
        networkId: 'ethereum-mainnet',
      });

      const { result } = renderHook(() =>
        useAliasLabelResolver(db, { networkId: 'ethereum-mainnet' })
      );

      await waitFor(() => {
        expect(result.current.resolveLabel(ADDR_TREASURY)).toBe('Treasury ETH');
      });
    });
  });

  it('reactively updates when alias is added', async () => {
    const storage = createAliasStorage(db);

    const { result } = renderHook(() => useAliasLabelResolver(db));

    await waitFor(() => {
      expect(result.current.resolveLabel(ADDR_TREASURY)).toBeUndefined();
    });

    await act(async () => {
      await storage.save({ address: ADDR_TREASURY, alias: 'Treasury' });
    });

    await waitFor(() => {
      expect(result.current.resolveLabel(ADDR_TREASURY)).toBe('Treasury');
    });
  });
});
