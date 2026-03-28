import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ContractAdapter, ContractSchema, RenderFormSchema } from '@openzeppelin/ui-types';

import { TransactionForm } from '../TransactionForm';

vi.mock('@openzeppelin/ui-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@openzeppelin/ui-utils')>();
  return {
    ...actual,
    logger: {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    },
  };
});

describe('TransactionForm onTransactionSuccess', () => {
  it('invokes callback with network_id, ecosystem, and execution_method when local pure execution succeeds', async () => {
    const onTransactionSuccess = vi.fn();
    const signAndBroadcast = vi.fn().mockResolvedValue({
      txHash: '0xabc',
      result: undefined,
    });

    const adapter = {
      networkConfig: {
        id: 'sepolia',
        ecosystem: 'evm',
        name: 'Sepolia',
        network: 'ethereum',
        type: 'testnet',
        isTestnet: true,
        exportConstName: 'ethereumSepolia',
        chainId: 11155111,
        rpcUrl: 'https://rpc.test',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      },
      initialAppServiceKitName: 'rainbowkit',
      formatTransactionData: vi.fn().mockReturnValue({}),
      signAndBroadcast,
    } as unknown as ContractAdapter;

    const contractSchema: ContractSchema = {
      ecosystem: 'evm',
      address: '0x1234567890123456789012345678901234567890',
      functions: [
        {
          id: 'fn-pure',
          name: 'readSomething',
          displayName: 'readSomething',
          inputs: [],
          stateMutability: 'pure',
          type: 'function',
          modifiesState: false,
        },
      ],
    };

    const schema: RenderFormSchema = {
      id: 'form1',
      title: 'Test form',
      functionId: 'fn-pure',
      fields: [],
      layout: { columns: 1, spacing: 'normal', labelPosition: 'top' },
      validation: { mode: 'onChange', showErrors: 'inline' },
      submitButton: { text: 'Submit', loadingText: 'Loading' },
    };

    const { container } = render(
      <TransactionForm
        schema={schema}
        contractSchema={contractSchema}
        adapter={adapter}
        isWalletConnected={false}
        executionConfig={{ method: 'eoa', allowAny: true }}
        onTransactionSuccess={onTransactionSuccess}
      />
    );

    const form = container.querySelector('form');
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(onTransactionSuccess).toHaveBeenCalledWith({
        network_id: 'sepolia',
        ecosystem: 'evm',
        execution_method: 'eoa',
      });
    });

    expect(signAndBroadcast).toHaveBeenCalled();
  });

  it('does not invoke callback when submission fails', async () => {
    const onTransactionSuccess = vi.fn();
    const signAndBroadcast = vi.fn().mockRejectedValue(new Error('boom'));

    const adapter = {
      networkConfig: {
        id: 'sepolia',
        ecosystem: 'evm',
        name: 'Sepolia',
        network: 'ethereum',
        type: 'testnet',
        isTestnet: true,
        exportConstName: 'ethereumSepolia',
        chainId: 11155111,
        rpcUrl: 'https://rpc.test',
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      },
      initialAppServiceKitName: 'rainbowkit',
      formatTransactionData: vi.fn().mockReturnValue({}),
      signAndBroadcast,
    } as unknown as ContractAdapter;

    const contractSchema: ContractSchema = {
      ecosystem: 'evm',
      address: '0x1234567890123456789012345678901234567890',
      functions: [
        {
          id: 'fn-pure',
          name: 'readSomething',
          displayName: 'readSomething',
          inputs: [],
          stateMutability: 'pure',
          type: 'function',
          modifiesState: false,
        },
      ],
    };

    const schema: RenderFormSchema = {
      id: 'form1',
      title: 'Test form',
      functionId: 'fn-pure',
      fields: [],
      layout: { columns: 1, spacing: 'normal', labelPosition: 'top' },
      validation: { mode: 'onChange', showErrors: 'inline' },
      submitButton: { text: 'Submit', loadingText: 'Loading' },
    };

    const { container } = render(
      <TransactionForm
        schema={schema}
        contractSchema={contractSchema}
        adapter={adapter}
        isWalletConnected={false}
        onTransactionSuccess={onTransactionSuccess}
      />
    );

    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => {
      expect(signAndBroadcast).toHaveBeenCalled();
    });

    expect(onTransactionSuccess).not.toHaveBeenCalled();
  });
});
