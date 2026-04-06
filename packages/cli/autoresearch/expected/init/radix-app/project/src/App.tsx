import React from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { ContractPanel } from './pages/ContractPanel';
import { TokenSettings } from './pages/TokenSettings';
import { FaqSection } from './components/FaqSection';

export function App() {
  return (
    <div className="p-6">
      <Tabs.Root defaultValue="contracts">
        <Tabs.List>
          <Tabs.Trigger value="contracts">Contracts</Tabs.Trigger>
          <Tabs.Trigger value="tokens">Token Settings</Tabs.Trigger>
          <Tabs.Trigger value="faq">FAQ</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="contracts">
          <ContractPanel />
        </Tabs.Content>
        <Tabs.Content value="tokens">
          <TokenSettings />
        </Tabs.Content>
        <Tabs.Content value="faq">
          <FaqSection />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
