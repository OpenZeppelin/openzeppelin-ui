/**
 * Test setup and utilities for Account Alias Storage plugin tests
 */
import 'fake-indexeddb/auto';

import Dexie from 'dexie';
import { vi } from 'vitest';

import { ALIAS_SCHEMA } from '../schema';

// Mock the logger utility to avoid console noise in tests
vi.mock('@openzeppelin/ui-utils', async () => {
  const actual = await vi.importActual('@openzeppelin/ui-utils');
  return {
    ...actual,
    logger: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    },
  };
});

/**
 * Creates a fresh test database with the alias schema.
 * Each test should call this to get an isolated database instance.
 *
 * @param name - Unique database name (defaults to random)
 * @returns A new Dexie database instance
 */
export function createTestDatabase(name?: string): Dexie {
  const dbName = name ?? `test-db-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const db = new Dexie(dbName);

  db.version(1).stores(ALIAS_SCHEMA);

  return db;
}

/**
 * Cleans up a test database by closing and deleting it.
 *
 * @param db - The database to clean up
 */
export async function cleanupTestDatabase(db: Dexie): Promise<void> {
  try {
    db.close();
    await Dexie.delete(db.name);
  } catch {
    // Ignore cleanup errors
  }
}
