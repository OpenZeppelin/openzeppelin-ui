/**
 * @vitest-environment jsdom
 *
 * SF-7 · `AddAliasDialog` — the network selector is named by its visible "Network" label
 * (AS-1 at the call site). The label already pointed at `alias-network`; the selector now
 * carries that id, so the pointer lands. Without a network list there is no selector.
 * Stage artifact: sf-7-networkselector-name/05-tests.md
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import React from 'react';

import type { NetworkConfig } from '@openzeppelin/ui-types';

import { AddAliasDialog } from '../AddAliasDialog';

const addressing = { isValidAddress: (v: string): boolean => /^0x[0-9a-fA-F]{40}$/.test(v) };

const NETWORKS = [
  { id: 'eip155:1', name: 'Ethereum', type: 'mainnet', ecosystem: 'evm' } as NetworkConfig,
  { id: 'eip155:8453', name: 'Base', type: 'mainnet', ecosystem: 'evm' } as NetworkConfig,
];

function renderDialog(networks?: NetworkConfig[], currentNetworkId?: string): void {
  render(
    <AddAliasDialog
      open
      onOpenChange={vi.fn()}
      onSave={vi.fn().mockResolvedValue('id-1')}
      addressing={addressing}
      networks={networks}
      currentNetworkId={currentNetworkId}
      resolveNetwork={(id) => NETWORKS.find((n) => n.id === id)}
    />
  );
}

describe('SF-7 AS-1: the add-alias network selector is named by its label', () => {
  it('happy: the trigger is found by the name "Network" and is the label’s target', () => {
    renderDialog(NETWORKS);
    const trigger = screen.getByRole('combobox', { name: 'Network' });
    expect(trigger.id).toBe('alias-network');
    expect(screen.getByText('Network', { selector: 'label' }).getAttribute('for')).toBe(
      'alias-network'
    );
  });

  it('boundary: the name stays "Network" when a network is preselected', () => {
    renderDialog(NETWORKS, 'eip155:8453');
    const trigger = screen.getByRole('combobox', { name: 'Network' });
    expect(trigger.textContent).toContain('Base');
  });

  it('failure: with no networks there is no selector and no dangling label', () => {
    renderDialog(undefined);
    expect(screen.queryByRole('combobox', { name: 'Network' })).toBeNull();
    expect(screen.queryByText('Network', { selector: 'label' })).toBeNull();
  });
});
