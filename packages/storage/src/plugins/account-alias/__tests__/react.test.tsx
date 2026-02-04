/**
 * Tests for React Hook Integration (Phase 5)
 *
 * Tests cover:
 * - T041: Hook creation and basic functionality
 * - T042: Live query updates when aliases change
 * - T043-T047: Hook implementation details
 *
 * @vitest-environment jsdom
 */
import 'fake-indexeddb/auto';

import { act, renderHook, waitFor } from '@testing-library/react';
import type Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createUseAliasStorage } from '../react';
import { cleanupTestDatabase, createTestDatabase } from './setup';

describe('createUseAliasStorage', () => {
  let db: Dexie;

  beforeEach(() => {
    db = createTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase(db);
  });

  // ==========================================================================
  // T041: Basic Hook Creation
  // ==========================================================================
  describe('hook creation and initialization', () => {
    it('should create a hook factory function', () => {
      const useAliasStorage = createUseAliasStorage(db);
      expect(typeof useAliasStorage).toBe('function');
    });

    it('should return loading state initially', () => {
      const useAliasStorage = createUseAliasStorage(db);
      const { result } = renderHook(() => useAliasStorage());

      // Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.records).toBeUndefined();
    });

    it('should return empty records after loading completes', async () => {
      const useAliasStorage = createUseAliasStorage(db);
      const { result } = renderHook(() => useAliasStorage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.records).toEqual([]);
    });

    it('should return all required properties', async () => {
      const useAliasStorage = createUseAliasStorage(db);
      const { result } = renderHook(() => useAliasStorage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Check all required properties exist
      expect(result.current).toHaveProperty('records');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('save');
      expect(result.current).toHaveProperty('update');
      expect(result.current).toHaveProperty('remove');
      expect(result.current).toHaveProperty('clear');
      expect(result.current).toHaveProperty('exportAsFile');
      expect(result.current).toHaveProperty('importFromFile');
      expect(result.current).toHaveProperty('getByAddress');
      expect(result.current).toHaveProperty('getByAddressAndNetwork');
      expect(result.current).toHaveProperty('findByAddress');
      expect(result.current).toHaveProperty('getByAlias');
      expect(result.current).toHaveProperty('resolveAlias');
      expect(result.current).toHaveProperty('resolveAddress');
    });

    it('should accept configuration options', async () => {
      const onDuplicate = vi.fn();
      const useAliasStorage = createUseAliasStorage(db, {
        duplicateMode: 'warn',
        maxAliasLength: 32,
        onDuplicate,
      });
      const { result } = renderHook(() => useAliasStorage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Save first alias
      await act(async () => {
        await result.current.save({ address: '0x111', alias: 'First' });
      });

      // Save duplicate alias - should trigger onDuplicate in warn mode
      await act(async () => {
        await result.current.save({ address: '0x222', alias: 'First' });
      });

      expect(onDuplicate).toHaveBeenCalledWith('First', '0x111');
    });
  });

  // ==========================================================================
  // T042: Live Query Updates
  // ==========================================================================
  describe('live query updates', () => {
    it('should update records automatically when alias is saved', async () => {
      const useAliasStorage = createUseAliasStorage(db);
      const { result } = renderHook(() => useAliasStorage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.records).toHaveLength(0);

      // Save an alias
      await act(async () => {
        await result.current.save({
          address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
          alias: 'Treasury',
        });
      });

      // Records should update automatically
      await waitFor(() => {
        expect(result.current.records).toHaveLength(1);
      });

      expect(result.current.records?.[0]?.alias).toBe('Treasury');
    });

    it('should update records automatically when alias is updated', async () => {
      const useAliasStorage = createUseAliasStorage(db);
      const { result } = renderHook(() => useAliasStorage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Save an alias
      let id: string;
      await act(async () => {
        id = await result.current.save({
          address: '0x123',
          alias: 'Original',
        });
      });

      await waitFor(() => {
        expect(result.current.records).toHaveLength(1);
      });

      // Update the alias
      await act(async () => {
        await result.current.update(id!, { alias: 'Updated' });
      });

      // Records should update automatically
      await waitFor(() => {
        expect(result.current.records?.[0]?.alias).toBe('Updated');
      });
    });

    it('should update records automatically when alias is removed', async () => {
      const useAliasStorage = createUseAliasStorage(db);
      const { result } = renderHook(() => useAliasStorage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Save an alias
      let id: string;
      await act(async () => {
        id = await result.current.save({
          address: '0x123',
          alias: 'ToBeDeleted',
        });
      });

      await waitFor(() => {
        expect(result.current.records).toHaveLength(1);
      });

      // Remove the alias
      await act(async () => {
        await result.current.remove(id!);
      });

      // Records should update automatically
      await waitFor(() => {
        expect(result.current.records).toHaveLength(0);
      });
    });

    it('should update records automatically when aliases are cleared', async () => {
      const useAliasStorage = createUseAliasStorage(db);
      const { result } = renderHook(() => useAliasStorage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Save multiple aliases
      await act(async () => {
        await result.current.save({ address: '0x111', alias: 'First' });
        await result.current.save({ address: '0x222', alias: 'Second' });
        await result.current.save({ address: '0x333', alias: 'Third' });
      });

      await waitFor(() => {
        expect(result.current.records).toHaveLength(3);
      });

      // Clear all aliases
      await act(async () => {
        await result.current.clear();
      });

      // Records should update automatically
      await waitFor(() => {
        expect(result.current.records).toHaveLength(0);
      });
    });

    it('should reflect changes from external storage operations', async () => {
      // Create shared storage instance
      const useAliasStorage = createUseAliasStorage(db);
      const { result } = renderHook(() => useAliasStorage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Use another storage instance to make changes (simulating external updates)
      const { createAliasStorage } = await import('../AliasStorage');
      const externalStorage = createAliasStorage(db);

      // External save
      await act(async () => {
        await externalStorage.save({
          address: '0xExternal',
          alias: 'External Save',
        });
      });

      // Hook should see the change
      await waitFor(() => {
        expect(result.current.records).toHaveLength(1);
        expect(result.current.records?.[0]?.alias).toBe('External Save');
      });
    });
  });

  // ==========================================================================
  // CRUD Operations
  // ==========================================================================
  describe('CRUD operations', () => {
    it('should save an alias and return ID', async () => {
      const useAliasStorage = createUseAliasStorage(db);
      const { result } = renderHook(() => useAliasStorage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let id: string;
      await act(async () => {
        id = await result.current.save({
          address: '0x123',
          alias: 'Test',
        });
      });

      expect(id!).toBeDefined();
      expect(typeof id!).toBe('string');
    });

    it('should update an alias by ID', async () => {
      const useAliasStorage = createUseAliasStorage(db);
      const { result } = renderHook(() => useAliasStorage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let id: string;
      await act(async () => {
        id = await result.current.save({
          address: '0x123',
          alias: 'Original',
          metadata: { category: 'test' },
        });
      });

      await act(async () => {
        await result.current.update(id!, {
          alias: 'Updated',
          metadata: { category: 'updated' },
        });
      });

      await waitFor(() => {
        expect(result.current.records?.[0]?.alias).toBe('Updated');
        expect(result.current.records?.[0]?.metadata).toEqual({ category: 'updated' });
      });
    });

    it('should remove an alias by ID', async () => {
      const useAliasStorage = createUseAliasStorage(db);
      const { result } = renderHook(() => useAliasStorage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let id: string;
      await act(async () => {
        id = await result.current.save({
          address: '0x123',
          alias: 'ToDelete',
        });
      });

      await waitFor(() => {
        expect(result.current.records).toHaveLength(1);
      });

      await act(async () => {
        await result.current.remove(id!);
      });

      await waitFor(() => {
        expect(result.current.records).toHaveLength(0);
      });
    });
  });

  // ==========================================================================
  // T046: Error Handling
  // ==========================================================================
  describe('error handling', () => {
    it('should call onError when save fails', async () => {
      const onError = vi.fn();
      const useAliasStorage = createUseAliasStorage(db, {
        duplicateMode: 'strict',
        onError,
      });
      const { result } = renderHook(() => useAliasStorage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Save first alias
      await act(async () => {
        await result.current.save({ address: '0x111', alias: 'Unique' });
      });

      // Try to save duplicate (should fail in strict mode)
      await act(async () => {
        try {
          await result.current.save({ address: '0x222', alias: 'Unique' });
        } catch {
          // Expected to throw
        }
      });

      expect(onError).toHaveBeenCalledWith('Failed to save', expect.any(Error));
    });

    it('should call onError when update fails', async () => {
      const onError = vi.fn();
      const useAliasStorage = createUseAliasStorage(db, { onError });
      const { result } = renderHook(() => useAliasStorage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Try to update non-existent record
      await act(async () => {
        try {
          await result.current.update('non-existent-id', { alias: 'Updated' });
        } catch {
          // Expected to throw
        }
      });

      expect(onError).toHaveBeenCalledWith('Failed to update', expect.any(Error));
    });

    it('should re-throw errors after calling onError', async () => {
      const onError = vi.fn();
      const useAliasStorage = createUseAliasStorage(db, {
        duplicateMode: 'strict',
        onError,
      });
      const { result } = renderHook(() => useAliasStorage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Save first alias
      await act(async () => {
        await result.current.save({ address: '0x111', alias: 'Unique' });
      });

      // Try to save duplicate - should throw
      let thrownError: Error | undefined;
      await act(async () => {
        try {
          await result.current.save({ address: '0x222', alias: 'Unique' });
        } catch (err) {
          thrownError = err as Error;
        }
      });

      expect(thrownError).toBeDefined();
      expect(onError).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // T047: Lookup Methods
  // ==========================================================================
  describe('lookup methods', () => {
    it('should get alias by address', async () => {
      const useAliasStorage = createUseAliasStorage(db);
      const { result } = renderHook(() => useAliasStorage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.save({
          address: '0x123',
          alias: 'MyAlias',
        });
      });

      let record: Awaited<ReturnType<typeof result.current.getByAddress>> | undefined;
      await act(async () => {
        record = await result.current.getByAddress('0x123');
      });

      expect(record).toBeDefined();
      expect(record?.alias).toBe('MyAlias');
    });

    it('should get alias by address and network', async () => {
      const useAliasStorage = createUseAliasStorage(db);
      const { result } = renderHook(() => useAliasStorage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.save({
          address: '0x123',
          networkId: 'ethereum-mainnet',
          alias: 'ETH Alias',
        });
        await result.current.save({
          address: '0x123',
          networkId: 'polygon-mainnet',
          alias: 'Polygon Alias',
        });
      });

      let ethRecord: Awaited<ReturnType<typeof result.current.getByAddressAndNetwork>> | undefined;
      let polygonRecord:
        | Awaited<ReturnType<typeof result.current.getByAddressAndNetwork>>
        | undefined;
      await act(async () => {
        ethRecord = await result.current.getByAddressAndNetwork('0x123', 'ethereum-mainnet');
        polygonRecord = await result.current.getByAddressAndNetwork('0x123', 'polygon-mainnet');
      });

      expect(ethRecord?.alias).toBe('ETH Alias');
      expect(polygonRecord?.alias).toBe('Polygon Alias');
    });

    it('should find all aliases by address', async () => {
      const useAliasStorage = createUseAliasStorage(db);
      const { result } = renderHook(() => useAliasStorage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.save({
          address: '0x123',
          alias: 'Global',
        });
        await result.current.save({
          address: '0x123',
          networkId: 'ethereum-mainnet',
          alias: 'ETH',
        });
        await result.current.save({
          address: '0x123',
          networkId: 'polygon-mainnet',
          alias: 'Polygon',
        });
      });

      let records: typeof result.current.records;
      await act(async () => {
        records = await result.current.findByAddress('0x123');
      });

      expect(records).toHaveLength(3);
    });

    it('should get alias by alias name', async () => {
      const useAliasStorage = createUseAliasStorage(db);
      const { result } = renderHook(() => useAliasStorage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.save({
          address: '0x123',
          alias: 'Treasury',
        });
      });

      let record: Awaited<ReturnType<typeof result.current.getByAlias>> | undefined;
      await act(async () => {
        record = await result.current.getByAlias('Treasury');
      });

      expect(record).toBeDefined();
      expect(record?.address).toBe('0x123');
    });

    it('should resolve alias to address', async () => {
      const useAliasStorage = createUseAliasStorage(db);
      const { result } = renderHook(() => useAliasStorage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.save({
          address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
          alias: 'Treasury',
        });
      });

      let address;
      await act(async () => {
        address = await result.current.resolveAlias('Treasury');
      });

      expect(address).toBe('0x742d35Cc6634C0532925a3b844Bc454e4438f44e');
    });

    it('should resolve address to alias', async () => {
      const useAliasStorage = createUseAliasStorage(db);
      const { result } = renderHook(() => useAliasStorage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.save({
          address: '0x123',
          alias: 'MyWallet',
        });
      });

      let alias;
      await act(async () => {
        alias = await result.current.resolveAddress('0x123');
      });

      expect(alias).toBe('MyWallet');
    });

    it('should return undefined for non-existent lookups', async () => {
      const useAliasStorage = createUseAliasStorage(db);
      const { result } = renderHook(() => useAliasStorage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let byAddress, byAlias, resolved;
      await act(async () => {
        byAddress = await result.current.getByAddress('0xNonExistent');
        byAlias = await result.current.getByAlias('NonExistent');
        resolved = await result.current.resolveAlias('NonExistent');
      });

      expect(byAddress).toBeUndefined();
      expect(byAlias).toBeUndefined();
      expect(resolved).toBeUndefined();
    });
  });

  // ==========================================================================
  // File I/O Operations
  // ==========================================================================
  describe('file I/O operations', () => {
    // Utility to create a mock file with text() method
    function createMockFile(content: string, name: string): File {
      const file = new File([content], name, { type: 'application/json' });
      // Add text() method that works in jsdom
      Object.defineProperty(file, 'text', {
        value: () => Promise.resolve(content),
      });
      return file;
    }

    it('should export aliases as file', async () => {
      const useAliasStorage = createUseAliasStorage(db);
      const { result } = renderHook(() => useAliasStorage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.save({
          address: '0x123',
          alias: 'Test',
        });
      });

      // Mock URL methods (jsdom doesn't have them by default)
      const originalCreateObjectURL = URL.createObjectURL;
      const originalRevokeObjectURL = URL.revokeObjectURL;
      const mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url');
      const mockRevokeObjectURL = vi.fn();
      URL.createObjectURL = mockCreateObjectURL;
      URL.revokeObjectURL = mockRevokeObjectURL;

      // Track anchor element creation
      const mockClick = vi.fn();
      const originalCreateElement = document.createElement.bind(document);
      const mockCreateElement = vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        const el = originalCreateElement(tag);
        if (tag === 'a') {
          el.click = mockClick;
        }
        return el;
      });

      await act(async () => {
        await result.current.exportAsFile();
      });

      expect(mockClick).toHaveBeenCalled();
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();

      // Cleanup
      mockCreateElement.mockRestore();
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    });

    it('should import aliases from file', async () => {
      const useAliasStorage = createUseAliasStorage(db);
      const { result } = renderHook(() => useAliasStorage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const importData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        aliases: [
          { address: '0x111', alias: 'First' },
          { address: '0x222', alias: 'Second' },
        ],
      };

      const file = createMockFile(JSON.stringify(importData), 'aliases.json');

      let importedIds: string[];
      await act(async () => {
        importedIds = await result.current.importFromFile(file);
      });

      expect(importedIds!).toHaveLength(2);

      await waitFor(() => {
        expect(result.current.records).toHaveLength(2);
      });
    });

    it('should call onError for invalid import file', async () => {
      const onError = vi.fn();
      const useAliasStorage = createUseAliasStorage(db, { onError });
      const { result } = renderHook(() => useAliasStorage());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const file = createMockFile('not valid json', 'bad.json');

      await act(async () => {
        try {
          await result.current.importFromFile(file);
        } catch {
          // Expected to throw
        }
      });

      expect(onError).toHaveBeenCalledWith('Invalid JSON format', expect.any(Error));
    });
  });

  // ==========================================================================
  // Multiple Hook Instances
  // ==========================================================================
  describe('multiple hook instances', () => {
    it('should share data between multiple hook instances', async () => {
      const useAliasStorage = createUseAliasStorage(db);
      const { result: result1 } = renderHook(() => useAliasStorage());
      const { result: result2 } = renderHook(() => useAliasStorage());

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false);
        expect(result2.current.isLoading).toBe(false);
      });

      // Save from first instance
      await act(async () => {
        await result1.current.save({
          address: '0x123',
          alias: 'Shared',
        });
      });

      // Both instances should see the change
      await waitFor(() => {
        expect(result1.current.records).toHaveLength(1);
        expect(result2.current.records).toHaveLength(1);
      });
    });

    it('should allow different configurations for different hook factories', async () => {
      const onError1 = vi.fn();
      const onError2 = vi.fn();

      const useStorage1 = createUseAliasStorage(db, {
        duplicateMode: 'strict',
        onError: onError1,
      });
      const useStorage2 = createUseAliasStorage(db, {
        duplicateMode: 'allow',
        onError: onError2,
      });

      const { result: result1 } = renderHook(() => useStorage1());
      const { result: result2 } = renderHook(() => useStorage2());

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false);
        expect(result2.current.isLoading).toBe(false);
      });

      // Save from first instance
      await act(async () => {
        await result1.current.save({ address: '0x111', alias: 'DuplicateMe' });
      });

      // Duplicate from strict instance should fail
      await act(async () => {
        try {
          await result1.current.save({ address: '0x222', alias: 'DuplicateMe' });
        } catch {
          // Expected
        }
      });

      expect(onError1).toHaveBeenCalled();

      // Duplicate from allow instance should succeed
      await act(async () => {
        await result2.current.save({ address: '0x333', alias: 'DuplicateMe' });
      });

      // Only onError1 should have been called
      expect(onError2).not.toHaveBeenCalled();
    });
  });
});
