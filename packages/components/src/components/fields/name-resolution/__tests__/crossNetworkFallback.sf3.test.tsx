/**
 * @vitest-environment jsdom
 *
 * SF-3 · Cross-network fallback display note — AddressField forward path
 * (INV-177, INV-180, INV-184, INV-192..INV-194, INV-201).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { nameResolutionCrossNetworkFallbackMessage } from '@openzeppelin/ui-utils';

import {
  controlledResolver,
  elapseDebounce,
  HEX_ALICE,
  okResult,
  renderAddressField,
  settle,
  typeValue,
} from './helpers';

const GOLDEN_FALLBACK_PROVENANCE = {
  resolvedViaNetworkFallback: true,
  queriedOnNetworkId: 'ethereum-sepolia',
  resolvedOnNetworkId: 'ethereum-mainnet',
} as const;

const NETWORK_LABELS: Record<string, string> = {
  'ethereum-sepolia': 'Ethereum Sepolia',
  'ethereum-mainnet': 'Ethereum Mainnet',
};

const resolveNetworkLabel = (id: string): string | undefined => NETWORK_LABELS[id];

const INTERPOLATED_MESSAGE = nameResolutionCrossNetworkFallbackMessage(
  {
    queriedOnNetworkId: 'ethereum-sepolia',
    resolvedOnNetworkId: 'ethereum-mainnet',
  },
  {
    queriedNetworkName: 'Ethereum Sepolia',
    resolvedNetworkName: 'Ethereum Mainnet',
  }
);

const ADDRESS_FIELD_SOURCE = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'AddressField.tsx'),
  'utf-8'
);

/** Success announcer inner span HTML for byte-identity comparison (INV-128). */
function frozenSuccessInnerHtml(region: HTMLElement | null): string {
  const outer = region?.querySelector('span.text-sm');
  const inner = outer?.querySelector(':scope > span');
  return inner?.outerHTML ?? '';
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('INV-180: forward disclaimer under frozen success template on resolved arm only', () => {
  it('renders Resolved-to code block plus muted disclaimer below for golden triplet', async () => {
    const r = controlledResolver();
    const h = renderAddressField({
      resolver: {
        resolveName: r.resolveName,
        resolveNetworkLabel,
      },
    });

    typeValue('alice.eth');
    await elapseDebounce();
    await settle(r.deferreds[0], okResult('alice.eth', HEX_ALICE, GOLDEN_FALLBACK_PROVENANCE));

    const region = h.region();
    expect(region?.textContent).toContain('Resolved to');
    expect(region?.querySelector('code')?.textContent).toBe(HEX_ALICE);
    expect(screen.getByRole('note').textContent).toBe(INTERPOLATED_MESSAGE);
  });

  it('preserves byte-identical frozen success inner HTML for non-fallback provenance (INV-128)', async () => {
    const r = controlledResolver();
    const h = renderAddressField({
      resolver: { resolveName: r.resolveName },
    });

    typeValue('alice.eth');
    await elapseDebounce();
    await settle(
      r.deferreds[0],
      okResult('alice.eth', HEX_ALICE, { label: 'ENS via external gateway', external: true })
    );

    expect(frozenSuccessInnerHtml(h.region())).toBe(
      `<span>Resolved to <code class="font-mono">${HEX_ALICE}</code></span>`
    );
    expect(screen.queryByRole('note')).toBeNull();
  });
});

describe('INV-177: no forward disclaimer when classifier returns false', () => {
  it.each([
    [
      'incomplete triplet',
      { resolvedViaNetworkFallback: true, queriedOnNetworkId: 'ethereum-sepolia' },
    ],
    [
      'orphan ids without flag',
      { queriedOnNetworkId: 'ethereum-sepolia', resolvedOnNetworkId: 'ethereum-mainnet' },
    ],
    ['bound-local without fallback', { scopedToNetworkId: 'ethereum-sepolia' }],
  ] as const)('fixture "%s" → success only, no note', async (_label, provenance) => {
    const r = controlledResolver();
    const h = renderAddressField({
      resolver: { resolveName: r.resolveName, resolveNetworkLabel },
    });

    typeValue('alice.eth');
    await elapseDebounce();
    await settle(r.deferreds[0], okResult('alice.eth', HEX_ALICE, provenance));

    expect(h.region()?.textContent).toContain('Resolved to');
    expect(screen.queryByRole('note')).toBeNull();
  });
});

describe('INV-192: chain-scope mismatch alert supersedes fallback disclaimer', () => {
  it('renders destructive alert only when scope mismatches despite triplet', async () => {
    const r = controlledResolver();
    const h = renderAddressField({
      resolver: {
        resolveName: r.resolveName,
        activeNetworkId: 'eip155:10',
        activeNetworkName: 'Optimism',
        resolveNetworkLabel,
      },
    });

    typeValue('alice.eth');
    await elapseDebounce();
    await settle(
      r.deferreds[0],
      okResult('alice.eth', HEX_ALICE, {
        ...GOLDEN_FALLBACK_PROVENANCE,
        scopedToNetworkId: 'eip155:8453',
      })
    );

    expect(h.region()?.querySelector('[role="alert"]')).not.toBeNull();
    expect(h.region()?.textContent).not.toContain('Resolved to');
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('renders success + note when scope passes with golden triplet', async () => {
    const r = controlledResolver();
    renderAddressField({
      resolver: {
        resolveName: r.resolveName,
        activeNetworkId: 'eip155:1',
        resolveNetworkLabel,
      },
    });

    typeValue('alice.eth');
    await elapseDebounce();
    await settle(r.deferreds[0], okResult('alice.eth', HEX_ALICE, GOLDEN_FALLBACK_PROVENANCE));

    expect(screen.getByRole('note')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('INV-193: fallback disclaimer does not block forward submit', () => {
  it('writes resolved hex when golden triplet is present', async () => {
    const r = controlledResolver();
    const h = renderAddressField({
      resolver: { resolveName: r.resolveName, resolveNetworkLabel },
      required: true,
    });

    typeValue('alice.eth');
    await elapseDebounce();
    await settle(r.deferreds[0], okResult('alice.eth', HEX_ALICE, GOLDEN_FALLBACK_PROVENANCE));

    expect(h.rhfValue()).toBe(HEX_ALICE);
    expect(h.rhfIsValid()).toBe(true);
  });
});

describe('INV-194: non-resolved arms produce no fallback note', () => {
  it('loading state shows resolving copy without cross-network note', async () => {
    const r = controlledResolver();
    const h = renderAddressField({
      resolver: { resolveName: r.resolveName, resolveNetworkLabel },
    });

    typeValue('alice.eth');
    await elapseDebounce();
    // Do not settle — remain in loading.

    expect(h.region()?.textContent).toMatch(/Resolving/i);
    expect(screen.queryByRole('note')).toBeNull();
  });
});

describe('INV-184: AddressField uses SF-2 helpers — no inline flag reads', () => {
  it('AddressField.tsx does not read resolvedViaNetworkFallback directly', () => {
    expect(ADDRESS_FIELD_SOURCE).not.toMatch(/\bresolvedViaNetworkFallback\b/);
    expect(ADDRESS_FIELD_SOURCE).toMatch(/\bisCrossNetworkFallback\b/);
    expect(ADDRESS_FIELD_SOURCE).toMatch(/\bgetFallbackNetworks\b/);
  });
});

describe('INV-201: forward disclaimer uses role="note"', () => {
  it('note is informational — not role=alert', async () => {
    const r = controlledResolver();
    renderAddressField({
      resolver: { resolveName: r.resolveName, resolveNetworkLabel },
    });

    typeValue('alice.eth');
    await elapseDebounce();
    await settle(r.deferreds[0], okResult('alice.eth', HEX_ALICE, GOLDEN_FALLBACK_PROVENANCE));

    const note = screen.getByRole('note');
    expect(note.tagName).toBe('SPAN');
    expect(note.closest('[role="alert"]')).toBeNull();
  });
});
