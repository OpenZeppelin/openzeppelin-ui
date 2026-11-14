/**
 * @vitest-environment jsdom
 *
 * SF-14 · NetworkStatusBadge compact toggles (`showEcosystem`, `showIcon`).
 * Scenarios S1 (compact, icon-less → name only) and S2 (defaults unchanged).
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import React from 'react';

import type { EvmNetworkConfig } from '@openzeppelin/ui-types';

import { NetworkStatusBadge } from './network-status-badge';

const baseNetwork: EvmNetworkConfig = {
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

function TestIcon({ size }: { size?: number }): React.ReactElement {
  return <svg data-testid="network-icon" width={size} height={size} />;
}

const iconless: EvmNetworkConfig = baseNetwork;
const withIcon: EvmNetworkConfig = { ...baseNetwork, iconComponent: TestIcon };

/** The placeholder circle rendered by NetworkIcon for icon-less networks. */
function placeholder(container: HTMLElement): Element | null {
  return container.querySelector('[aria-hidden="true"]');
}

describe('NetworkStatusBadge compact toggles (SF-14)', () => {
  describe('S2: defaults unchanged', () => {
    it('shows ecosystem label, name and placeholder circle for an icon-less network', () => {
      const { container } = render(<NetworkStatusBadge network={iconless} />);
      expect(screen.getByText('evm')).toBeTruthy();
      expect(screen.getByText('Ethereum Mainnet')).toBeTruthy();
      expect(placeholder(container)).not.toBeNull();
    });

    it('shows the network icon, ecosystem label and name for a network with an icon', () => {
      render(<NetworkStatusBadge network={withIcon} />);
      expect(screen.getByTestId('network-icon')).toBeTruthy();
      expect(screen.getByText('evm')).toBeTruthy();
      expect(screen.getByText('Ethereum Mainnet')).toBeTruthy();
    });

    it('explicit true props render identically to no props', () => {
      const a = render(<NetworkStatusBadge network={withIcon} />);
      const html = a.container.innerHTML;
      a.unmount();
      const b = render(<NetworkStatusBadge network={withIcon} showEcosystem showIcon />);
      expect(b.container.innerHTML).toBe(html);
    });

    it('renders nothing for a null network, whatever the toggles', () => {
      const { container } = render(
        <NetworkStatusBadge network={null} showEcosystem={false} showIcon={false} />
      );
      expect(container.innerHTML).toBe('');
    });
  });

  describe('each toggle hides only its own element', () => {
    it('showEcosystem=false drops the label but keeps icon and name', () => {
      render(<NetworkStatusBadge network={withIcon} showEcosystem={false} />);
      expect(screen.queryByText('evm')).toBeNull();
      expect(screen.getByTestId('network-icon')).toBeTruthy();
      expect(screen.getByText('Ethereum Mainnet')).toBeTruthy();
    });

    it('showIcon=false drops the icon but keeps label and name', () => {
      render(<NetworkStatusBadge network={withIcon} showIcon={false} />);
      expect(screen.queryByTestId('network-icon')).toBeNull();
      expect(screen.getByText('evm')).toBeTruthy();
      expect(screen.getByText('Ethereum Mainnet')).toBeTruthy();
    });

    it('showIcon=false drops the placeholder circle of an icon-less network', () => {
      const { container } = render(<NetworkStatusBadge network={iconless} showIcon={false} />);
      expect(placeholder(container)).toBeNull();
      expect(screen.getByText('evm')).toBeTruthy();
    });
  });

  describe('S1: compact chip is name only', () => {
    it.each([
      ['icon-less network', iconless],
      ['network with an icon', withIcon],
    ])('%s: only the name remains', (_label, network) => {
      const { container } = render(
        <NetworkStatusBadge network={network} showEcosystem={false} showIcon={false} />
      );
      expect(screen.getByText('Ethereum Mainnet')).toBeTruthy();
      expect(screen.queryByText('evm')).toBeNull();
      expect(screen.queryByTestId('network-icon')).toBeNull();
      expect(placeholder(container)).toBeNull();
      expect(container.textContent).toBe('Ethereum Mainnet');
    });
  });

  describe('unrelated behavior survives the toggles', () => {
    it('testnet keeps its dashed border and className passes through when compact', () => {
      const { container } = render(
        <NetworkStatusBadge
          network={{ ...iconless, type: 'testnet', isTestnet: true }}
          showEcosystem={false}
          showIcon={false}
          className="custom-chip"
        />
      );
      const root = container.firstElementChild;
      expect(root?.className).toContain('border-dashed');
      expect(root?.className).toContain('custom-chip');
    });

    it('mainnet has no dashed border when compact', () => {
      const { container } = render(
        <NetworkStatusBadge network={iconless} showEcosystem={false} showIcon={false} />
      );
      expect(container.firstElementChild?.className).not.toContain('border-dashed');
    });
  });
});
