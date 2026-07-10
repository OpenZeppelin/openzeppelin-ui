/**
 * SF-5 · `AliasStorage` export/import round-trip (INV-101).
 *
 * SF-5 stores an ENS-added entry as `{ address: <resolved hex>, alias: <ENS name> }`
 * (the ENS name lives in the `alias`, never in `address`). The storage layer is
 * resolution-free by construction: `AliasStorage` takes only a Dexie handle and has no
 * runtime/provider dependency, so `importJson` can only ever call `save()` — it can never
 * re-resolve a name. These tests pin that contract:
 *
 *   • A round-trip preserves the stored hex (checksum-cased) and the stored alias verbatim.
 *   • Re-importing an entry whose ENS ownership has since changed still restores the
 *     ORIGINALLY-stored alias — proving no auto re-resolution happens on import.
 */
import type Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createAliasStorage } from '../AliasStorage';
import type { AliasExport } from '../types';
import { cleanupTestDatabase, createTestDatabase } from './setup';

// A mixed-case (checksum) hex — round-trip must not lowercase or otherwise mutate it.
const CHECKSUM_HEX = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

describe('INV-101: export/import round-trip preserves hex + alias and never auto re-resolves', () => {
  let db: Dexie;

  beforeEach(() => {
    db = createTestDatabase();
  });
  afterEach(async () => {
    await cleanupTestDatabase(db);
  });

  it('an ENS-added entry survives export → clear → import byte-identical (hex + alias)', async () => {
    const storage = createAliasStorage(db);

    // SF-5 stores the ENS name AS the alias, against the resolved hex.
    await storage.save({ address: CHECKSUM_HEX, networkId: 'eip155:1', alias: 'alice.eth' });

    const json = await storage.exportJson();
    await storage.clear();
    expect(await storage.getAll()).toHaveLength(0);

    const result = await storage.importJson(json);
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(0);

    const [record] = await storage.getAll();
    expect(record.address).toBe(CHECKSUM_HEX); // checksum casing preserved, not re-derived
    expect(record.alias).toBe('alice.eth'); // ENS-derived alias preserved verbatim
    expect(record.networkId).toBe('eip155:1');
  });

  it('re-importing an entry whose ENS ownership changed restores the ORIGINAL alias (no re-resolve)', async () => {
    const storage = createAliasStorage(db);

    // Simulate a backup taken when the hex reverse-resolved to `old-owner.eth`.
    // If import re-resolved against the current network, it might blank or change this —
    // it must not: storage has no resolver, so the stored alias is restored verbatim.
    const backup: AliasExport = {
      version: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      aliases: [{ address: CHECKSUM_HEX, networkId: 'eip155:1', alias: 'old-owner.eth' }],
    };

    const result = await storage.importJson(JSON.stringify(backup));
    expect(result.imported).toBe(1);

    const [record] = await storage.getAll();
    expect(record.alias).toBe('old-owner.eth'); // NOT re-derived from the current network
    expect(record.address).toBe(CHECKSUM_HEX);
  });

  it('preserves metadata across the round-trip (import is a pure save, no enrichment)', async () => {
    const storage = createAliasStorage(db);
    await storage.save({
      address: CHECKSUM_HEX,
      alias: 'alice.eth',
      metadata: { source: 'ens', note: 'treasury' },
    });

    const json = await storage.exportJson();
    await storage.clear();
    await storage.importJson(json);

    const [record] = await storage.getAll();
    expect(record.metadata).toEqual({ source: 'ens', note: 'treasury' });
  });
});
