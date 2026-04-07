import { useMemo } from 'react';
import { privateKeyToAccount } from 'viem/accounts';
import { useWalletClient } from 'wagmi';

export function useTreasuryWallet() {
  const { data: walletClient } = useWalletClient();

  return useMemo(() => {
    if (!walletClient) {
      return null;
    }

    return privateKeyToAccount(
      '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    );
  }, [walletClient]);
}
