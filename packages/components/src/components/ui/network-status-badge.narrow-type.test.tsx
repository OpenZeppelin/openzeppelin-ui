/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, expectTypeOf, it } from 'vitest';
import React from 'react';

import type { EvmNetworkConfig, NetworkConfig } from '@openzeppelin/ui-types';

import { NetworkStatusBadge } from './network-status-badge';

type BadgeNetwork = React.ComponentProps<typeof NetworkStatusBadge>['network'];

const narrow = { ecosystem: 'evm', name: 'My Chain', type: 'mainnet' } as const;

const full: EvmNetworkConfig = {
  id: 'ethereum-mainnet',
  name: 'Ethereum Mainnet',
  ecosystem: 'evm',
  network: 'ethereum',
  type: 'mainnet',
  isTestnet: false,
  exportConstName: 'ethereumMainnet',
  chainId: 1,
  rpcUrl: 'https://rpc.example.invalid',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
};

describe('NetworkStatusBadge narrow network type', () => {
  it('type: accepts only the read fields, a full config, or null', () => {
    expectTypeOf(narrow).toMatchTypeOf<NonNullable<BadgeNetwork>>();
    expectTypeOf<NetworkConfig>().toMatchTypeOf<NonNullable<BadgeNetwork>>();
    expectTypeOf<null>().toMatchTypeOf<BadgeNetwork>();
  });

  it('type: still requires the fields the badge reads', () => {
    // @ts-expect-error name is required
    const missingName: BadgeNetwork = { ecosystem: 'evm', type: 'mainnet' };
    // @ts-expect-error ecosystem is required
    const missingEcosystem: BadgeNetwork = { name: 'x', type: 'mainnet' };
    expect([missingName, missingEcosystem]).toHaveLength(2);
  });

  it('renders a network without rpcUrl like a full config', () => {
    const { container: a } = render(<NetworkStatusBadge network={narrow} />);
    expect(screen.getByText('evm')).toBeTruthy();
    expect(screen.getByText('My Chain')).toBeTruthy();
    expect(a.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('renders the same text structure for narrow and full objects with equal fields', () => {
    const { container: a } = render(
      <NetworkStatusBadge
        network={{ ecosystem: full.ecosystem, name: full.name, type: full.type }}
      />
    );
    const { container: b } = render(<NetworkStatusBadge network={full} />);
    expect(a.innerHTML).toBe(b.innerHTML);
  });

  it('failure: null network renders nothing', () => {
    const { container } = render(<NetworkStatusBadge network={null} />);
    expect(container.firstChild).toBeNull();
  });
});
