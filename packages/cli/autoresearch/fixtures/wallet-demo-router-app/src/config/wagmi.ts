import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'viem';
import { sepolia } from 'wagmi/chains';

import { demoChains } from './networks';

export const wagmiConfig = getDefaultConfig({
  appName: 'Wallet Demo Router',
  projectId: 'fixture-project-id',
  chains: demoChains,
  transports: {
    [sepolia.id]: http('https://rpc.sepolia.example'),
  },
});
