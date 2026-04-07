import { ConnectButton } from '@rainbow-me/rainbowkit';

export function LandingPage() {
  return (
    <section>
      <h1>Wallet Demo Router</h1>
      <p>Connect a wallet before opening the demo route.</p>
      <ConnectButton />
    </section>
  );
}
