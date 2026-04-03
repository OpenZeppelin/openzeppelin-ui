import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { type Address, type Hex, parseEther, getAddress } from 'viem';
import { useWalletClient, usePublicClient } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { AgentWallet, ZamaConfidentialProvider } from '@zama-accounts/sdk';
import { createSigner } from '../lib/createSigner';
import { BUNDLER_URL, RPC_URL, FAUCET_TOKEN_ADDRESS, ACCOUNT_FUNDING_AMOUNT } from '../config/constants';
import { DemoWalletContext } from './useDemoWallet';

/** Generate a unique bytes32 salt from current timestamp in milliseconds. */
function nextSalt(): Hex {
  return ('0x' + Date.now().toString(16).padStart(64, '0')) as Hex;
}

export type SetupStep = 'predict' | 'fund' | 'deploy' | 'done';

interface WalletContextValue {
  wallet: AgentWallet | null;
  isCreating: boolean;
  setupStep: SetupStep | null;
  error: string | null;
  insufficientBalance: boolean;
  createWallet: () => Promise<void>;
  connectWallet: (address: Address) => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [wallet, setWallet] = useState<AgentWallet | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [setupStep, setSetupStep] = useState<SetupStep | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [insufficientBalance, setInsufficientBalance] = useState(false);

  const buildWallet = useCallback(() => {
    if (!walletClient) throw new Error('Wallet not connected');
    const signer = createSigner(walletClient);

    const confidentialProvider = new ZamaConfidentialProvider({
      chainId: sepolia.id,
      signer: {
        address: signer.address,
        signTypedData: signer.signTypedData,
      },
    });

    return {
      signer,
      builder: AgentWallet.builder()
        .chain(sepolia)
        .rpcUrl(RPC_URL)
        .signer(signer)
        .bundler({ url: BUNDLER_URL })
        .withConfidential(confidentialProvider),
    };
  }, [walletClient]);

  const fundAccount = useCallback(
    async (predictedAddress: Address) => {
      if (!walletClient || !publicClient) return;
      const fundingAmount = parseEther(ACCOUNT_FUNDING_AMOUNT);

      // Check if the user's wallet has enough ETH
      const userBalance = await publicClient.getBalance({ address: walletClient.account!.address });
      if (userBalance < fundingAmount) {
        setInsufficientBalance(true);
        throw new Error(`Insufficient balance. You need at least ${ACCOUNT_FUNDING_AMOUNT} Sepolia ETH.`);
      }

      const balance = await publicClient.getBalance({ address: predictedAddress });
      if (balance < parseEther('0.001')) {
        const hash = await walletClient.sendTransaction({
          account: walletClient.account!,
          to: predictedAddress,
          value: fundingAmount,
          chain: sepolia,
        });
        await publicClient.waitForTransactionReceipt({ hash });
      }
    },
    [walletClient, publicClient],
  );

  const createWallet = useCallback(async () => {
    setIsCreating(true);
    setError(null);
    setInsufficientBalance(false);
    setSetupStep('predict');
    try {
      const { builder } = buildWallet();

      setSetupStep('predict');
      const salt = nextSalt();
      const w = await builder.create({ salt });

      setSetupStep('fund');
      await fundAccount(w.address);

      setSetupStep('deploy');
      await w.ensureDecryptionDelegation(getAddress(FAUCET_TOKEN_ADDRESS));
      setSetupStep('done');

      // Save to localStorage
      const saved: Array<{ address: string; createdAt: number; ownerEOA?: string }> = JSON.parse(
        localStorage.getItem('zama-ui-accounts') || '[]',
      );
      if (!saved.some((a) => a.address.toLowerCase() === w.address.toLowerCase())) {
        saved.push({ address: w.address, createdAt: Date.now(), ownerEOA: walletClient!.account!.address });
        localStorage.setItem('zama-ui-accounts', JSON.stringify(saved));
      }

      await new Promise((r) => setTimeout(r, 600));
      setWallet(w);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSetupStep(null);
    } finally {
      setIsCreating(false);
    }
  }, [buildWallet, fundAccount]);

  const connectWallet = useCallback(
    async (address: Address) => {
      setIsCreating(true);
      setError(null);
      setInsufficientBalance(false);
      try {
        const { builder } = buildWallet();
        const w = await builder.connect(address);

        // Save to localStorage (or backfill ownerEOA on existing entries)
        const saved: Array<{ address: string; createdAt: number; ownerEOA?: string }> = JSON.parse(
          localStorage.getItem('zama-ui-accounts') || '[]',
        );
        const existing = saved.find((a) => a.address.toLowerCase() === w.address.toLowerCase());
        if (existing) {
          if (!existing.ownerEOA) {
            existing.ownerEOA = walletClient!.account!.address;
            localStorage.setItem('zama-ui-accounts', JSON.stringify(saved));
          }
        } else {
          saved.push({ address: w.address, createdAt: Date.now(), ownerEOA: walletClient!.account!.address });
          localStorage.setItem('zama-ui-accounts', JSON.stringify(saved));
        }

        setWallet(w);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setIsCreating(false);
      }
    },
    [buildWallet],
  );

  const disconnect = useCallback(() => {
    setWallet(null);
    setError(null);
    setSetupStep(null);
    setInsufficientBalance(false);
  }, []);

  // Auto-reconnect wallet when connected account changes
  const prevAccountRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const currentAccount = walletClient?.account?.address;
    if (!currentAccount || !wallet) return;
    if (prevAccountRef.current && prevAccountRef.current !== currentAccount) {
      connectWallet(wallet.address);
    }
    prevAccountRef.current = currentAccount;
  }, [walletClient?.account?.address, wallet, connectWallet]);

  return (
    <WalletContext.Provider
      value={{ wallet, isCreating, setupStep, error, insufficientBalance, createWallet, connectWallet, disconnect }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  // DemoWalletContext takes priority — allows existing tabs to work inside demo launcher.
  // Both useContext calls always run (React hook rules), but only one will be non-null.
  const demoCtx = useContext(DemoWalletContext);
  const ctx = useContext(WalletContext);
  if (demoCtx) return demoCtx;
  if (ctx) return ctx;
  throw new Error('useWallet must be used within WalletProvider or DemoWalletProvider');
}
