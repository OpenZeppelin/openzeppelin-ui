import { ConnectButton } from '@rainbow-me/rainbowkit';

import { TxHashLink } from './TxHashLink';

export function DemoShell() {
  return (
    <section>
      <header>
        <h2>Live Demo</h2>
        <ConnectButton />
      </header>
      <p>The demo view keeps wallet controls visible while transactions run.</p>
      <TxHashLink hash="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" />
    </section>
  );
}
