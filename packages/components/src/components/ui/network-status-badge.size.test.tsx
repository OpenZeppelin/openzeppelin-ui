/**
 * @vitest-environment jsdom
 *
 * NetworkStatusBadge `size` prop: default padding/border stay as today; `sm` tightens
 * both for dense headers.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, expectTypeOf, it } from 'vitest';
import React from 'react';

import type { EvmNetworkConfig } from '@openzeppelin/ui-types';

import { NetworkStatusBadge } from './network-status-badge';

const mainnet: EvmNetworkConfig = {
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

const testnet: EvmNetworkConfig = {
  ...mainnet,
  id: 'ethereum-sepolia',
  name: 'Sepolia',
  type: 'testnet',
  isTestnet: true,
  exportConstName: 'ethereumSepolia',
  chainId: 11155111,
};

function TestIcon({ size }: { size?: number }): React.ReactElement {
  return <svg data-testid="network-icon" width={size} height={size} />;
}

const withIcon = { ...mainnet, iconComponent: TestIcon };
const testnetWithIcon = { ...testnet, iconComponent: TestIcon };

function rootClass(container: HTMLElement): string {
  return container.firstElementChild?.className ?? '';
}

function classTokens(container: HTMLElement): string[] {
  return rootClass(container).split(/\s+/).filter(Boolean);
}

describe('NetworkStatusBadge size', () => {
  describe("S2: omitted and default keep today's classes", () => {
    it('omitted size uses default padding and no dashed border on mainnet', () => {
      const { container } = render(<NetworkStatusBadge network={mainnet} />);
      const cls = rootClass(container);
      expect(cls).toContain('gap-2');
      expect(cls).toContain('px-3');
      expect(cls).toContain('py-2');
      expect(cls).not.toContain('gap-1.5');
      expect(cls).not.toContain('px-2');
      expect(cls).not.toContain('py-1');
      expect(cls).not.toContain('border-dashed');
      expect(cls).toContain('border-0');
    });

    it('size="default" matches omitted size class list', () => {
      const a = render(<NetworkStatusBadge network={testnetWithIcon} />);
      const omitted = a.container.innerHTML;
      a.unmount();
      const b = render(<NetworkStatusBadge network={testnetWithIcon} size="default" />);
      expect(b.container.innerHTML).toBe(omitted);
    });

    it('default testnet keeps a 2px dashed border', () => {
      const { container } = render(<NetworkStatusBadge network={testnet} />);
      const tokens = classTokens(container);
      expect(tokens).toContain('border-dashed');
      expect(tokens).toContain('border-2');
      expect(tokens).not.toContain('border');
    });

    it('type: size accepts only default | sm | undefined', () => {
      type Size = React.ComponentProps<typeof NetworkStatusBadge>['size'];
      expectTypeOf<'default'>().toMatchTypeOf<Size>();
      expectTypeOf<'sm'>().toMatchTypeOf<Size>();
      expectTypeOf<undefined>().toMatchTypeOf<Size>();
      // @ts-expect-error invalid size
      const bad: Size = 'lg';
      expect(bad).toBe('lg');
    });
  });

  describe('S1: sm is tighter than default', () => {
    it('sm uses tighter padding and gap on mainnet', () => {
      const { container } = render(<NetworkStatusBadge network={mainnet} size="sm" />);
      const cls = rootClass(container);
      expect(cls).toContain('gap-1.5');
      expect(cls).toContain('px-2');
      expect(cls).toContain('py-1');
      expect(cls).not.toContain('gap-2');
      expect(cls).not.toContain('px-3');
      expect(cls).not.toContain('py-2');
      expect(cls).toContain('border-0');
      expect(cls).not.toContain('border-dashed');
    });

    it('sm testnet uses a 1px dashed border (not border-2)', () => {
      const { container } = render(<NetworkStatusBadge network={testnet} size="sm" />);
      const tokens = classTokens(container);
      expect(tokens).toContain('border-dashed');
      expect(tokens).toContain('border');
      expect(tokens).not.toContain('border-2');
    });

    it('sm passes a smaller icon size than default', () => {
      const def = render(<NetworkStatusBadge network={withIcon} />);
      expect(screen.getByTestId('network-icon').getAttribute('width')).toBe('16');
      def.unmount();
      render(<NetworkStatusBadge network={withIcon} size="sm" />);
      expect(screen.getByTestId('network-icon').getAttribute('width')).toBe('14');
    });

    it('sm still shows ecosystem and name', () => {
      render(<NetworkStatusBadge network={testnetWithIcon} size="sm" />);
      expect(screen.getByText('evm')).toBeTruthy();
      expect(screen.getByText('Sepolia')).toBeTruthy();
      expect(screen.getByTestId('network-icon')).toBeTruthy();
    });
  });

  describe('S3 / failure edges', () => {
    it('sm with null network still renders nothing', () => {
      const { container } = render(<NetworkStatusBadge network={null} size="sm" />);
      expect(container.innerHTML).toBe('');
    });

    it('sm keeps compact toggles and className passthrough on testnet', () => {
      const { container } = render(
        <NetworkStatusBadge
          network={testnet}
          size="sm"
          showEcosystem={false}
          showIcon={false}
          className="header-chip"
        />
      );
      expect(screen.getByText('Sepolia')).toBeTruthy();
      expect(screen.queryByText('evm')).toBeNull();
      const cls = rootClass(container);
      expect(cls).toContain('border-dashed');
      expect(cls).not.toContain('border-2');
      expect(cls).toContain('header-chip');
      expect(container.textContent).toBe('Sepolia');
    });

    it('devnet follows the same dashed-border size rules as testnet', () => {
      const devnet = { ...testnet, type: 'devnet' as const, name: 'Local' };
      const def = render(<NetworkStatusBadge network={devnet} />);
      expect(rootClass(def.container)).toContain('border-2');
      def.unmount();
      const sm = render(<NetworkStatusBadge network={devnet} size="sm" />);
      expect(rootClass(sm.container)).toContain('border-dashed');
      expect(rootClass(sm.container)).not.toContain('border-2');
    });
  });
});
