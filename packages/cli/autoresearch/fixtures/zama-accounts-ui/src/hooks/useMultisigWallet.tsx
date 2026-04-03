import React, { createContext, useContext, useState, useCallback } from 'react';
import { type Address, type Hex, getAddress } from 'viem';
import { useWalletClient } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { AgentWallet, ZamaConfidentialProvider } from '@zama-accounts/sdk';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { createSigner } from '../lib/createSigner';
import { BUNDLER_URL, RPC_URL, FAUCET_TOKEN_ADDRESS } from '../config/constants';

export interface BoardMember {
  privateKey: Hex;
  address: Address;
}

export interface SavedSessionInfo {
  treasuryAddress: Address;
  boardMembers: BoardMember[];
}

// Storage scoped by instance ID in localStorage (persistent across tab close).
// Falls back to global sessionStorage keys for backwards compatibility.
function boardKeysKey(instanceId?: string) { return instanceId ? `zama-demo-${instanceId}-multisig-board` : 'zama-ui-multisig-board-keys'; }
function treasuryKey(instanceId?: string) { return instanceId ? `zama-demo-${instanceId}-multisig-treasury` : 'zama-ui-multisig-treasury'; }
function handlesKey(instanceId?: string) { return instanceId ? `zama-demo-${instanceId}-multisig-handles` : 'zama-ui-multisig-handles'; }

function getStoredSignerHandles(instanceId?: string): Hex[] | null {
  const stored = localStorage.getItem(handlesKey(instanceId));
  if (!stored) return null;
  try { return JSON.parse(stored); } catch { return null; }
}

function storeSignerHandles(handles: Hex[], instanceId?: string) {
  localStorage.setItem(handlesKey(instanceId), JSON.stringify(handles));
}

function getStoredBoardMembers(instanceId?: string): BoardMember[] | null {
  const stored = localStorage.getItem(boardKeysKey(instanceId))
    ?? (instanceId ? localStorage.getItem(boardKeysKey()) : null);
  if (!stored) return null;
  try { return JSON.parse(stored); } catch { return null; }
}

function storeBoardMembers(members: BoardMember[], instanceId?: string) {
  localStorage.setItem(boardKeysKey(instanceId), JSON.stringify(members));
}

function getStoredTreasuryAddress(instanceId?: string): Address | null {
  const stored = localStorage.getItem(treasuryKey(instanceId));
  return stored as Address | null;
}

function storeTreasuryAddress(address: Address, instanceId?: string) {
  localStorage.setItem(treasuryKey(instanceId), address);
}

/** Generate a unique bytes32 salt from an auto-incrementing counter in localStorage. */
function nextSalt(): Hex {
  const key = 'zama-ui-salt-counter';
  const counter = parseInt(localStorage.getItem(key) ?? '0', 10) + 1;
  localStorage.setItem(key, String(counter));
  return ('0x' + counter.toString(16).padStart(64, '0')) as Hex;
}

function getSavedSession(instanceId?: string): SavedSessionInfo | null {
  const address = getStoredTreasuryAddress(instanceId);
  const members = getStoredBoardMembers(instanceId);
  if (address && members && members.length > 0) {
    return { treasuryAddress: address, boardMembers: members };
  }
  return null;
}

interface MultisigWalletContextValue {
  boardMembers: BoardMember[] | null;
  threshold: number;
  setThreshold: (t: number) => void;
  treasuryWallet: AgentWallet | null;
  signerHandles: Hex[];
  savedSession: SavedSessionInfo | null;
  resumeSession: () => Promise<void>;
  resetSession: () => void;
  generateBoardMembers: (count?: number) => BoardMember[];
  createTreasury: () => Promise<AgentWallet>;
  connectTreasury: (address: Address) => Promise<AgentWallet>;
  setSignerHandles: (handles: Hex[]) => void;
}

const MultisigWalletContext = createContext<MultisigWalletContextValue | null>(null);

export function MultisigWalletProvider({ children, instanceId }: { children: React.ReactNode; instanceId?: string }) {
  const { data: walletClient } = useWalletClient();
  const [boardMembers, setBoardMembers] = useState<BoardMember[] | null>(null);
  const [threshold, setThreshold] = useState(2);
  const [treasuryWallet, setTreasuryWallet] = useState<AgentWallet | null>(null);
  const [signerHandles, setSignerHandlesRaw] = useState<Hex[]>(getStoredSignerHandles(instanceId) ?? []);

  const setSignerHandles = useCallback((handles: Hex[]) => {
    setSignerHandlesRaw(handles);
    storeSignerHandles(handles, instanceId);
  }, [instanceId]);
  const [savedSession, setSavedSession] = useState<SavedSessionInfo | null>(() => getSavedSession(instanceId));

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
      .confidentialMultisig({
        signers: members.map((m) => m.address),
        threshold,
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
        .confidentialMultisig({
          signers: session.boardMembers.map((m) => m.address),
          threshold,
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
    setSavedSession(null);
  }, [instanceId]);

  const generateBoardMembers = useCallback((count = 3): BoardMember[] => {
    localStorage.removeItem(treasuryKey(instanceId));
    setTreasuryWallet(null);
    setSignerHandles([]);
    setSavedSession(null);

    const members: BoardMember[] = [];
    for (let i = 0; i < count; i++) {
      const pk = generatePrivateKey();
      const account = privateKeyToAccount(pk);
      members.push({ privateKey: pk, address: account.address as Address });
    }
    storeBoardMembers(members, instanceId);
    setBoardMembers(members);
    return members;
  }, [instanceId]);

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
    <MultisigWalletContext.Provider
      value={{
        boardMembers,
        threshold,
        setThreshold,
        treasuryWallet,
        signerHandles,
        savedSession,
        resumeSession,
        resetSession,
        generateBoardMembers,
        createTreasury,
        connectTreasury,
        setSignerHandles,
      }}
    >
      {children}
    </MultisigWalletContext.Provider>
  );
}

export function useMultisigWallet() {
  const ctx = useContext(MultisigWalletContext);
  if (!ctx) throw new Error('useMultisigWallet must be used within MultisigWalletProvider');
  return ctx;
}
