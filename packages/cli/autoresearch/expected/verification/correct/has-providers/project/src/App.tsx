import { RuntimeProvider, WalletStateProvider } from '@openzeppelin/ui-react';

export function App() {
  return (
    <RuntimeProvider>
      <WalletStateProvider>
        <div>My App</div>
      </WalletStateProvider>
    </RuntimeProvider>
  );
}
