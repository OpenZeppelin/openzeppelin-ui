import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';
import { WALLETCONNECT_PROJECT_ID, RPC_URL } from './constants';
import { http } from 'wagmi';

export const config = getDefaultConfig({
  appName: 'Confidential Smart Accounts',
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(RPC_URL),
  },
});
