/**
 * SF-6 · Published renderer wiring — INV-144.
 *
 * Source-scan: TransactionForm and AddAliasDialog pass activeNetworkId into
 * NameResolverProvider from wallet state (safe WalletStateContext read).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const RENDERER_SRC = join(dirname(fileURLToPath(import.meta.url)), '..');

const WIRING_FILES = [
  ['TransactionForm.tsx', join(RENDERER_SRC, 'TransactionForm.tsx')],
  ['AddAliasDialog.tsx', join(RENDERER_SRC, 'AddressBookWidget', 'AddAliasDialog.tsx')],
] as const;

describe('INV-144: published renderer injects activeNetworkId into NameResolverProvider', () => {
  it.each(WIRING_FILES)('%s wires activeNetworkId from wallet state', (_name, filePath) => {
    const source = readFileSync(filePath, 'utf8');
    expect(source).toContain('NameResolverProvider');
    expect(source).toContain('activeNetworkId=');
    expect(source).toMatch(/walletState\?\.activeNetworkId/);
    expect(source).not.toMatch(/\buseWalletState\s*\(/);
  });
});
