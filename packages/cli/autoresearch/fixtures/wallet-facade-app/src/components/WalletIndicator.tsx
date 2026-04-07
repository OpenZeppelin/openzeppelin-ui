import { getAddress } from 'viem';
import { useAccount } from 'wagmi';

export function WalletIndicator() {
  const { address, isConnected } = useAccount();

  return (
    <p>
      {isConnected && address ? `Connected wallet: ${getAddress(address)}` : 'Wallet not connected'}
    </p>
  );
}
