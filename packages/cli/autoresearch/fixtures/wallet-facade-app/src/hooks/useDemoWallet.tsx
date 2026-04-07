import type { Address } from 'viem';

export interface DemoWalletSession {
  owner: Address;
  status: 'idle' | 'ready';
}

export function useDemoWallet(): DemoWalletSession {
  return {
    owner: '0x0000000000000000000000000000000000000000',
    status: 'idle',
  };
}
