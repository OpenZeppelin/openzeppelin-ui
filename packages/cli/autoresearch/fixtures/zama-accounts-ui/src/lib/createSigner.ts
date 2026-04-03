import { type WalletClient, type Address } from 'viem';
import type { AgentSigner } from '@zama-accounts/sdk';

/**
 * Create an AgentSigner from a wagmi WalletClient.
 * This adapts a wagmi WalletClient to the shape the SDK expects.
 */
export function createSigner(walletClient: WalletClient): AgentSigner {
  const account = walletClient.account;
  if (!account) throw new Error('No account connected');

  return {
    address: account.address as Address,
    signMessage: async (params: { message: string | Uint8Array }) => {
      return walletClient.signMessage({
        account,
        message: typeof params.message === 'string' ? params.message : { raw: params.message },
      });
    },
    signTypedData: async (params: Record<string, unknown>) => {
      return walletClient.signTypedData({
        account,
        ...params as Omit<Parameters<typeof walletClient.signTypedData>[0], 'account'>,
      });
    },
  };
}
