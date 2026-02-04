/**
 * Tests for AliasStorage class
 */
import type Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AliasStorage, createAliasStorage } from '../AliasStorage';
import { AliasStorageError } from '../errors';
import type { AliasInput } from '../types';
import { cleanupTestDatabase, createTestDatabase } from './setup';

describe('AliasStorage', () => {
  let db: Dexie;

  beforeEach(() => {
    db = createTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase(db);
  });

  // ==========================================================================
  // T012: Save Operations
  // ==========================================================================
  describe('save operations', () => {
    it('should save a new alias and return an ID', async () => {
      const storage = createAliasStorage(db);
      const input: AliasInput = {
        address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        alias: 'Treasury',
      };

      const id = await storage.save(input);

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should save an alias with networkId', async () => {
      const storage = createAliasStorage(db);
      const input: AliasInput = {
        address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        networkId: 'ethereum-mainnet',
        alias: 'Treasury Mainnet',
      };

      const id = await storage.save(input);
      const record = await storage.get(id);

      expect(record).toBeDefined();
      expect(record?.networkId).toBe('ethereum-mainnet');
      expect(record?.alias).toBe('Treasury Mainnet');
    });

    it('should save an alias with metadata', async () => {
      const storage = createAliasStorage(db);
      const input: AliasInput = {
        address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        alias: 'Dev Wallet',
        metadata: { category: 'development', isSmartAccount: true },
      };

      const id = await storage.save(input);
      const record = await storage.get(id);

      expect(record?.metadata).toEqual({ category: 'development', isSmartAccount: true });
    });

    it('should set createdAt and updatedAt timestamps', async () => {
      const storage = createAliasStorage(db);
      const beforeSave = new Date();

      const id = await storage.save({
        address: '0x123',
        alias: 'Test',
      });

      const record = await storage.get(id);
      const afterSave = new Date();

      expect(record?.createdAt).toBeInstanceOf(Date);
      expect(record?.updatedAt).toBeInstanceOf(Date);
      expect(record?.createdAt.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime());
      expect(record?.createdAt.getTime()).toBeLessThanOrEqual(afterSave.getTime());
    });

    it('should update existing alias for same address (upsert behavior)', async () => {
      const storage = createAliasStorage(db);
      const address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

      // Save first alias
      const id1 = await storage.save({ address, alias: 'Treasury' });

      // Save again with same address - should update
      const id2 = await storage.save({ address, alias: 'Updated Treasury' });

      // Should return same ID (upsert)
      expect(id2).toBe(id1);

      const record = await storage.get(id1);
      expect(record?.alias).toBe('Updated Treasury');
    });

    it('should allow same address with different networkIds', async () => {
      const storage = createAliasStorage(db);
      const address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

      const id1 = await storage.save({ address, alias: 'Treasury Global' });
      const id2 = await storage.save({
        address,
        networkId: 'ethereum-mainnet',
        alias: 'Treasury ETH',
      });
      const id3 = await storage.save({
        address,
        networkId: 'polygon-mainnet',
        alias: 'Treasury MATIC',
      });

      // Should have different IDs (different compound keys)
      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);

      const all = await storage.findByAddress(address);
      expect(all).toHaveLength(3);
    });

    it('should normalize empty string networkId to undefined', async () => {
      const storage = createAliasStorage(db);

      const id = await storage.save({
        address: '0x123',
        networkId: '', // Empty string should be normalized
        alias: 'Test',
      });

      const record = await storage.get(id);
      expect(record?.networkId).toBeUndefined();
    });

    it('should throw INVALID_ADDRESS for empty address', async () => {
      const storage = createAliasStorage(db);

      await expect(storage.save({ address: '', alias: 'Test' })).rejects.toThrow(AliasStorageError);

      try {
        await storage.save({ address: '', alias: 'Test' });
      } catch (err) {
        expect(err).toBeInstanceOf(AliasStorageError);
        expect((err as AliasStorageError).code).toBe('INVALID_ADDRESS');
      }
    });

    it('should throw INVALID_ALIAS for empty alias', async () => {
      const storage = createAliasStorage(db);

      await expect(storage.save({ address: '0x123', alias: '' })).rejects.toThrow(
        AliasStorageError
      );

      try {
        await storage.save({ address: '0x123', alias: '' });
      } catch (err) {
        expect(err).toBeInstanceOf(AliasStorageError);
        expect((err as AliasStorageError).code).toBe('INVALID_ALIAS');
      }
    });
  });

  // ==========================================================================
  // T013: Configuration Options
  // ==========================================================================
  describe('configuration options', () => {
    describe('duplicateMode', () => {
      it('should reject duplicate alias names in strict mode (default)', async () => {
        const storage = createAliasStorage(db, { duplicateMode: 'strict' });

        await storage.save({ address: '0x111', alias: 'Treasury' });

        await expect(storage.save({ address: '0x222', alias: 'Treasury' })).rejects.toThrow(
          AliasStorageError
        );

        try {
          await storage.save({ address: '0x222', alias: 'Treasury' });
        } catch (err) {
          expect(err).toBeInstanceOf(AliasStorageError);
          expect((err as AliasStorageError).code).toBe('DUPLICATE_ALIAS');
          expect((err as AliasStorageError).details?.existingAddress).toBe('0x111');
        }
      });

      it('should allow duplicate alias names in allow mode', async () => {
        const storage = createAliasStorage(db, { duplicateMode: 'allow' });

        await storage.save({ address: '0x111', alias: 'Treasury' });
        const id2 = await storage.save({ address: '0x222', alias: 'Treasury' });

        expect(id2).toBeDefined();

        const matches = await storage.findByAlias('Treasury');
        expect(matches).toHaveLength(2);
      });

      it('should allow duplicates and call onDuplicate in warn mode', async () => {
        const onDuplicate = vi.fn();
        const storage = createAliasStorage(db, {
          duplicateMode: 'warn',
          onDuplicate,
        });

        await storage.save({ address: '0x111', alias: 'Treasury' });
        await storage.save({ address: '0x222', alias: 'Treasury' });

        expect(onDuplicate).toHaveBeenCalledWith('Treasury', '0x111');
      });

      it('should behave like allow mode when onDuplicate not provided in warn mode', async () => {
        const storage = createAliasStorage(db, { duplicateMode: 'warn' });

        await storage.save({ address: '0x111', alias: 'Treasury' });
        const id2 = await storage.save({ address: '0x222', alias: 'Treasury' });

        expect(id2).toBeDefined();
      });

      it('should not check duplicates when updating same record with same alias', async () => {
        const storage = createAliasStorage(db, { duplicateMode: 'strict' });

        const id = await storage.save({ address: '0x111', alias: 'Treasury' });

        // Updating same address should not trigger duplicate check
        await expect(
          storage.save({ address: '0x111', alias: 'Treasury', metadata: { updated: true } })
        ).resolves.toBe(id);
      });
    });

    describe('maxAliasLength', () => {
      it('should enforce default max alias length (64)', async () => {
        const storage = createAliasStorage(db);
        const longAlias = 'a'.repeat(65);

        await expect(storage.save({ address: '0x123', alias: longAlias })).rejects.toThrow(
          AliasStorageError
        );

        try {
          await storage.save({ address: '0x123', alias: longAlias });
        } catch (err) {
          expect(err).toBeInstanceOf(AliasStorageError);
          expect((err as AliasStorageError).code).toBe('ALIAS_TOO_LONG');
        }
      });

      it('should enforce custom max alias length', async () => {
        const storage = createAliasStorage(db, { maxAliasLength: 10 });

        await expect(storage.save({ address: '0x123', alias: 'a'.repeat(11) })).rejects.toThrow(
          AliasStorageError
        );

        // Should allow exactly 10 chars
        const id = await storage.save({ address: '0x123', alias: 'a'.repeat(10) });
        expect(id).toBeDefined();
      });

      it('should disable length checking when maxAliasLength is undefined', async () => {
        const storage = createAliasStorage(db, { maxAliasLength: undefined });
        const veryLongAlias = 'a'.repeat(1000);

        const id = await storage.save({ address: '0x123', alias: veryLongAlias });
        expect(id).toBeDefined();

        const record = await storage.get(id);
        expect(record?.alias).toBe(veryLongAlias);
      });
    });

    describe('tableName', () => {
      it('should use default table name', async () => {
        const storage = createAliasStorage(db);
        await storage.save({ address: '0x123', alias: 'Test' });

        // Verify data is in aliases table
        const count = await db.table('aliases').count();
        expect(count).toBe(1);
      });
    });
  });

  // ==========================================================================
  // T014: getByAlias and findByAlias
  // ==========================================================================
  describe('alias lookup operations', () => {
    describe('getByAlias', () => {
      it('should return record by alias name', async () => {
        const storage = createAliasStorage(db);
        await storage.save({ address: '0x123', alias: 'Treasury' });

        const record = await storage.getByAlias('Treasury');

        expect(record).toBeDefined();
        expect(record?.address).toBe('0x123');
        expect(record?.alias).toBe('Treasury');
      });

      it('should return undefined for non-existent alias', async () => {
        const storage = createAliasStorage(db);

        const record = await storage.getByAlias('NonExistent');

        expect(record).toBeUndefined();
      });

      it('should return first match when duplicates exist', async () => {
        const storage = createAliasStorage(db, { duplicateMode: 'allow' });
        await storage.save({ address: '0x111', alias: 'Treasury' });
        await storage.save({ address: '0x222', alias: 'Treasury' });

        const record = await storage.getByAlias('Treasury');

        expect(record).toBeDefined();
        // Should return first match (by createdAt order)
        expect(['0x111', '0x222']).toContain(record?.address);
      });
    });

    describe('findByAlias', () => {
      it('should return all records with matching alias', async () => {
        const storage = createAliasStorage(db, { duplicateMode: 'allow' });
        await storage.save({ address: '0x111', alias: 'Treasury' });
        await storage.save({ address: '0x222', alias: 'Treasury' });
        await storage.save({ address: '0x333', alias: 'Other' });

        const records = await storage.findByAlias('Treasury');

        expect(records).toHaveLength(2);
        expect(records.map((r) => r.address).sort()).toEqual(['0x111', '0x222']);
      });

      it('should return empty array when no matches', async () => {
        const storage = createAliasStorage(db);

        const records = await storage.findByAlias('NonExistent');

        expect(records).toEqual([]);
      });
    });
  });

  // ==========================================================================
  // T015: getByAddress, getByAddressAndNetwork, findByAddress
  // ==========================================================================
  describe('address lookup operations', () => {
    describe('getByAddress', () => {
      it('should return global alias (no networkId) for address', async () => {
        const storage = createAliasStorage(db);
        await storage.save({ address: '0x123', alias: 'Treasury' });

        const record = await storage.getByAddress('0x123');

        expect(record).toBeDefined();
        expect(record?.alias).toBe('Treasury');
        expect(record?.networkId).toBeUndefined();
      });

      it('should return undefined when only network-specific aliases exist', async () => {
        const storage = createAliasStorage(db);
        await storage.save({
          address: '0x123',
          networkId: 'ethereum-mainnet',
          alias: 'Treasury ETH',
        });

        const record = await storage.getByAddress('0x123');

        expect(record).toBeUndefined();
      });

      it('should return undefined for non-existent address', async () => {
        const storage = createAliasStorage(db);

        const record = await storage.getByAddress('0xNonExistent');

        expect(record).toBeUndefined();
      });
    });

    describe('getByAddressAndNetwork', () => {
      it('should return alias for specific address and networkId', async () => {
        const storage = createAliasStorage(db);
        await storage.save({
          address: '0x123',
          networkId: 'ethereum-mainnet',
          alias: 'Treasury ETH',
        });

        const record = await storage.getByAddressAndNetwork('0x123', 'ethereum-mainnet');

        expect(record).toBeDefined();
        expect(record?.alias).toBe('Treasury ETH');
      });

      it('should return global alias when networkId is undefined', async () => {
        const storage = createAliasStorage(db);
        await storage.save({ address: '0x123', alias: 'Treasury' });

        const record = await storage.getByAddressAndNetwork('0x123', undefined);

        expect(record).toBeDefined();
        expect(record?.alias).toBe('Treasury');
      });

      it('should return undefined when no match for address+network combo', async () => {
        const storage = createAliasStorage(db);
        await storage.save({
          address: '0x123',
          networkId: 'ethereum-mainnet',
          alias: 'Treasury',
        });

        const record = await storage.getByAddressAndNetwork('0x123', 'polygon-mainnet');

        expect(record).toBeUndefined();
      });
    });

    describe('findByAddress', () => {
      it('should return all aliases for an address across all networks', async () => {
        const storage = createAliasStorage(db);
        await storage.save({ address: '0x123', alias: 'Treasury Global' });
        await storage.save({
          address: '0x123',
          networkId: 'ethereum-mainnet',
          alias: 'Treasury ETH',
        });
        await storage.save({
          address: '0x123',
          networkId: 'polygon-mainnet',
          alias: 'Treasury MATIC',
        });
        await storage.save({ address: '0x999', alias: 'Other' });

        const records = await storage.findByAddress('0x123');

        expect(records).toHaveLength(3);
        const aliases = records.map((r) => r.alias);
        expect(aliases).toContain('Treasury Global');
        expect(aliases).toContain('Treasury ETH');
        expect(aliases).toContain('Treasury MATIC');
      });

      it('should return empty array for non-existent address', async () => {
        const storage = createAliasStorage(db);

        const records = await storage.findByAddress('0xNonExistent');

        expect(records).toEqual([]);
      });
    });
  });

  // ==========================================================================
  // T015a: Multi-network Scenarios
  // ==========================================================================
  describe('multi-network scenarios', () => {
    it('should support same address with different aliases per network', async () => {
      const storage = createAliasStorage(db);
      const address = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

      await storage.save({ address, alias: 'Treasury' }); // Global
      await storage.save({ address, networkId: 'ethereum-mainnet', alias: 'ETH Treasury' });
      await storage.save({ address, networkId: 'polygon-mainnet', alias: 'MATIC Treasury' });
      await storage.save({ address, networkId: 'stellar-mainnet', alias: 'XLM Treasury' });

      // Verify each network has correct alias
      expect((await storage.getByAddressAndNetwork(address, undefined))?.alias).toBe('Treasury');
      expect((await storage.getByAddressAndNetwork(address, 'ethereum-mainnet'))?.alias).toBe(
        'ETH Treasury'
      );
      expect((await storage.getByAddressAndNetwork(address, 'polygon-mainnet'))?.alias).toBe(
        'MATIC Treasury'
      );
      expect((await storage.getByAddressAndNetwork(address, 'stellar-mainnet'))?.alias).toBe(
        'XLM Treasury'
      );

      // Verify total count
      const allForAddress = await storage.findByAddress(address);
      expect(allForAddress).toHaveLength(4);
    });

    it('should update network-specific alias independently', async () => {
      const storage = createAliasStorage(db);
      const address = '0x123';

      await storage.save({ address, alias: 'Global' });
      await storage.save({ address, networkId: 'ethereum-mainnet', alias: 'ETH' });

      // Update only ethereum alias
      await storage.save({ address, networkId: 'ethereum-mainnet', alias: 'Updated ETH' });

      // Global should be unchanged
      expect((await storage.getByAddress(address))?.alias).toBe('Global');
      expect((await storage.getByAddressAndNetwork(address, 'ethereum-mainnet'))?.alias).toBe(
        'Updated ETH'
      );
    });

    it('should resolve address to alias for specific network', async () => {
      const storage = createAliasStorage(db);
      const address = '0x123';

      await storage.save({ address, alias: 'Global Treasury' });
      await storage.save({ address, networkId: 'ethereum-mainnet', alias: 'ETH Treasury' });

      expect(await storage.resolveAddress(address)).toBe('Global Treasury');
      expect(await storage.resolveAddress(address, 'ethereum-mainnet')).toBe('ETH Treasury');
      expect(await storage.resolveAddress(address, 'polygon-mainnet')).toBeUndefined();
    });
  });

  // ==========================================================================
  // Update Operations
  // ==========================================================================
  describe('update operations', () => {
    it('should update alias name', async () => {
      const storage = createAliasStorage(db);
      const id = await storage.save({ address: '0x123', alias: 'Treasury' });

      await storage.update(id, { alias: 'Updated Treasury' });

      const record = await storage.get(id);
      expect(record?.alias).toBe('Updated Treasury');
    });

    it('should update metadata', async () => {
      const storage = createAliasStorage(db);
      const id = await storage.save({
        address: '0x123',
        alias: 'Treasury',
        metadata: { category: 'main' },
      });

      await storage.update(id, { metadata: { category: 'updated', verified: true } });

      const record = await storage.get(id);
      expect(record?.metadata).toEqual({ category: 'updated', verified: true });
    });

    it('should update updatedAt timestamp', async () => {
      const storage = createAliasStorage(db);
      const id = await storage.save({ address: '0x123', alias: 'Treasury' });

      const beforeUpdate = await storage.get(id);
      const originalUpdatedAt = beforeUpdate?.updatedAt;

      // Wait a bit to ensure different timestamp
      await new Promise((r) => setTimeout(r, 10));

      await storage.update(id, { alias: 'Updated' });

      const afterUpdate = await storage.get(id);
      expect(afterUpdate?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt!.getTime());
      expect(afterUpdate?.createdAt.getTime()).toBe(beforeUpdate?.createdAt.getTime());
    });

    it('should throw ALIAS_NOT_FOUND for non-existent ID', async () => {
      const storage = createAliasStorage(db);

      await expect(storage.update('non-existent-id', { alias: 'New' })).rejects.toThrow(
        AliasStorageError
      );

      try {
        await storage.update('non-existent-id', { alias: 'New' });
      } catch (err) {
        expect(err).toBeInstanceOf(AliasStorageError);
        expect((err as AliasStorageError).code).toBe('ALIAS_NOT_FOUND');
      }
    });

    it('should validate alias length on update', async () => {
      const storage = createAliasStorage(db, { maxAliasLength: 10 });
      const id = await storage.save({ address: '0x123', alias: 'Short' });

      await expect(storage.update(id, { alias: 'a'.repeat(11) })).rejects.toThrow(
        AliasStorageError
      );
    });

    it('should validate empty alias on update', async () => {
      const storage = createAliasStorage(db);
      const id = await storage.save({ address: '0x123', alias: 'Treasury' });

      await expect(storage.update(id, { alias: '' })).rejects.toThrow(AliasStorageError);
    });
  });

  // ==========================================================================
  // Get Operations
  // ==========================================================================
  describe('get operations', () => {
    it('should get record by ID', async () => {
      const storage = createAliasStorage(db);
      const id = await storage.save({ address: '0x123', alias: 'Treasury' });

      const record = await storage.get(id);

      expect(record).toBeDefined();
      expect(record?.id).toBe(id);
      expect(record?.address).toBe('0x123');
      expect(record?.alias).toBe('Treasury');
    });

    it('should return undefined for non-existent ID', async () => {
      const storage = createAliasStorage(db);

      const record = await storage.get('non-existent');

      expect(record).toBeUndefined();
    });
  });

  // ==========================================================================
  // Convenience Methods
  // ==========================================================================
  describe('convenience methods', () => {
    describe('resolveAlias', () => {
      it('should resolve alias to address', async () => {
        const storage = createAliasStorage(db);
        await storage.save({ address: '0x123', alias: 'Treasury' });

        const address = await storage.resolveAlias('Treasury');

        expect(address).toBe('0x123');
      });

      it('should return undefined for non-existent alias', async () => {
        const storage = createAliasStorage(db);

        const address = await storage.resolveAlias('NonExistent');

        expect(address).toBeUndefined();
      });
    });

    describe('resolveAddress', () => {
      it('should resolve address to alias name', async () => {
        const storage = createAliasStorage(db);
        await storage.save({ address: '0x123', alias: 'Treasury' });

        const alias = await storage.resolveAddress('0x123');

        expect(alias).toBe('Treasury');
      });

      it('should resolve address with networkId to alias', async () => {
        const storage = createAliasStorage(db);
        await storage.save({
          address: '0x123',
          networkId: 'ethereum-mainnet',
          alias: 'ETH Treasury',
        });

        const alias = await storage.resolveAddress('0x123', 'ethereum-mainnet');

        expect(alias).toBe('ETH Treasury');
      });

      it('should return undefined for non-existent address', async () => {
        const storage = createAliasStorage(db);

        const alias = await storage.resolveAddress('0xNonExistent');

        expect(alias).toBeUndefined();
      });
    });
  });

  // ==========================================================================
  // Factory Function
  // ==========================================================================
  describe('createAliasStorage factory', () => {
    it('should create AliasStorage instance with default options', () => {
      const storage = createAliasStorage(db);

      expect(storage).toBeInstanceOf(AliasStorage);
    });

    it('should create AliasStorage instance with custom options', async () => {
      const storage = createAliasStorage(db, {
        duplicateMode: 'allow',
        maxAliasLength: 32,
      });

      // Verify custom options are applied
      await storage.save({ address: '0x111', alias: 'Treasury' });
      await storage.save({ address: '0x222', alias: 'Treasury' }); // Should not throw

      const matches = await storage.findByAlias('Treasury');
      expect(matches).toHaveLength(2);
    });

    it('should merge provided options with defaults', async () => {
      const storage = createAliasStorage(db, { duplicateMode: 'allow' });

      // maxAliasLength should still be default (64)
      await expect(storage.save({ address: '0x123', alias: 'a'.repeat(65) })).rejects.toThrow(
        AliasStorageError
      );
    });
  });
});
