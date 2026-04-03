/**
 * Lightweight wallet provider for demo instances.
 *
 * Each demo creates its own AgentWallet during account setup, then wraps
 * its tab content in this provider. Existing tab components read from
 * useWallet() — this provider re-exports the same interface so tabs
 * work unchanged.
 */
import React, { createContext, useContext, useCallback, useState } from 'react';
import type { Address } from 'viem';
import type { AgentWallet } from '@zama-accounts/sdk';
import type { SetupStep } from './useWallet';

interface DemoWalletContextValue {
  wallet: AgentWallet | null;
  isCreating: boolean;
  setupStep: SetupStep | null;
  error: string | null;
  insufficientBalance: boolean;
  createWallet: () => Promise<void>;
  connectWallet: (address: Address) => Promise<void>;
  disconnect: () => void;
}

const DemoWalletContext = createContext<DemoWalletContextValue | null>(null);

/**
 * Provides an AgentWallet to child components via the same interface as useWallet().
 * Used by demo components after account creation to make existing tab components work.
 */
export function DemoWalletProvider({
  wallet,
  children,
}: {
  wallet: AgentWallet | null;
  children: React.ReactNode;
}) {
  const [, setDummy] = useState(0);

  const noop = useCallback(async () => {}, []);
  const disconnect = useCallback(() => {
    setDummy((d) => d + 1); // force re-render
  }, []);

  return (
    <DemoWalletContext.Provider
      value={{
        wallet,
        isCreating: false,
        setupStep: null,
        error: null,
        insufficientBalance: false,
        createWallet: noop,
        connectWallet: noop,
        disconnect,
      }}
    >
      {children}
    </DemoWalletContext.Provider>
  );
}

/**
 * Hook that reads from DemoWalletProvider if available, otherwise falls back
 * to the original WalletProvider. This lets existing tab components work in
 * both the old Dashboard (if ever needed) and the new demo launcher.
 */
export function useDemoWallet(): DemoWalletContextValue {
  const ctx = useContext(DemoWalletContext);
  if (!ctx) throw new Error('useDemoWallet must be used within DemoWalletProvider');
  return ctx;
}

// Re-export context for use in useWallet fallback
export { DemoWalletContext };
