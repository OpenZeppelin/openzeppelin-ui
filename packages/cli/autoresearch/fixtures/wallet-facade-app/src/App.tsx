import { DemoAccountSetup } from './components/DemoAccountSetup';
import { WalletIndicator } from './components/WalletIndicator';
import { useWallet } from './hooks/useWallet';

export function App() {
  const wallet = useWallet();

  return (
    <main>
      <h1>Wallet Facade Fixture</h1>
      <WalletIndicator />
      <DemoAccountSetup createAccount={wallet.createAccount} />
    </main>
  );
}
