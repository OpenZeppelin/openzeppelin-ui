import type { WalletClient } from 'viem';

export interface WalletSigner {
  address: string;
  signMessage(message: string): Promise<string>;
}

export function createSigner(walletClient: WalletClient): WalletSigner {
  return {
    address: walletClient.account.address,
    async signMessage(message: string) {
      return walletClient.signMessage({ message });
    },
  };
}
