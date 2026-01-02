/**
 * Test setup and utilities for storage package tests
 */
import 'fake-indexeddb/auto';

import { vi } from 'vitest';

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
