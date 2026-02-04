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
  // T031: Delete Operations
  // ==========================================================================
  describe('delete operations', () => {
    describe('delete', () => {
      it('should delete an alias by ID', async () => {
        const storage = createAliasStorage(db);
        const id = await storage.save({ address: '0x123', alias: 'Treasury' });

        await storage.delete(id);

        const record = await storage.get(id);
        expect(record).toBeUndefined();
      });

      it('should not throw when deleting non-existent ID', async () => {
        const storage = createAliasStorage(db);

        // Should not throw
        await expect(storage.delete('non-existent-id')).resolves.not.toThrow();
      });

      it('should only delete specified record', async () => {
        const storage = createAliasStorage(db);
        const id1 = await storage.save({ address: '0x111', alias: 'Treasury1' });
        const id2 = await storage.save({ address: '0x222', alias: 'Treasury2' });

        await storage.delete(id1);

        expect(await storage.get(id1)).toBeUndefined();
        expect(await storage.get(id2)).toBeDefined();
      });
    });

    describe('deleteByAddress', () => {
      it('should delete global alias for address', async () => {
        const storage = createAliasStorage(db);
        await storage.save({ address: '0x123', alias: 'Treasury' });

        await storage.deleteByAddress('0x123');

        const record = await storage.getByAddress('0x123');
        expect(record).toBeUndefined();
      });

      it('should not throw when address has no alias', async () => {
        const storage = createAliasStorage(db);

        await expect(storage.deleteByAddress('0xNonExistent')).resolves.not.toThrow();
      });

      it('should only delete global alias, not network-specific', async () => {
        const storage = createAliasStorage(db);
        await storage.save({ address: '0x123', alias: 'Global' });
        await storage.save({
          address: '0x123',
          networkId: 'ethereum-mainnet',
          alias: 'ETH',
        });

        await storage.deleteByAddress('0x123');

        expect(await storage.getByAddress('0x123')).toBeUndefined();
        expect(await storage.getByAddressAndNetwork('0x123', 'ethereum-mainnet')).toBeDefined();
      });
    });

    describe('deleteByAlias', () => {
      it('should delete alias by name', async () => {
        const storage = createAliasStorage(db);
        await storage.save({ address: '0x123', alias: 'Treasury' });

        await storage.deleteByAlias('Treasury');

        const record = await storage.getByAlias('Treasury');
        expect(record).toBeUndefined();
      });

      it('should not throw when alias does not exist', async () => {
        const storage = createAliasStorage(db);

        await expect(storage.deleteByAlias('NonExistent')).resolves.not.toThrow();
      });

      it('should delete all records with duplicate alias name', async () => {
        const storage = createAliasStorage(db, { duplicateMode: 'allow' });
        await storage.save({ address: '0x111', alias: 'Treasury' });
        await storage.save({ address: '0x222', alias: 'Treasury' });
        await storage.save({ address: '0x333', alias: 'Other' });

        await storage.deleteByAlias('Treasury');

        const treasuryRecords = await storage.findByAlias('Treasury');
        expect(treasuryRecords).toHaveLength(0);

        // Other should remain
        const otherRecords = await storage.findByAlias('Other');
        expect(otherRecords).toHaveLength(1);
      });
    });

    describe('clear', () => {
      it('should delete all aliases', async () => {
        const storage = createAliasStorage(db);
        await storage.save({ address: '0x111', alias: 'Treasury1' });
        await storage.save({ address: '0x222', alias: 'Treasury2' });
        await storage.save({ address: '0x333', alias: 'Treasury3' });

        await storage.clear();

        const count = await storage.count();
        expect(count).toBe(0);
      });

      it('should not throw when storage is already empty', async () => {
        const storage = createAliasStorage(db);

        await expect(storage.clear()).resolves.not.toThrow();
      });
    });
  });

  // ==========================================================================
  // T032: List and Count Operations
  // ==========================================================================
  describe('list and count operations', () => {
    describe('getAll', () => {
      it('should return all alias records', async () => {
        const storage = createAliasStorage(db);
        await storage.save({ address: '0x111', alias: 'Treasury1' });
        await storage.save({ address: '0x222', alias: 'Treasury2' });
        await storage.save({ address: '0x333', alias: 'Treasury3' });

        const all = await storage.getAll();

        expect(all).toHaveLength(3);
        const aliases = all.map((r) => r.alias);
        expect(aliases).toContain('Treasury1');
        expect(aliases).toContain('Treasury2');
        expect(aliases).toContain('Treasury3');
      });

      it('should return empty array when no aliases exist', async () => {
        const storage = createAliasStorage(db);

        const all = await storage.getAll();

        expect(all).toEqual([]);
      });

      it('should return records ordered by updatedAt descending', async () => {
        const storage = createAliasStorage(db);
        const id1 = await storage.save({ address: '0x111', alias: 'First' });
        await storage.save({ address: '0x222', alias: 'Second' });
        await storage.save({ address: '0x333', alias: 'Third' });

        // Wait and update first record to make it most recent
        await new Promise((r) => setTimeout(r, 10));
        await storage.update(id1, { metadata: { updated: true } });

        const all = await storage.getAll();

        // First record should be first (most recently updated)
        expect(all[0].alias).toBe('First');
      });

      it('should include records with networkId', async () => {
        const storage = createAliasStorage(db);
        await storage.save({ address: '0x111', alias: 'Global' });
        await storage.save({
          address: '0x111',
          networkId: 'ethereum-mainnet',
          alias: 'ETH',
        });

        const all = await storage.getAll();

        expect(all).toHaveLength(2);
        expect(all.find((r) => r.networkId === 'ethereum-mainnet')).toBeDefined();
        expect(all.find((r) => r.networkId === undefined)).toBeDefined();
      });
    });

    describe('count', () => {
      it('should return the number of stored aliases', async () => {
        const storage = createAliasStorage(db);
        await storage.save({ address: '0x111', alias: 'Treasury1' });
        await storage.save({ address: '0x222', alias: 'Treasury2' });
        await storage.save({ address: '0x333', alias: 'Treasury3' });

        const count = await storage.count();

        expect(count).toBe(3);
      });

      it('should return 0 when no aliases exist', async () => {
        const storage = createAliasStorage(db);

        const count = await storage.count();

        expect(count).toBe(0);
      });

      it('should count network-specific aliases separately', async () => {
        const storage = createAliasStorage(db);
        await storage.save({ address: '0x111', alias: 'Global' });
        await storage.save({
          address: '0x111',
          networkId: 'ethereum-mainnet',
          alias: 'ETH',
        });
        await storage.save({
          address: '0x111',
          networkId: 'polygon-mainnet',
          alias: 'MATIC',
        });

        const count = await storage.count();

        expect(count).toBe(3);
      });
    });

    describe('hasAlias', () => {
      it('should return true when address has global alias', async () => {
        const storage = createAliasStorage(db);
        await storage.save({ address: '0x123', alias: 'Treasury' });

        const has = await storage.hasAlias('0x123');

        expect(has).toBe(true);
      });

      it('should return false when address has no alias', async () => {
        const storage = createAliasStorage(db);

        const has = await storage.hasAlias('0x123');

        expect(has).toBe(false);
      });

      it('should return true when address has network-specific alias', async () => {
        const storage = createAliasStorage(db);
        await storage.save({
          address: '0x123',
          networkId: 'ethereum-mainnet',
          alias: 'ETH Treasury',
        });

        const has = await storage.hasAlias('0x123', 'ethereum-mainnet');

        expect(has).toBe(true);
      });

      it('should return false when address has alias on different network', async () => {
        const storage = createAliasStorage(db);
        await storage.save({
          address: '0x123',
          networkId: 'ethereum-mainnet',
          alias: 'ETH Treasury',
        });

        const has = await storage.hasAlias('0x123', 'polygon-mainnet');

        expect(has).toBe(false);
      });

      it('should distinguish between global and network-specific aliases', async () => {
        const storage = createAliasStorage(db);
        await storage.save({ address: '0x123', alias: 'Global' });

        expect(await storage.hasAlias('0x123')).toBe(true);
        expect(await storage.hasAlias('0x123', undefined)).toBe(true);
        expect(await storage.hasAlias('0x123', 'ethereum-mainnet')).toBe(false);
      });
    });

    describe('aliasExists', () => {
      it('should return true when alias name is in use', async () => {
        const storage = createAliasStorage(db);
        await storage.save({ address: '0x123', alias: 'Treasury' });

        const exists = await storage.aliasExists('Treasury');

        expect(exists).toBe(true);
      });

      it('should return false when alias name is not in use', async () => {
        const storage = createAliasStorage(db);

        const exists = await storage.aliasExists('Treasury');

        expect(exists).toBe(false);
      });

      it('should return true when duplicate aliases exist', async () => {
        const storage = createAliasStorage(db, { duplicateMode: 'allow' });
        await storage.save({ address: '0x111', alias: 'Treasury' });
        await storage.save({ address: '0x222', alias: 'Treasury' });

        const exists = await storage.aliasExists('Treasury');

        expect(exists).toBe(true);
      });

      it('should be case-sensitive', async () => {
        const storage = createAliasStorage(db);
        await storage.save({ address: '0x123', alias: 'Treasury' });

        expect(await storage.aliasExists('Treasury')).toBe(true);
        expect(await storage.aliasExists('treasury')).toBe(false);
        expect(await storage.aliasExists('TREASURY')).toBe(false);
      });
    });
  });

  // ==========================================================================
  // T048: exportJson Operations
  // ==========================================================================
  describe('exportJson operations', () => {
    it('should export all aliases to JSON format', async () => {
      const storage = createAliasStorage(db);
      await storage.save({ address: '0x111', alias: 'Treasury' });
      await storage.save({ address: '0x222', alias: 'Vault' });
      await storage.save({ address: '0x333', networkId: 'ethereum-mainnet', alias: 'ETH Wallet' });

      const json = await storage.exportJson();
      const data = JSON.parse(json);

      expect(data.version).toBe(1);
      expect(data.exportedAt).toBeDefined();
      expect(data.aliases).toHaveLength(3);

      const aliases = data.aliases.map((a: { alias: string }) => a.alias);
      expect(aliases).toContain('Treasury');
      expect(aliases).toContain('Vault');
      expect(aliases).toContain('ETH Wallet');
    });

    it('should export specific aliases by IDs', async () => {
      const storage = createAliasStorage(db);
      const id1 = await storage.save({ address: '0x111', alias: 'Treasury' });
      await storage.save({ address: '0x222', alias: 'Vault' });
      const id3 = await storage.save({ address: '0x333', alias: 'Wallet' });

      const json = await storage.exportJson([id1, id3]);
      const data = JSON.parse(json);

      expect(data.aliases).toHaveLength(2);
      const aliases = data.aliases.map((a: { alias: string }) => a.alias);
      expect(aliases).toContain('Treasury');
      expect(aliases).toContain('Wallet');
      expect(aliases).not.toContain('Vault');
    });

    it('should export empty array when no aliases exist', async () => {
      const storage = createAliasStorage(db);

      const json = await storage.exportJson();
      const data = JSON.parse(json);

      expect(data.version).toBe(1);
      expect(data.aliases).toEqual([]);
    });

    it('should include networkId and metadata in export', async () => {
      const storage = createAliasStorage(db);
      await storage.save({
        address: '0x123',
        networkId: 'polygon-mainnet',
        alias: 'MATIC Wallet',
        metadata: { category: 'treasury', verified: true },
      });

      const json = await storage.exportJson();
      const data = JSON.parse(json);

      expect(data.aliases[0]).toEqual({
        address: '0x123',
        networkId: 'polygon-mainnet',
        alias: 'MATIC Wallet',
        metadata: { category: 'treasury', verified: true },
      });
    });

    it('should not include internal fields (id, createdAt, updatedAt) in export', async () => {
      const storage = createAliasStorage(db);
      await storage.save({ address: '0x123', alias: 'Treasury' });

      const json = await storage.exportJson();
      const data = JSON.parse(json);

      expect(data.aliases[0].id).toBeUndefined();
      expect(data.aliases[0].createdAt).toBeUndefined();
      expect(data.aliases[0].updatedAt).toBeUndefined();
    });

    it('should skip non-existent IDs silently', async () => {
      const storage = createAliasStorage(db);
      const id = await storage.save({ address: '0x123', alias: 'Treasury' });

      const json = await storage.exportJson([id, 'non-existent-id']);
      const data = JSON.parse(json);

      expect(data.aliases).toHaveLength(1);
      expect(data.aliases[0].alias).toBe('Treasury');
    });

    it('should produce valid JSON that can be parsed', async () => {
      const storage = createAliasStorage(db);
      await storage.save({ address: '0x123', alias: 'Treasury' });

      const json = await storage.exportJson();

      expect(() => JSON.parse(json)).not.toThrow();
    });
  });

  // ==========================================================================
  // T049: importJson Operations
  // ==========================================================================
  describe('importJson operations', () => {
    it('should import aliases from valid JSON', async () => {
      const storage = createAliasStorage(db);
      const importData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        aliases: [
          { address: '0x111', alias: 'Treasury' },
          { address: '0x222', alias: 'Vault' },
        ],
      };

      const result = await storage.importJson(JSON.stringify(importData));

      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.ids).toHaveLength(2);

      const all = await storage.getAll();
      expect(all).toHaveLength(2);
    });

    it('should import aliases with networkId and metadata', async () => {
      const storage = createAliasStorage(db);
      const importData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        aliases: [
          {
            address: '0x123',
            networkId: 'ethereum-mainnet',
            alias: 'ETH Wallet',
            metadata: { verified: true },
          },
        ],
      };

      await storage.importJson(JSON.stringify(importData));

      const record = await storage.getByAddressAndNetwork('0x123', 'ethereum-mainnet');
      expect(record?.alias).toBe('ETH Wallet');
      expect(record?.metadata).toEqual({ verified: true });
    });

    it('should skip duplicates in strict mode and count as skipped', async () => {
      const storage = createAliasStorage(db, { duplicateMode: 'strict' });
      await storage.save({ address: '0x111', alias: 'Treasury' });

      const importData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        aliases: [
          { address: '0x222', alias: 'Treasury' }, // Duplicate alias name
          { address: '0x333', alias: 'Vault' }, // New alias
        ],
      };

      const result = await storage.importJson(JSON.stringify(importData));

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.ids).toHaveLength(1);
    });

    it('should allow duplicates in allow mode', async () => {
      const storage = createAliasStorage(db, { duplicateMode: 'allow' });
      await storage.save({ address: '0x111', alias: 'Treasury' });

      const importData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        aliases: [
          { address: '0x222', alias: 'Treasury' }, // Duplicate but allowed
          { address: '0x333', alias: 'Vault' },
        ],
      };

      const result = await storage.importJson(JSON.stringify(importData));

      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(0);

      const matches = await storage.findByAlias('Treasury');
      expect(matches).toHaveLength(2);
    });

    it('should regenerate timestamps on import', async () => {
      const storage = createAliasStorage(db);
      const importData = {
        version: 1,
        exportedAt: '2020-01-01T00:00:00.000Z', // Old date
        aliases: [{ address: '0x123', alias: 'Treasury' }],
      };

      const beforeImport = new Date();
      await storage.importJson(JSON.stringify(importData));
      const afterImport = new Date();

      const record = await storage.getByAddress('0x123');
      expect(record?.createdAt.getTime()).toBeGreaterThanOrEqual(beforeImport.getTime());
      expect(record?.createdAt.getTime()).toBeLessThanOrEqual(afterImport.getTime());
    });

    it('should throw INVALID_IMPORT_FORMAT for malformed JSON', async () => {
      const storage = createAliasStorage(db);

      await expect(storage.importJson('not valid json')).rejects.toThrow();
    });

    it('should throw INVALID_IMPORT_FORMAT for missing version', async () => {
      const storage = createAliasStorage(db);
      const importData = {
        exportedAt: new Date().toISOString(),
        aliases: [{ address: '0x123', alias: 'Treasury' }],
      };

      await expect(storage.importJson(JSON.stringify(importData))).rejects.toThrow(
        AliasStorageError
      );

      try {
        await storage.importJson(JSON.stringify(importData));
      } catch (err) {
        expect(err).toBeInstanceOf(AliasStorageError);
        expect((err as AliasStorageError).code).toBe('INVALID_IMPORT_FORMAT');
      }
    });

    it('should throw INVALID_IMPORT_FORMAT for missing aliases array', async () => {
      const storage = createAliasStorage(db);
      const importData = {
        version: 1,
        exportedAt: new Date().toISOString(),
      };

      await expect(storage.importJson(JSON.stringify(importData))).rejects.toThrow(
        AliasStorageError
      );
    });

    it('should throw INVALID_IMPORT_FORMAT for invalid alias entry', async () => {
      const storage = createAliasStorage(db);
      const importData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        aliases: [{ address: '0x123' }], // Missing alias field
      };

      await expect(storage.importJson(JSON.stringify(importData))).rejects.toThrow(
        AliasStorageError
      );
    });

    it('should handle import with last-occurrence-wins for duplicate addresses', async () => {
      const storage = createAliasStorage(db, { duplicateMode: 'allow' });
      const importData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        aliases: [
          { address: '0x123', alias: 'First' },
          { address: '0x123', alias: 'Second' }, // Same address, later alias wins
        ],
      };

      await storage.importJson(JSON.stringify(importData));

      const record = await storage.getByAddress('0x123');
      expect(record?.alias).toBe('Second');
    });

    it('should return empty result for empty aliases array', async () => {
      const storage = createAliasStorage(db);
      const importData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        aliases: [],
      };

      const result = await storage.importJson(JSON.stringify(importData));

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.ids).toHaveLength(0);
    });

    it('should validate alias length during import', async () => {
      const storage = createAliasStorage(db, { maxAliasLength: 10 });
      const importData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        aliases: [
          { address: '0x111', alias: 'Short' },
          { address: '0x222', alias: 'This is way too long' },
        ],
      };

      const result = await storage.importJson(JSON.stringify(importData));

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(1);
    });
  });

  // ==========================================================================
  // T050: bulkSave and bulkDelete Operations
  // ==========================================================================
  describe('bulk operations', () => {
    describe('bulkSave', () => {
      it('should save multiple aliases and return their IDs', async () => {
        const storage = createAliasStorage(db, { duplicateMode: 'allow' });
        const inputs = [
          { address: '0x111', alias: 'Treasury' },
          { address: '0x222', alias: 'Vault' },
          { address: '0x333', alias: 'Wallet' },
        ];

        const ids = await storage.bulkSave(inputs);

        expect(ids).toHaveLength(3);
        ids.forEach((id) => expect(typeof id).toBe('string'));

        const all = await storage.getAll();
        expect(all).toHaveLength(3);
      });

      it('should apply upsert behavior for same address', async () => {
        const storage = createAliasStorage(db, { duplicateMode: 'allow' });
        const inputs = [
          { address: '0x111', alias: 'First' },
          { address: '0x111', alias: 'Second' }, // Same address, should update
        ];

        const ids = await storage.bulkSave(inputs);

        // Both should return same ID (upsert)
        expect(ids[0]).toBe(ids[1]);

        const record = await storage.getByAddress('0x111');
        expect(record?.alias).toBe('Second');
      });

      it('should handle empty input array', async () => {
        const storage = createAliasStorage(db);

        const ids = await storage.bulkSave([]);

        expect(ids).toEqual([]);
        expect(await storage.count()).toBe(0);
      });

      it('should validate all inputs', async () => {
        const storage = createAliasStorage(db);
        const inputs = [
          { address: '0x111', alias: 'Valid' },
          { address: '', alias: 'Invalid' }, // Invalid address
        ];

        await expect(storage.bulkSave(inputs)).rejects.toThrow(AliasStorageError);

        // Transaction rolls back on error, so nothing should be saved
        const count = await storage.count();
        expect(count).toBe(0);
      });

      it('should respect duplicateMode in bulk operations', async () => {
        const storage = createAliasStorage(db, { duplicateMode: 'strict' });
        await storage.save({ address: '0x000', alias: 'Existing' });

        const inputs = [
          { address: '0x111', alias: 'New' },
          { address: '0x222', alias: 'Existing' }, // Duplicate alias
        ];

        await expect(storage.bulkSave(inputs)).rejects.toThrow(AliasStorageError);
      });

      it('should save aliases with different networkIds', async () => {
        const storage = createAliasStorage(db);
        const inputs = [
          { address: '0x111', alias: 'Global' },
          { address: '0x111', networkId: 'ethereum-mainnet', alias: 'ETH' },
          { address: '0x111', networkId: 'polygon-mainnet', alias: 'MATIC' },
        ];

        const ids = await storage.bulkSave(inputs);

        expect(ids).toHaveLength(3);
        // All should be different IDs (different compound keys)
        expect(new Set(ids).size).toBe(3);
      });
    });

    describe('bulkDelete', () => {
      it('should delete multiple aliases by IDs', async () => {
        const storage = createAliasStorage(db);
        const id1 = await storage.save({ address: '0x111', alias: 'Treasury' });
        const id2 = await storage.save({ address: '0x222', alias: 'Vault' });
        const id3 = await storage.save({ address: '0x333', alias: 'Wallet' });

        await storage.bulkDelete([id1, id3]);

        expect(await storage.get(id1)).toBeUndefined();
        expect(await storage.get(id2)).toBeDefined();
        expect(await storage.get(id3)).toBeUndefined();
      });

      it('should handle empty input array', async () => {
        const storage = createAliasStorage(db);
        await storage.save({ address: '0x111', alias: 'Treasury' });

        await storage.bulkDelete([]);

        expect(await storage.count()).toBe(1);
      });

      it('should not throw for non-existent IDs', async () => {
        const storage = createAliasStorage(db);
        const id = await storage.save({ address: '0x111', alias: 'Treasury' });

        await expect(
          storage.bulkDelete([id, 'non-existent-1', 'non-existent-2'])
        ).resolves.not.toThrow();

        expect(await storage.get(id)).toBeUndefined();
      });

      it('should delete all records when all IDs provided', async () => {
        const storage = createAliasStorage(db);
        const id1 = await storage.save({ address: '0x111', alias: 'Treasury' });
        const id2 = await storage.save({ address: '0x222', alias: 'Vault' });

        await storage.bulkDelete([id1, id2]);

        expect(await storage.count()).toBe(0);
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
