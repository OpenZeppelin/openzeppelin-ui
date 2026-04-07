import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

export function DemoLauncher() {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  return (
    <section>
      <h2>Demo Launcher</h2>
      <p>The demo route waits for a connected wallet.</p>
      <button onClick={() => openConnectModal?.()} disabled={isConnected}>
        {isConnected ? 'Wallet Connected' : 'Connect Wallet'}
      </button>
    </section>
  );
}
