import React, { createContext, useContext, useState, useCallback } from 'react';
import { type Address, type Hex, getAddress } from 'viem';
import { useWalletClient } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { AgentWallet, ZamaConfidentialProvider } from '@zama-accounts/sdk';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { createSigner } from '../lib/createSigner';
import { BUNDLER_URL, RPC_URL, FAUCET_TOKEN_ADDRESS } from '../config/constants';

export interface WeightedBoardMember {
  privateKey: Hex;
  address: Address;
  role: string;
  weight: number;
}

export interface WeightedSavedSessionInfo {
  treasuryAddress: Address;
  boardMembers: WeightedBoardMember[];
}

const DEFAULT_BOARD: Array<{ role: string; weight: number }> = [
  { role: 'CEO', weight: 5 },
  { role: 'CFO', weight: 3 },
  { role: 'CTO', weight: 3 },
  { role: 'Member 1', weight: 1 },
  { role: 'Member 2', weight: 1 },
];

function boardKeysKey(instanceId?: string) { return instanceId ? `zama-demo-${instanceId}-weighted-board` : 'zama-ui-weighted-board-keys'; }
function treasuryKey(instanceId?: string) { return instanceId ? `zama-demo-${instanceId}-weighted-treasury` : 'zama-ui-weighted-treasury'; }
function handlesKey(instanceId?: string) { return instanceId ? `zama-demo-${instanceId}-weighted-handles` : 'zama-ui-weighted-handles'; }

function getStoredHandles(instanceId?: string): { signerHandles: Hex[]; weightHandles: Hex[] } | null {
  const stored = localStorage.getItem(handlesKey(instanceId))
    ?? (instanceId ? localStorage.getItem(handlesKey()) : null);
  if (!stored) return null;
  try { return JSON.parse(stored); } catch { return null; }
}

function storeHandles(signerHandles: Hex[], weightHandles: Hex[], instanceId?: string) {
  localStorage.setItem(handlesKey(instanceId), JSON.stringify({ signerHandles, weightHandles }));
}

function getStoredBoardMembers(instanceId?: string): WeightedBoardMember[] | null {
  const stored = localStorage.getItem(boardKeysKey(instanceId))
    ?? (instanceId ? localStorage.getItem(boardKeysKey()) : null);
  if (!stored) return null;
  try { return JSON.parse(stored); } catch { return null; }
}

function storeBoardMembers(members: WeightedBoardMember[], instanceId?: string) {
  localStorage.setItem(boardKeysKey(instanceId), JSON.stringify(members));
}

function getStoredTreasuryAddress(instanceId?: string): Address | null {
  const stored = localStorage.getItem(treasuryKey(instanceId))
    ?? (instanceId ? localStorage.getItem(treasuryKey()) : null);
  return stored as Address | null;
}

function storeTreasuryAddress(address: Address, instanceId?: string) {
  localStorage.setItem(treasuryKey(instanceId), address);
}

function nextSalt(): Hex {
  const key = 'zama-ui-salt-counter';
  const counter = parseInt(localStorage.getItem(key) ?? '0', 10) + 1;
  localStorage.setItem(key, String(counter));
  return ('0x' + counter.toString(16).padStart(64, '0')) as Hex;
}

function getSavedSession(instanceId?: string): WeightedSavedSessionInfo | null {
  const address = getStoredTreasuryAddress(instanceId);
  const members = getStoredBoardMembers(instanceId);
  if (address && members && members.length > 0) {
    return { treasuryAddress: address, boardMembers: members };
  }
  return null;
}

interface WeightedMultisigWalletContextValue {
  boardMembers: WeightedBoardMember[] | null;
  threshold: number;
  setThreshold: (t: number) => void;
  treasuryWallet: AgentWallet | null;
  signerHandles: Hex[];
  weightHandles: Hex[];
  savedSession: WeightedSavedSessionInfo | null;
  resumeSession: () => Promise<void>;
  resetSession: () => void;
  generateBoardMembers: () => WeightedBoardMember[];
  updateWeight: (index: number, weight: number) => void;
  createTreasury: () => Promise<AgentWallet>;
  connectTreasury: (address: Address) => Promise<AgentWallet>;
  setSignerHandles: (handles: Hex[]) => void;
  setWeightHandles: (handles: Hex[]) => void;
}

const WeightedMultisigWalletContext = createContext<WeightedMultisigWalletContextValue | null>(null);

export function WeightedMultisigWalletProvider({ children, instanceId }: { children: React.ReactNode; instanceId?: string }) {
  const { data: walletClient } = useWalletClient();
  const [boardMembers, setBoardMembers] = useState<WeightedBoardMember[] | null>(null);
  const [threshold, setThreshold] = useState(7);
  const [treasuryWallet, setTreasuryWallet] = useState<AgentWallet | null>(null);
  const storedHandles = getStoredHandles(instanceId);
  const [signerHandles, setSignerHandlesRaw] = useState<Hex[]>(storedHandles?.signerHandles ?? []);
  const [weightHandles, setWeightHandlesRaw] = useState<Hex[]>(storedHandles?.weightHandles ?? []);

  // Wrap setters to persist
  const setSignerHandles = useCallback((handles: Hex[]) => {
    setSignerHandlesRaw(handles);
    storeHandles(handles, weightHandles, instanceId);
  }, [weightHandles, instanceId]);

  const setWeightHandles = useCallback((handles: Hex[]) => {
    setWeightHandlesRaw(handles);
    storeHandles(signerHandles, handles, instanceId);
  }, [signerHandles, instanceId]);
  const [savedSession, setSavedSession] = useState<WeightedSavedSessionInfo | null>(() => getSavedSession(instanceId));

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

    const members = boardMembers ?? getStoredBoardMembers(instanceId);
    if (!members || members.length === 0) throw new Error('Generate board members first');

    return AgentWallet.builder()
      .chain(sepolia)
      .rpcUrl(RPC_URL)
      .signer(signer)
      .bundler({ url: BUNDLER_URL })
      .withConfidential(confidentialProvider)
      .confidentialWeightedMultisig({
        signers: members.map((m) => m.address),
        threshold,
        weights: members.map((m) => m.weight),
      });
  }, [walletClient, boardMembers, threshold]);

  const resumeSession = useCallback(async () => {
    const session = getSavedSession(instanceId);
    if (!session) throw new Error('No saved session to resume');
    setBoardMembers(session.boardMembers);
    const builder = (() => {
      if (!walletClient) throw new Error('Wallet not connected');
      const signer = createSigner(walletClient);
      const confidentialProvider = new ZamaConfidentialProvider({
        chainId: sepolia.id,
        signer: {
          address: signer.address,
          signTypedData: signer.signTypedData,
        },
      });
      return AgentWallet.builder()
        .chain(sepolia)
        .rpcUrl(RPC_URL)
        .signer(signer)
        .bundler({ url: BUNDLER_URL })
        .withConfidential(confidentialProvider)
        .confidentialWeightedMultisig({
          signers: session.boardMembers.map((m) => m.address),
          threshold,
          weights: session.boardMembers.map((m) => m.weight),
        });
    })();
    const w = await builder.connect(session.treasuryAddress);
    setTreasuryWallet(w);
    setSavedSession(null);
  }, [walletClient, threshold, instanceId]);

  const resetSession = useCallback(() => {
    localStorage.removeItem(boardKeysKey(instanceId));
    localStorage.removeItem(treasuryKey(instanceId));
    setBoardMembers(null);
    setTreasuryWallet(null);
    setSignerHandles([]);
    setWeightHandles([]);
    setSavedSession(null);
  }, [instanceId]);

  const generateBoardMembers = useCallback((): WeightedBoardMember[] => {
    localStorage.removeItem(treasuryKey(instanceId));
    setTreasuryWallet(null);
    setSignerHandles([]);
    setWeightHandles([]);
    setSavedSession(null);

    const members: WeightedBoardMember[] = DEFAULT_BOARD.map((def) => {
      const pk = generatePrivateKey();
      const account = privateKeyToAccount(pk);
      return {
        privateKey: pk,
        address: account.address as Address,
        role: def.role,
        weight: def.weight,
      };
    });
    storeBoardMembers(members, instanceId);
    setBoardMembers(members);
    return members;
  }, [instanceId]);

  const updateWeight = useCallback((index: number, weight: number) => {
    if (!boardMembers) return;
    const updated = [...boardMembers];
    updated[index] = { ...updated[index], weight };
    storeBoardMembers(updated, instanceId);
    setBoardMembers(updated);
  }, [boardMembers, instanceId]);

  const createTreasury = useCallback(async (): Promise<AgentWallet> => {
    const builder = buildWallet();
    const salt = nextSalt();
    const w = await builder.create({ salt });
    storeTreasuryAddress(w.address, instanceId);
    setTreasuryWallet(w);
    return w;
  }, [buildWallet, instanceId]);

  const connectTreasury = useCallback(async (address: Address): Promise<AgentWallet> => {
    const builder = buildWallet();
    const w = await builder.connect(address);
    storeTreasuryAddress(w.address, instanceId);
    setTreasuryWallet(w);
    return w;
  }, [buildWallet, instanceId]);

  return (
    <WeightedMultisigWalletContext.Provider
      value={{
        boardMembers,
        threshold,
        setThreshold,
        treasuryWallet,
        signerHandles,
        weightHandles,
        savedSession,
        resumeSession,
        resetSession,
        generateBoardMembers,
        updateWeight,
        createTreasury,
        connectTreasury,
        setSignerHandles,
        setWeightHandles,
      }}
    >
      {children}
    </WeightedMultisigWalletContext.Provider>
  );
}

export function useWeightedMultisigWallet() {
  const ctx = useContext(WeightedMultisigWalletContext);
  if (!ctx) throw new Error('useWeightedMultisigWallet must be used within WeightedMultisigWalletProvider');
  return ctx;
}
