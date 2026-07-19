/**
 * @vitest-environment jsdom
 *
 * SF-1 · Reverse-display provenance scope gate — acceptance scenarios 1–5
 * (INV-151..INV-160).
 *
 * `useResolveAddress` is module-mocked so tests exercise only the synchronous
 * bridge gate; wallet context is mounted where relevant to prove INV-154
 * (wallet network never consulted).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

import { AddressDisplay, useAddressName } from '@openzeppelin/ui-components';
import { WalletStateContext, type WalletStateContextValue } from '@openzeppelin/ui-react';
import type { NetworkConfig, ResolvedName } from '@openzeppelin/ui-types';

import { AddressNameResolutionProvider } from '../AddressNameResolutionProvider';

// ---------------------------------------------------------------------------
// Mock: isolate the bridge from async resolution
// ---------------------------------------------------------------------------

const mockUseResolveAddress = vi.hoisted(() => vi.fn());

vi.mock('@openzeppelin/ui-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@openzeppelin/ui-react')>();
  return {
    ...actual,
    useResolveAddress: mockUseResolveAddress,
  };
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SEPOLIA = 'eip155:11155111';
const BASE = 'eip155:8453';
const MAINNET = 'eip155:1';

/** Checksummed address — display authority per INV-53. */
const TEST_ADDRESS = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const TRUNCATED_HEX = '0xd8dA...6045';

function makeWallet(activeNetworkId: string): WalletStateContextValue {
  return {
    activeNetworkId,
    setActiveNetworkId: () => undefined,
    activeNetworkConfig: { name: 'Test' } as NetworkConfig,
    activeRuntime: { nameResolution: undefined },
    isRuntimeLoading: false,
    walletFacadeHooks: null,
    reconfigureActiveUiKit: () => undefined,
  };
}

function verifiedRecord(name: string, provenance: ResolvedName['provenance']): ResolvedName {
  return {
    address: TEST_ADDRESS.toLowerCase(),
    name,
    forwardVerified: true,
    provenance,
  };
}

function globalProvenance(): ResolvedName['provenance'] {
  return { label: 'ENS', external: false };
}

function scopedProvenance(scopedToNetworkId: string): ResolvedName['provenance'] {
  return { label: 'ENS', external: false, scopedToNetworkId };
}

function mountDisplay({
  record,
  providerNetworkId,
  displayNetworkId,
  walletActiveNetworkId,
}: {
  record: ResolvedName;
  providerNetworkId?: string;
  displayNetworkId?: string;
  walletActiveNetworkId?: string;
}): ReturnType<typeof render> {
  mockUseResolveAddress.mockReturnValue({
    status: 'resolved',
    data: record,
  });

  const displayNetwork = displayNetworkId ?? providerNetworkId;

  const tree = (
    <AddressNameResolutionProvider address={TEST_ADDRESS} networkId={providerNetworkId}>
      <AddressDisplay address={TEST_ADDRESS} networkId={displayNetwork} />
    </AddressNameResolutionProvider>
  );

  if (walletActiveNetworkId !== undefined) {
    return render(
      <WalletStateContext.Provider value={makeWallet(walletActiveNetworkId)}>
        {tree}
      </WalletStateContext.Provider>
    );
  }

  return render(tree);
}

function expectHexFallback(container: HTMLElement, name: string): void {
  expect(container.textContent).toContain(TRUNCATED_HEX);
  expect(container.innerHTML).not.toContain(name);
  expect(screen.queryByText(name)).toBeNull();
}

function expectVerifiedName(name: string): void {
  expect(screen.getByText(name)).toBeTruthy();
}

function RecordProbe({
  networkId,
  onRecord,
}: {
  networkId?: string;
  onRecord: (record: ResolvedName | undefined) => void;
}): React.ReactElement {
  const { record } = useAddressName(TEST_ADDRESS, networkId);
  React.useLayoutEffect(() => {
    onRecord(record);
  }, [onRecord, record]);
  return <span data-testid="record-probe" />;
}

// ---------------------------------------------------------------------------
// Static audit helpers (acceptance scenario 5 / INV-158)
// ---------------------------------------------------------------------------

const RENDERER_COMPONENTS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const ADDRESS_DISPLAY_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../components/src/components/ui/address-display'
);

const DISPLAY_PATH_FILES = [
  join(RENDERER_COMPONENTS_DIR, 'AddressNameResolutionProvider.tsx'),
  ...readdirSync(ADDRESS_DISPLAY_DIR)
    .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f))
    .map((f) => join(ADDRESS_DISPLAY_DIR, f)),
];

const FORBIDDEN_ADAPTER_SYMBOLS = ['EnsProvenance', 'isEnsProvenance'] as const;

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ===========================================================================
// Acceptance scenario 1 — INV-151: global identity on Sepolia row, wallet irrelevant
// ===========================================================================

describe('INV-151 / acceptance 1: globally scoped reverse record renders on Sepolia row regardless of wallet network', () => {
  const record = verifiedRecord('vitalik.eth', globalProvenance());

  it.each([
    ['wallet on mainnet', MAINNET],
    ['wallet on Sepolia', SEPOLIA],
    ['wallet on another network', 'eip155:10'],
  ] as const)('%s → verified name renders (not hex fallback)', (_label, walletNetwork) => {
    const { container } = mountDisplay({
      record,
      providerNetworkId: SEPOLIA,
      walletActiveNetworkId: walletNetwork,
    });

    expectVerifiedName('vitalik.eth');
    expect(container.textContent).toContain(TRUNCATED_HEX);
  });

  it('no wallet provider mounted → verified name still renders', () => {
    mountDisplay({
      record,
      providerNetworkId: SEPOLIA,
    });

    expectVerifiedName('vitalik.eth');
  });
});

// ===========================================================================
// Acceptance scenario 2 — INV-152: Base-scoped record withheld on Sepolia row
// ===========================================================================

describe('INV-152 / acceptance 2: network-local Base provenance suppressed on Sepolia row', () => {
  it('resolveAddressName returns undefined → AddressDisplay falls back to hex', () => {
    const record = verifiedRecord('base-local.eth', scopedProvenance(BASE));
    const { container } = mountDisplay({
      record,
      providerNetworkId: SEPOLIA,
      walletActiveNetworkId: MAINNET,
    });

    expectHexFallback(container, 'base-local.eth');
  });
});

// ===========================================================================
// Acceptance scenario 3 — INV-153: matching scoped id serves the record
// ===========================================================================

describe('INV-153 / acceptance 3: Sepolia-scoped provenance renders on Sepolia row', () => {
  it('matching scopedToNetworkId and row networkId → verified name renders', () => {
    const record = verifiedRecord('sepolia-local.eth', scopedProvenance(SEPOLIA));
    mountDisplay({
      record,
      providerNetworkId: SEPOLIA,
      walletActiveNetworkId: MAINNET,
    });

    expectVerifiedName('sepolia-local.eth');
  });
});

// ===========================================================================
// Acceptance scenario 4 — INV-155: unscoped row skips provenance gate
// ===========================================================================

describe('INV-155 / acceptance 4: no row networkId → scope gating skipped', () => {
  it('provider without networkId serves network-local provenance to display', () => {
    const record = verifiedRecord('base-local.eth', scopedProvenance(BASE));
    mountDisplay({
      record,
      providerNetworkId: undefined,
      displayNetworkId: undefined,
    });

    expectVerifiedName('base-local.eth');
  });
});

// ===========================================================================
// Acceptance scenario 5 — INV-158: chain-agnostic display paths (static audit)
// ===========================================================================

describe('INV-158 / acceptance 5: display paths import no adapter ENS provenance types or coinType gating', () => {
  it('scans a non-empty display-path file set', () => {
    expect(DISPLAY_PATH_FILES.length).toBeGreaterThan(0);
    expect(DISPLAY_PATH_FILES.map((f) => f.split('/').pop())).toContain(
      'AddressNameResolutionProvider.tsx'
    );
    expect(DISPLAY_PATH_FILES.map((f) => f.split('/').pop())).toContain('address-display.tsx');
  });

  it.each(DISPLAY_PATH_FILES.map((f) => [f.split('/').pop() as string, f]))(
    '%s imports no EnsProvenance / isEnsProvenance and does not branch on coinType',
    (_name, filePath) => {
      const source = stripComments(readFileSync(filePath, 'utf-8'));

      for (const symbol of FORBIDDEN_ADAPTER_SYMBOLS) {
        expect(source).not.toContain(symbol);
      }

      // coinType branching for display gating — match property access / destructuring only.
      expect(source).not.toMatch(/\bprovenance\b[^;{]*\bcoinType\b/);
      expect(source).not.toMatch(/\bcoinType\s*===/);
      expect(source).not.toMatch(/\bcoinType\s*!==/);
    }
  );

  it('AddressNameResolutionProvider does not read WalletStateContext (INV-154)', () => {
    const source = stripComments(
      readFileSync(join(RENDERER_COMPONENTS_DIR, 'AddressNameResolutionProvider.tsx'), 'utf-8')
    );
    expect(source).not.toContain('WalletStateContext');
  });
});

// ===========================================================================
// Supplementary invariant coverage
// ===========================================================================

describe('INV-156: empty-string scopedToNetworkId treated as globally scoped', () => {
  it("scopedToNetworkId: '' on Sepolia row → record served", () => {
    const record = verifiedRecord('global-via-empty.eth', {
      label: 'ENS',
      external: false,
      scopedToNetworkId: '',
    });
    mountDisplay({
      record,
      providerNetworkId: SEPOLIA,
      walletActiveNetworkId: BASE,
    });

    expectVerifiedName('global-via-empty.eth');
  });
});

describe('INV-157: display requestedNetworkId must match provider networkId', () => {
  it('display requests Base while provider is Sepolia → hex fallback even when provenance matches Sepolia', () => {
    const record = verifiedRecord('sepolia-local.eth', scopedProvenance(SEPOLIA));
    const { container } = mountDisplay({
      record,
      providerNetworkId: SEPOLIA,
      displayNetworkId: BASE,
    });

    expectHexFallback(container, 'sepolia-local.eth');
  });

  it('network.id is authoritative when both network and networkId are set', () => {
    const record = verifiedRecord('sepolia-local.eth', scopedProvenance(SEPOLIA));
    mockUseResolveAddress.mockReturnValue({
      status: 'resolved',
      data: record,
    });

    render(
      <AddressNameResolutionProvider
        address={TEST_ADDRESS}
        networkId={BASE}
        network={{ id: SEPOLIA } as NetworkConfig}
      >
        <AddressDisplay address={TEST_ADDRESS} networkId={SEPOLIA} />
      </AddressNameResolutionProvider>
    );

    expectVerifiedName('sepolia-local.eth');
  });
});

describe('INV-159: scope mismatch returns undefined — record passes verbatim on success', () => {
  it('matching gate returns the same record reference (no mutation)', () => {
    const record = verifiedRecord('verbatim.eth', globalProvenance());
    mockUseResolveAddress.mockReturnValue({
      status: 'resolved',
      data: record,
    });

    let resolved: ResolvedName | undefined;

    render(
      <AddressNameResolutionProvider address={TEST_ADDRESS} networkId={SEPOLIA}>
        <RecordProbe
          networkId={SEPOLIA}
          onRecord={(r) => {
            resolved = r;
          }}
        />
      </AddressNameResolutionProvider>
    );

    expect(resolved).toBe(record);
  });

  it('scope mismatch returns undefined, not a mutated clone', () => {
    const record = verifiedRecord('base-local.eth', scopedProvenance(BASE));
    mockUseResolveAddress.mockReturnValue({
      status: 'resolved',
      data: record,
    });

    let resolved: ResolvedName | undefined;

    render(
      <AddressNameResolutionProvider address={TEST_ADDRESS} networkId={SEPOLIA}>
        <RecordProbe
          networkId={SEPOLIA}
          onRecord={(r) => {
            resolved = r;
          }}
        />
      </AddressNameResolutionProvider>
    );

    expect(resolved).toBeUndefined();
  });
});

describe('INV-160: non-resolved hook states → hex fallback (scope gate not applied)', () => {
  it.each([
    ['loading', { status: 'loading' as const, address: TEST_ADDRESS }],
    [
      'error',
      {
        status: 'error' as const,
        address: TEST_ADDRESS,
        error: { code: 'ADDRESS_NOT_FOUND' as const, address: TEST_ADDRESS },
        retry: () => undefined,
      },
    ],
    ['idle', { status: 'idle' as const }],
  ])('%s hook state → hex fallback (scope gate not applied)', (_label, hookState) => {
    mockUseResolveAddress.mockReturnValue(hookState);
    const { container } = render(
      <AddressNameResolutionProvider address={TEST_ADDRESS} networkId={SEPOLIA}>
        <AddressDisplay address={TEST_ADDRESS} networkId={SEPOLIA} />
      </AddressNameResolutionProvider>
    );

    expect(container.textContent).toContain(TRUNCATED_HEX);
    expect(screen.queryByText('vitalik.eth')).toBeNull();
  });
});
