/**
 * @vitest-environment jsdom
 *
 * SF-3 · Cross-network fallback display note — AddressDisplay (INV-176..INV-179,
 * INV-181..INV-184, INV-189, INV-191, INV-195, INV-201).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import React from 'react';

import type { ResolvedName } from '@openzeppelin/ui-types';
import { nameResolutionCrossNetworkFallbackMessage } from '@openzeppelin/ui-utils';

import { AddressDisplay } from '../address-display';
import { AddressLabelProvider } from '../address-label-context';
import { AddressNameProvider } from '../address-name-context';
import { CHECKSUM_ADDRESS, verifiedRecord } from './helpers';

const GOLDEN_FALLBACK_PROVENANCE = {
  label: 'ENS',
  external: false,
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

const GENERIC_MESSAGE = nameResolutionCrossNetworkFallbackMessage({
  queriedOnNetworkId: 'ethereum-sepolia',
  resolvedOnNetworkId: 'ethereum-mainnet',
});

const SLUG_MESSAGE = 'Name not found on ethereum-sepolia, but found on ethereum-mainnet.';

function fallbackRecord(overrides: Partial<ResolvedName> = {}): ResolvedName {
  return verifiedRecord({
    name: 'vitalik.eth',
    provenance: GOLDEN_FALLBACK_PROVENANCE,
    ...overrides,
  });
}

function getFallbackInfoTrigger(message: string): HTMLElement {
  return screen.getByRole('button', { name: message });
}

function queryFallbackInfoTrigger(): HTMLElement | null {
  return screen.queryByRole('button', { name: /Name not found on/i });
}

const ADDRESS_DISPLAY_SOURCE = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'address-display.tsx'),
  'utf-8'
);

describe('INV-176: golden fallback triplet renders verified name and cross-network disclaimer', () => {
  it('shows name + info icon with interpolated accessible name when resolveNetworkLabel maps both slugs', () => {
    render(
      <AddressNameProvider
        resolveAddressName={() => fallbackRecord()}
        resolveNetworkLabel={resolveNetworkLabel}
      >
        <AddressDisplay address={CHECKSUM_ADDRESS} networkId="ethereum-sepolia" />
      </AddressNameProvider>
    );

    expect(screen.getByText('vitalik.eth')).toBeTruthy();
    expect(getFallbackInfoTrigger(INTERPOLATED_MESSAGE).getAttribute('aria-label')).toBe(
      INTERPOLATED_MESSAGE
    );
  });

  it('shows name + info icon with slug-interpolated accessible name via resolvedName without label resolver', () => {
    render(<AddressDisplay address={CHECKSUM_ADDRESS} resolvedName={fallbackRecord()} />);

    expect(screen.getByText('vitalik.eth')).toBeTruthy();
    expect(getFallbackInfoTrigger(SLUG_MESSAGE).getAttribute('aria-label')).toBe(SLUG_MESSAGE);
  });
});

describe('INV-177: no disclaimer when SF-2 classifiers return false', () => {
  it.each([
    [
      'bound-local scoped provenance without fallback flag',
      verifiedRecord({
        name: 'sepolia-local.eth',
        provenance: {
          label: 'ENS',
          external: false,
          scopedToNetworkId: 'ethereum-sepolia',
        },
      }),
    ],
    [
      'non-fallback provenance',
      verifiedRecord({
        provenance: { label: 'ENS', external: false },
      }),
    ],
    [
      'incomplete triplet (flag true, missing resolved id)',
      verifiedRecord({
        provenance: {
          label: 'ENS',
          external: false,
          resolvedViaNetworkFallback: true,
          queriedOnNetworkId: 'ethereum-sepolia',
        },
      }),
    ],
    [
      'orphan ids without fallback flag',
      verifiedRecord({
        provenance: {
          label: 'ENS',
          external: false,
          queriedOnNetworkId: 'ethereum-sepolia',
          resolvedOnNetworkId: 'ethereum-mainnet',
        },
      }),
    ],
  ] as const)('fixture "%s" → no fallback info icon', (_label, record) => {
    render(
      <AddressNameProvider
        resolveAddressName={() => record}
        resolveNetworkLabel={resolveNetworkLabel}
      >
        <AddressDisplay address={CHECKSUM_ADDRESS} />
      </AddressNameProvider>
    );

    expect(queryFallbackInfoTrigger()).toBeNull();
  });
});

describe('INV-178: disclaimer only when ENS name wins label precedence', () => {
  it('suppresses disclaimer when explicit label prop outranks ensName', () => {
    render(
      <AddressDisplay address={CHECKSUM_ADDRESS} label="Treasury" resolvedName={fallbackRecord()} />
    );

    expect(screen.getByText('Treasury')).toBeTruthy();
    expect(screen.queryByText('vitalik.eth')).toBeNull();
    expect(queryFallbackInfoTrigger()).toBeNull();
  });

  it('suppresses disclaimer when address-book alias outranks ensName', () => {
    render(
      <AddressLabelProvider resolveLabel={() => 'Treasury'}>
        <AddressDisplay address={CHECKSUM_ADDRESS} resolvedName={fallbackRecord()} />
      </AddressLabelProvider>
    );

    expect(screen.getByText('Treasury')).toBeTruthy();
    expect(queryFallbackInfoTrigger()).toBeNull();
  });

  it('shows info icon when ensName is the effective label', () => {
    render(<AddressDisplay address={CHECKSUM_ADDRESS} resolvedName={fallbackRecord()} />);

    expect(screen.getByText('vitalik.eth')).toBeTruthy();
    expect(getFallbackInfoTrigger(SLUG_MESSAGE)).toBeTruthy();
  });
});

describe('INV-179 / INV-189 / INV-191: hex-only branch never renders fallback note', () => {
  it('forwardVerified:false with complete triplet → hex only, no disclaimer (INV-179, INV-191)', () => {
    const { container } = render(
      <AddressDisplay
        address={CHECKSUM_ADDRESS}
        resolvedName={fallbackRecord({ forwardVerified: false })}
      />
    );

    expect(screen.queryByText('vitalik.eth')).toBeNull();
    expect(queryFallbackInfoTrigger()).toBeNull();
    expect(container.textContent).toContain('0xd8dA');
  });

  it('disableLabel with golden triplet → hex only, no disclaimer (INV-189)', () => {
    render(
      <AddressDisplay address={CHECKSUM_ADDRESS} disableLabel resolvedName={fallbackRecord()} />
    );

    expect(screen.queryByText('vitalik.eth')).toBeNull();
    expect(queryFallbackInfoTrigger()).toBeNull();
  });
});

describe('INV-181: unobtrusive triangle-alert icon — no badge or mechanism chrome', () => {
  it('renders an amber triangle-alert icon trigger without badge components', () => {
    const { container } = render(
      <AddressDisplay address={CHECKSUM_ADDRESS} resolvedName={fallbackRecord()} />
    );

    const trigger = getFallbackInfoTrigger(SLUG_MESSAGE);
    expect(trigger.tagName).toBe('BUTTON');
    expect(trigger.querySelector('svg')).not.toBeNull();
    expect(container.querySelector('[data-slot="badge"]')).toBeNull();
    expect(container.innerHTML).not.toMatch(/NetworkStatusBadge/);
  });
});

describe('INV-182 / INV-198: disclaimer copy uses locked templates', () => {
  it('uses slug-interpolated copy when resolveNetworkLabel is absent (INV-170)', () => {
    render(
      <AddressNameProvider resolveAddressName={() => fallbackRecord()}>
        <AddressDisplay address={CHECKSUM_ADDRESS} />
      </AddressNameProvider>
    );

    expect(getFallbackInfoTrigger(SLUG_MESSAGE).getAttribute('aria-label')).toBe(SLUG_MESSAGE);
  });

  it('uses generic copy when wired resolver fails to resolve either label (INV-198)', () => {
    render(
      <AddressNameProvider
        resolveAddressName={() => fallbackRecord()}
        resolveNetworkLabel={() => undefined}
      >
        <AddressDisplay address={CHECKSUM_ADDRESS} />
      </AddressNameProvider>
    );

    expect(getFallbackInfoTrigger(GENERIC_MESSAGE).getAttribute('aria-label')).toBe(
      GENERIC_MESSAGE
    );
  });
});

describe('INV-183: disclaimer icon is inline immediately after the verified name', () => {
  it('orders label → info icon on the same row, then hex row below', () => {
    const { container } = render(
      <AddressDisplay address={CHECKSUM_ADDRESS} resolvedName={fallbackRecord()} />
    );

    const root = container.firstElementChild as HTMLElement;
    const labelRow = root.querySelector('span.inline-flex');
    const labelSpan = labelRow?.querySelector('span.truncate.font-sans');
    const iconTrigger = labelRow?.querySelector('button[aria-label]');
    const hexRow = root.querySelector('div.font-mono');

    expect(labelSpan?.textContent).toBe('vitalik.eth');
    expect(iconTrigger).not.toBeNull();
    expect(hexRow).not.toBeNull();

    const position = (node: Element | null): number =>
      node ? Array.from(root.querySelectorAll('*')).indexOf(node) : -1;

    expect(position(labelRow)).toBeLessThan(position(hexRow));
    expect(labelRow?.contains(iconTrigger as Node)).toBe(true);
  });
});

describe('INV-184: triplet visibility gated by SF-2 helpers — no inline provenance flag reads', () => {
  it('address-display.tsx does not read resolvedViaNetworkFallback directly', () => {
    expect(ADDRESS_DISPLAY_SOURCE).not.toMatch(/\bresolvedViaNetworkFallback\b/);
    expect(ADDRESS_DISPLAY_SOURCE).toMatch(/\bisCrossNetworkFallback\b/);
    expect(ADDRESS_DISPLAY_SOURCE).toMatch(/\bgetFallbackNetworks\b/);
  });
});

describe('showCrossNetworkFallbackDisclaimer: developer opt-out (default on)', () => {
  it('renders the fallback icon by default when triplet is present', () => {
    render(<AddressDisplay address={CHECKSUM_ADDRESS} resolvedName={fallbackRecord()} />);

    expect(getFallbackInfoTrigger(SLUG_MESSAGE)).toBeTruthy();
  });

  it('suppresses the icon+tooltip when showCrossNetworkFallbackDisclaimer is false', () => {
    const { container } = render(
      <AddressDisplay
        address={CHECKSUM_ADDRESS}
        resolvedName={fallbackRecord()}
        showCrossNetworkFallbackDisclaimer={false}
      />
    );

    expect(screen.getByText('vitalik.eth')).toBeTruthy();
    expect(queryFallbackInfoTrigger()).toBeNull();
    expect(container.querySelector('button[aria-label]')).toBeNull();
  });
});

describe('INV-201: disclaimer is informational — accessible name, not alert', () => {
  it('exposes the message via the icon trigger aria-label without role=alert', () => {
    render(<AddressDisplay address={CHECKSUM_ADDRESS} resolvedName={fallbackRecord()} />);

    const trigger = getFallbackInfoTrigger(SLUG_MESSAGE);
    expect(trigger.getAttribute('aria-label')).toBe(SLUG_MESSAGE);
    expect(trigger.closest('[role="alert"]')).toBeNull();
    expect(screen.queryByRole('note')).toBeNull();
  });
});
