import { useCallback } from 'react';
import { getAddress, parseEther } from 'viem';
import { usePublicClient, useWalletClient } from 'wagmi';

import { createSigner } from '../lib/createSigner';

export function useWallet() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const createAccount = useCallback(async () => {
    if (!walletClient || !publicClient) {
      throw new Error('Connect a wallet before creating an account.');
    }

    const signer = createSigner(walletClient);
    const ownerAddress = getAddress(walletClient.account.address);
    localStorage.setItem('wallet-facade-owner', ownerAddress);

    return {
      ownerAddress,
      signer,
      fundingValue: parseEther('0.005'),
    };
  }, [publicClient, walletClient]);

  return { createAccount };
}
