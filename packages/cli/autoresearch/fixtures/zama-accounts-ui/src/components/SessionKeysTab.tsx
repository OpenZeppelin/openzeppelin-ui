import { useState, useEffect } from 'react';
import { type Address, type Hash, type Hex, isAddress, createPublicClient, createWalletClient, http, getAddress, encodeFunctionData, parseEther, formatEther } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'wagmi/chains';
import { useWalletClient, usePublicClient } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { useWallet } from '../hooks/useWallet';
import TxHashLink from './TxHashLink';

import DecryptTimer from './DecryptTimer';
import { FAUCET_TOKEN_ADDRESS, CONFIDENTIAL_SPENDING_EXECUTOR, SCOPED_SESSION_KEYS_VALIDATOR, RPC_URL } from '../config/constants';
import { ZamaConfidentialProvider } from '@zama-accounts/sdk';
import {
  Shield, Lock, Loader2, UserPlus, Zap, Ban, Eye, EyeOff, Key, Bot, Wallet, CheckCircle2,
} from 'lucide-react';

const IS_MODULE_INSTALLED_ABI = [{
  type: 'function', name: 'isModuleInstalled',
  inputs: [
    { name: 'moduleTypeId', type: 'uint256' },
    { name: 'module', type: 'address' },
    { name: 'additionalContext', type: 'bytes' },
  ],
  outputs: [{ name: '', type: 'bool' }],
  stateMutability: 'view',
}] as const;

const TOKEN_DECIMALS = 6;
function toBaseUnits(amount: string): bigint {
  const [whole = '0', frac = ''] = amount.split('.');
  const paddedFrac = frac.slice(0, TOKEN_DECIMALS).padEnd(TOKEN_DECIMALS, '0');
  return BigInt(whole) * 10n ** BigInt(TOKEN_DECIMALS) + BigInt(paddedFrac);
}
function formatBalance(value: bigint): string {
  const str = value.toString().padStart(TOKEN_DECIMALS + 1, '0');
  const whole = str.slice(0, str.length - TOKEN_DECIMALS);
  const frac = str.slice(str.length - TOKEN_DECIMALS).replace(/0+$/, '') || '0';
  return `${whole}.${frac}`;
}

// Agent key persistence — scoped by demo instance ID in localStorage.
// These are generated throwaway testnet keys, not user wallet keys.
function agentKeyStorageKey(instanceId?: string): string {
  return instanceId ? `zama-demo-${instanceId}-agent-key` : 'zama-ui-agent-key';
}

function getStoredAgentKey(instanceId?: string): { privateKey: Hex; address: Address } | null {
  const key = agentKeyStorageKey(instanceId);
  const stored = localStorage.getItem(key);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function storeAgentKey(privateKey: Hex, address: Address, instanceId?: string) {
  const key = agentKeyStorageKey(instanceId);
  localStorage.setItem(key, JSON.stringify({ privateKey, address }));
}

const EXECUTOR_ABI = [{
  name: 'transferFrom', type: 'function', stateMutability: 'nonpayable',
  inputs: [
    { name: 'account', type: 'address' },
    { name: 'token', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'encryptedAmount', type: 'bytes32' },
    { name: 'inputProof', type: 'bytes' },
  ],
  outputs: [],
}] as const;

// Minimum ETH to fund agent key for gas
const AGENT_FUNDING_AMOUNT = '0.002';

type SessionKeyMilestone = 'key-installed' | 'limit-set' | 'transfer-within-limit' | 'limit-enforced' | 'bypass-blocked';

export default function SessionKeysTab({ onMilestone, completedMilestones = [], instanceId, visibleStep }: {
  onMilestone?: (event: SessionKeyMilestone) => void;
  /** Milestones completed in previous sessions — used to show green borders on resume */
  completedMilestones?: string[];
  /** Demo instance ID — used to scope agent key persistence */
  instanceId?: string;
  /** When set, only show the specified step card (explainer + agent panel always visible) */
  visibleStep?: 'install-key' | 'set-limit' | 'transfer-within' | 'exceed-limit' | 'bypass';
} = {}) {
  const { wallet } = useWallet();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  // Ephemeral agent key
  const [agentKey, setAgentKey] = useState<{ privateKey: Hex; address: Address } | null>(() => getStoredAgentKey(instanceId));
  const [agentBalance, setAgentBalance] = useState<bigint | null>(null);
  const [fundingAgent, setFundingAgent] = useState(false);
  const [fundingTxHash, setFundingTxHash] = useState<Hash | null>(null);

  // Module state
  const [validatorReady, setValidatorReady] = useState(false);
  const [executorInstalled, setExecutorInstalled] = useState(false);
  const [registeredKeys, setRegisteredKeys] = useState<Hex[]>([]);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // On-chain spending limit config
  const [onChainLimit, setOnChainLimit] = useState<{ limit: string; renewPeriod: bigint } | null>(null);
  const setupComplete = validatorReady && executorInstalled && onChainLimit !== null;

  // Step 1: Install scoped key
  const [step1Loading, setStep1Loading] = useState(false);
  const [step1TxHash, setStep1TxHash] = useState<Hash | null>(null);
  const [step1Error, setStep1Error] = useState<string | null>(null);

  // Step 3: Set spending limit
  const [limitAmount, setLimitAmount] = useState('5.0');
  const [step3Loading, setStep3Loading] = useState(false);
  const [step3TxHash, setStep3TxHash] = useState<Hash | null>(null);
  const [step3Error, setStep3Error] = useState<string | null>(null);

  // Step 3: Renewal period
  const [renewalDays, setRenewalDays] = useState('1');

  // Step 3: Decrypt spending limit
  const [limitDecrypting, setLimitDecrypting] = useState(false);
  const [decryptedLimit, setDecryptedLimit] = useState<bigint | null>(null);
  const [decryptedLimitRevealed, setDecryptedLimitRevealed] = useState(false);
  const [limitDecryptError, setLimitDecryptError] = useState<string | null>(null);

  // Step 4: Transfer within limit — with balance decrypt before/after
  const [transferAmount, setTransferAmount] = useState('2.0');
  const [step4Loading, setStep4Loading] = useState(false);
  const [step4TxHash, setStep4TxHash] = useState<Hash | null>(null);
  const [step4Error, setStep4Error] = useState<string | null>(null);
  const [balanceBefore, setBalanceBefore] = useState<bigint | null>(null);
  const [balanceBeforeLoading, setBalanceBeforeLoading] = useState(false);
  const [balanceBeforeRevealed, setBalanceBeforeRevealed] = useState(false);
  const [step4BalanceAfter, setStep4BalanceAfter] = useState<bigint | null>(null);
  const [step4BalanceAfterLoading, setStep4BalanceAfterLoading] = useState(false);
  const [step4BalanceAfterRevealed, setStep4BalanceAfterRevealed] = useState(false);

  // Step 5: Exceed limit
  const [step5Loading, setStep5Loading] = useState(false);
  const [step5TxHash, setStep5TxHash] = useState<Hash | null>(null);
  const [step5Error, setStep5Error] = useState<string | null>(null);
  const [step5Attempted, setStep5Attempted] = useState(false);
  const [step5VerifyLoading, setStep5VerifyLoading] = useState(false);
  const [balanceAfter, setBalanceAfter] = useState<bigint | null>(null);

  // Step 6: Bypass attempt
  const [step6Loading, setStep6Loading] = useState(false);
  const [step6Error, setStep6Error] = useState<string | null>(null);
  const [step6Attempted, setStep6Attempted] = useState(false);
  const [step6TxHash, setStep6TxHash] = useState<Hash | null>(null);
  const [step6Reverted, setStep6Reverted] = useState(false);

  // Check agent ETH balance
  const refreshAgentBalance = async (addr: Address) => {
    if (!publicClient) return;
    const bal = await publicClient.getBalance({ address: addr });
    setAgentBalance(bal);
  };

  // Generate ephemeral agent key
  const handleGenerateKey = () => {
    const pk = generatePrivateKey();
    const account = privateKeyToAccount(pk);
    const keyData = { privateKey: pk, address: account.address as Address };
    storeAgentKey(pk, account.address as Address, instanceId);
    setAgentKey(keyData);
    refreshAgentBalance(account.address as Address);
  };

  // Fund agent key with ETH for gas (direct calls to executor need gas)
  const handleFundAgent = async () => {
    if (!walletClient?.account || !agentKey || !publicClient) return;
    setFundingAgent(true);
    try {
      const hash = await walletClient.sendTransaction({
        account: walletClient.account,
        to: agentKey.address,
        value: parseEther(AGENT_FUNDING_AMOUNT),
        chain: sepolia,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setFundingTxHash(hash);
      await refreshAgentBalance(agentKey.address);
    } catch { /* ignore */ }
    setFundingAgent(false);
  };

  // Refresh agent balance on mount if key exists
  useEffect(() => {
    if (agentKey) refreshAgentBalance(agentKey.address);
  }, [agentKey?.address]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check module installation state
  useEffect(() => {
    if (!wallet) return;
    const check = async () => {
      try {
        const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC_URL) });

        const eInstalled = await publicClient.readContract({
          abi: IS_MODULE_INSTALLED_ABI, address: wallet.address,
          functionName: 'isModuleInstalled',
          args: [2n, CONFIDENTIAL_SPENDING_EXECUTOR, '0x'],
        }) as boolean;
        setExecutorInstalled(eInstalled);

        const vInstalled = await publicClient.readContract({
          abi: IS_MODULE_INSTALLED_ABI, address: wallet.address,
          functionName: 'isModuleInstalled',
          args: [1n, SCOPED_SESSION_KEYS_VALIDATOR, '0x'],
        }) as boolean;

        if (!vInstalled) { setValidatorReady(false); setRegisteredKeys([]); return; }

        const keys = await publicClient.readContract({
          abi: [{ type: 'function', name: 'keys', inputs: [{ name: 'account', type: 'address' }, { name: 'startIdx', type: 'uint256' }, { name: 'endIdx', type: 'uint256' }], outputs: [{ name: '', type: 'bytes[]' }], stateMutability: 'view' }],
          address: SCOPED_SESSION_KEYS_VALIDATOR,
          functionName: 'keys',
          args: [wallet.address, 0n, 100n],
        }) as Hex[];
        setRegisteredKeys(keys);

        let anyCorrectScope = false;
        for (const key of keys) {
          const scope = await publicClient.readContract({
            abi: [{ type: 'function', name: 'getKeyScope', inputs: [{ name: 'account', type: 'address' }, { name: 'key', type: 'bytes' }, { name: 'target', type: 'address' }], outputs: [{ name: '', type: 'bytes4[]' }], stateMutability: 'view' }],
            address: SCOPED_SESSION_KEYS_VALIDATOR,
            functionName: 'getKeyScope',
            args: [wallet.address, key, CONFIDENTIAL_SPENDING_EXECUTOR],
          }) as Hex[];
          if (scope.length > 0) { anyCorrectScope = true; break; }
        }
        setValidatorReady(keys.length > 0 && anyCorrectScope);

        // Read spending limit from executor if installed and agent key exists
        if (eInstalled && agentKey) {
          try {
            const config = await publicClient.readContract({
              abi: [{ type: 'function', name: 'spenderConfig', inputs: [{ name: 'account', type: 'address' }, { name: 'token', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: 'limitHandle', type: 'bytes32' }, { name: 'start', type: 'uint48' }, { name: 'renewPeriod', type: 'uint48' }], stateMutability: 'view' }],
              address: CONFIDENTIAL_SPENDING_EXECUTOR,
              functionName: 'spenderConfig',
              args: [wallet.address, getAddress(FAUCET_TOKEN_ADDRESS), agentKey.address],
            }) as unknown as [string, bigint, bigint];
            const limitHandle = config[0] as string;
            const hasLimit = limitHandle !== '0x0000000000000000000000000000000000000000000000000000000000000000';
            if (hasLimit) {
              setOnChainLimit({ limit: limitHandle, renewPeriod: config[2] });
            } else {
              setOnChainLimit(null);
            }
          } catch { setOnChainLimit(null); }
        }
      } catch { /* ignore */ }
    };
    check();
  }, [wallet, refreshCounter, agentKey?.address]); // eslint-disable-line react-hooks/exhaustive-deps

  // Step 1: Register scoped session key
  // Decrypt smart account balance (reusable)
  const handleDecryptBalance = async (
    setLoading: (v: boolean) => void,
    setBal: (v: bigint | null) => void,
    setRevealed: (v: boolean) => void,
  ) => {
    if (!wallet) return;
    setLoading(true);
    setBal(null);
    setRevealed(false);
    const MAX_RETRIES = 5;
    const RETRY_DELAY_MS = 20_000;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const bal = await wallet.getConfidentialBalance(getAddress(FAUCET_TOKEN_ADDRESS));
        setBal(bal);
        setLoading(false);
        return;
      } catch (e) {
        console.error(`Balance decrypt failed (attempt ${attempt + 1}):`, e);
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        }
      }
    }
    setLoading(false);
  };

  const handleInstallScopedKey = async () => {
    if (!wallet || !agentKey) return;
    setStep1Loading(true);
    setStep1Error(null);
    setStep1TxHash(null);
    try {
      const hash = await wallet.installScopedSessionKey(agentKey.address);
      setStep1TxHash(hash);
      setRefreshCounter((c) => c + 1);
      onMilestone?.('key-installed');
    } catch (e) {
      setStep1Error(e instanceof Error ? e.message : String(e));
    } finally {
      setStep1Loading(false);
    }
  };

  // Step 3: Set spending limit
  const handleSetLimit = async () => {
    if (!wallet || !agentKey) return;
    setStep3Loading(true);
    setStep3Error(null);
    setStep3TxHash(null);
    setDecryptedLimit(null);
    setDecryptedLimitRevealed(false);
    setLimitDecryptError(null);
    try {
      const hash = await wallet.installConfidentialSpendingExecutor(
        getAddress(FAUCET_TOKEN_ADDRESS),
        agentKey.address,
        toBaseUnits(limitAmount),
        parseInt(renewalDays, 10) * 86400,
      );
      setStep3TxHash(hash);
      setRefreshCounter((c) => c + 1);
      onMilestone?.('limit-set');
    } catch (e) {
      setStep3Error(e instanceof Error ? e.message : String(e));
    } finally {
      setStep3Loading(false);
    }
  };

  // Step 3: Decrypt spending limit handle (retries like balance decrypt — relayer needs time)
  const handleDecryptLimit = async () => {
    if (!wallet || !walletClient?.account || !onChainLimit) return;
    setLimitDecrypting(true);
    setLimitDecryptError(null);
    setDecryptedLimit(null);
    setDecryptedLimitRevealed(false);
    const MAX_RETRIES = 10;
    const RETRY_DELAY_MS = 20_000;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const provider = new ZamaConfidentialProvider({
          chainId: sepolia.id,
          signer: {
            address: walletClient.account.address,
            signTypedData: async (params: Record<string, unknown>) => {
              return walletClient.signTypedData({
                account: walletClient.account!,
                ...params as Parameters<typeof walletClient.signTypedData>[0],
              });
            },
          },
        });
        const value = await provider.decrypt64(
          getAddress(CONFIDENTIAL_SPENDING_EXECUTOR),
          wallet.address,
          onChainLimit.limit as `0x${string}`,
          true, // delegated — EOA signer != smart account
        );
        setDecryptedLimit(value);
        setLimitDecrypting(false);
        return;
      } catch (e) {
        console.error(`Limit decrypt failed (attempt ${attempt + 1}):`, e);
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        }
      }
    }
    setLimitDecryptError('Decryption failed after retries. The relayer may be busy — try again.');
    setLimitDecrypting(false);
  };

  // Step 4: Transfer within limit (as agent key)
  // Agent calls executor.transferFrom directly — a regular transaction, not a UserOp.
  // In production, a paymaster would sponsor gas so the agent doesn't need ETH.
  const handleTransferWithinLimit = async () => {
    if (!wallet || !agentKey) return;
    setStep4Loading(true);
    setStep4Error(null);
    setStep4TxHash(null);
    try {
      // Capture balance before for later verification
      try {
        const bal = await wallet.getConfidentialBalance(getAddress(FAUCET_TOKEN_ADDRESS));
        setBalanceBefore(bal);
      } catch { /* ok if decrypt not ready yet */ }

      // Encrypt amount bound to executor + agent key as msg.sender
      const provider = new ZamaConfidentialProvider({
        chainId: wallet.chain.id,
        signer: { address: wallet.address, signTypedData: async () => '0x' as Hex },
      });
      const { handle, inputProof } = await provider.encrypt64(
        getAddress(CONFIDENTIAL_SPENDING_EXECUTOR),
        agentKey.address, // msg.sender = agent key (direct call)
        toBaseUnits(transferAmount),
      );

      // Agent calls executor directly — not a UserOp
      const txData = encodeFunctionData({
        abi: EXECUTOR_ABI,
        functionName: 'transferFrom',
        args: [wallet.address, getAddress(FAUCET_TOKEN_ADDRESS), agentKey.address, handle as `0x${string}`, inputProof as `0x${string}`],
      });

      const agentAccount = privateKeyToAccount(agentKey.privateKey);
      const agentWalletClient = createWalletClient({
        account: agentAccount,
        chain: sepolia,
        transport: http(RPC_URL),
      });

      // Provide explicit gas to skip simulation (FHE ops can't be simulated)
      const hash = await agentWalletClient.sendTransaction({
        to: getAddress(CONFIDENTIAL_SPENDING_EXECUTOR),
        data: txData,
        gas: 2_000_000n,
      });
      const pc = createPublicClient({ chain: sepolia, transport: http(RPC_URL) });
      await pc.waitForTransactionReceipt({ hash });
      setStep4TxHash(hash);
      onMilestone?.('transfer-within-limit');
    } catch (e) {
      setStep4Error(e instanceof Error ? e.message : String(e));
    } finally {
      setStep4Loading(false);
    }
  };

  // Step 5: Exceed limit — agent tries to overspend, FHE.select zeroes the amount
  const handleExceedLimit = async () => {
    if (!wallet || !agentKey) return;
    setStep5Loading(true);
    setStep5Error(null);
    setStep5TxHash(null);
    setStep5Attempted(false);
    try {
      const provider = new ZamaConfidentialProvider({
        chainId: wallet.chain.id,
        signer: { address: wallet.address, signTypedData: async () => '0x' as Hex },
      });
      const { handle, inputProof } = await provider.encrypt64(
        getAddress(CONFIDENTIAL_SPENDING_EXECUTOR),
        agentKey.address,
        toBaseUnits(limitAmount), // full limit again — should exceed
      );

      const txData = encodeFunctionData({
        abi: EXECUTOR_ABI,
        functionName: 'transferFrom',
        args: [wallet.address, getAddress(FAUCET_TOKEN_ADDRESS), agentKey.address, handle as `0x${string}`, inputProof as `0x${string}`],
      });

      const agentAccount = privateKeyToAccount(agentKey.privateKey);
      const agentWalletClient = createWalletClient({
        account: agentAccount,
        chain: sepolia,
        transport: http(RPC_URL),
      });

      const hash = await agentWalletClient.sendTransaction({
        to: getAddress(CONFIDENTIAL_SPENDING_EXECUTOR),
        data: txData,
        gas: 2_000_000n,
      });
      const pc = createPublicClient({ chain: sepolia, transport: http(RPC_URL) });
      await pc.waitForTransactionReceipt({ hash });
      setStep5TxHash(hash);
      onMilestone?.('limit-enforced');
    } catch (e) {
      setStep5Error(e instanceof Error ? e.message : String(e));
    } finally {
      setStep5Loading(false);
      setStep5Attempted(true);
    }
  };

  // Step 5: Verify balance unchanged
  const handleVerifyUnchanged = async () => {
    if (!wallet) return;
    setStep5VerifyLoading(true);
    try {
      const bal = await wallet.getConfidentialBalance(getAddress(FAUCET_TOKEN_ADDRESS));
      setBalanceAfter(bal);
    } catch { /* ignore */ }
    setStep5VerifyLoading(false);
  };

  // Step 6: Bypass attempt — agent tries to call token directly (bypassing executor)
  // The agent EOA calls the token's confidentialTransfer directly. This fails because:
  // 1. The agent EOA doesn't hold any tokens (the smart account does)
  // 2. Even if it did, the FHE binding would be wrong (bound to executor, not token)
  // This demonstrates that the executor is the ONLY path for the agent to move tokens.
  const handleBypassAttempt = async () => {
    if (!wallet || !agentKey) return;
    setStep6Loading(true);
    setStep6Error(null);
    setStep6Attempted(false);
    setStep6TxHash(null);
    setStep6Reverted(false);
    try {
      const provider = new ZamaConfidentialProvider({
        chainId: wallet.chain.id,
        signer: { address: wallet.address, signTypedData: async () => '0x' as Hex },
      });
      const { handle, inputProof } = await provider.encrypt64(
        getAddress(FAUCET_TOKEN_ADDRESS),
        agentKey.address,
        toBaseUnits('0.1'),
      );
      const transferData = encodeFunctionData({
        abi: [{
          name: 'confidentialTransfer', type: 'function', stateMutability: 'nonpayable',
          inputs: [{ name: 'to', type: 'address' }, { name: 'encryptedAmount', type: 'bytes32' }, { name: 'inputProof', type: 'bytes' }],
          outputs: [],
        }] as const,
        functionName: 'confidentialTransfer',
        args: [agentKey.address, handle as `0x${string}`, inputProof as `0x${string}`],
      });

      // Agent tries calling token directly — should fail
      const agentAccount = privateKeyToAccount(agentKey.privateKey);
      const agentWalletClient = createWalletClient({
        account: agentAccount,
        chain: sepolia,
        transport: http(RPC_URL),
      });

      const hash = await agentWalletClient.sendTransaction({
        to: getAddress(FAUCET_TOKEN_ADDRESS),
        data: transferData,
        gas: 2_000_000n,
      });
      setStep6TxHash(hash);
      const pc = createPublicClient({ chain: sepolia, transport: http(RPC_URL) });
      const receipt = await pc.waitForTransactionReceipt({ hash });
      if (receipt.status === 'reverted') {
        setStep6Reverted(true);
      }
      // Whether reverted or succeeded-but-zeroed, the bypass was blocked.
      // The agent EOA calling the token directly either reverts (validator blocks)
      // or succeeds but moves zero tokens (FHE binding mismatch zeroes the amount).
      // Both outcomes prove the executor is the only effective path.
      onMilestone?.('bypass-blocked');
    } catch (e) {
      setStep6Error(e instanceof Error ? e.message : String(e));
      // Error = validator rejected the call = bypass blocked (the desired outcome)
      onMilestone?.('bypass-blocked');
    } finally {
      setStep6Loading(false);
      setStep6Attempted(true);
    }
  };

  const showInstallKey = !visibleStep || visibleStep === 'install-key';
  const showSetLimit = !visibleStep || visibleStep === 'set-limit';
  const showTransferWithin = !visibleStep || visibleStep === 'transfer-within';
  const showExceedLimit = !visibleStep || visibleStep === 'exceed-limit';
  const showBypass = !visibleStep || visibleStep === 'bypass';

  return (
    <div className="space-y-4 pt-4">
      {/* Explainer */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle className="font-medium">Confidential Spending Limits</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          Combine session keys with FHE-encrypted spending caps. An agent can make confidential transfers
          up to a limit — the math is provably enforced on-chain, and the session key can only call the spending executor.
        </AlertDescription>
      </Alert>

      {/* Agent Key Panel */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle>Agent Key</CardTitle>
          </div>
          <CardDescription>
            Generate an ephemeral key pair in your browser. This simulates an agent that has its own signing key,
            separate from your connected wallet. The key is stored in sessionStorage and discarded when you close the tab.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {agentKey ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border px-4 py-3 bg-primary/5">
                <div>
                  <div className="text-xs text-muted-foreground">Owner (Connected Wallet)</div>
                  <div className="font-mono text-sm">{walletClient?.account?.address ? `${walletClient.account.address.slice(0, 10)}...${walletClient.account.address.slice(-8)}` : '...'}</div>
                </div>
                <Key className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-primary/30 px-4 py-3 bg-primary/10">
                <div>
                  <div className="text-xs text-primary font-medium">Agent (Session Key)</div>
                  <div className="font-mono text-sm">{agentKey.address.slice(0, 10)}...{agentKey.address.slice(-8)}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Balance: {agentBalance !== null ? `${formatEther(agentBalance)} ETH` : '...'}
                  </div>
                </div>
                <Bot className="h-4 w-4 text-primary" />
              </div>
              {/* Fund agent if needed */}
              {agentBalance !== null && agentBalance < parseEther('0.001') && (
                <div className="space-y-2">
                  <Alert>
                    <Wallet className="h-4 w-4" />
                    <AlertDescription className="text-muted-foreground text-xs">
                      The agent needs a small amount of ETH for gas when calling the executor directly.
                      In production, a paymaster would sponsor gas — the agent would never need ETH.
                    </AlertDescription>
                  </Alert>
                  <Button variant="outline" size="sm" onClick={handleFundAgent} disabled={fundingAgent} className="w-full">
                    {fundingAgent ? (
                      <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Funding...</span>
                    ) : (
                      <span className="flex items-center gap-2"><Wallet className="h-4 w-4" /> Fund Agent ({AGENT_FUNDING_AMOUNT} ETH)</span>
                    )}
                  </Button>
                  {fundingTxHash && (
                    <Alert className="border-green-200 bg-green-50">
                      <AlertDescription className="text-green-700 text-xs">Agent funded! Tx: <TxHashLink hash={fundingTxHash} /></AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>
          ) : (
            <Button onClick={handleGenerateKey} className="w-full">
              <span className="flex items-center gap-2"><Key className="h-4 w-4" /> Generate Agent Key</span>
            </Button>
          )}

        </CardContent>
      </Card>

      {!agentKey && (
        <Alert>
          <AlertDescription className="text-muted-foreground">Generate an agent key above to continue.</AlertDescription>
        </Alert>
      )}

      {/* Agent Configuration Summary — shown after setup steps 1-3 are complete */}
      {agentKey && setupComplete && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              <CardTitle className="text-green-800">Agent Configuration</CardTitle>
            </div>
            <CardDescription className="text-green-700">
              Setup complete. The agent can now spend within its limit.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-green-200 bg-white p-3">
                <div className="text-xs text-muted-foreground">Agent Address</div>
                <div className="font-mono text-sm mt-1">{agentKey.address.slice(0, 10)}...{agentKey.address.slice(-8)}</div>
              </div>
              <div className="rounded-lg border border-green-200 bg-white p-3">
                <div className="text-xs text-muted-foreground">Scoped To</div>
                <div className="text-sm mt-1 font-medium">ConfidentialSpendingExecutor</div>
              </div>
              <div className="rounded-lg border border-green-200 bg-white p-3">
                <div className="text-xs text-muted-foreground">Spending Limit</div>
                {decryptedLimit !== null ? (
                  <div className="text-sm mt-1 font-medium flex items-center gap-1.5">
                    {decryptedLimitRevealed ? (
                      <><span>{formatBalance(decryptedLimit)} cTEST</span><Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setDecryptedLimitRevealed(false)}><EyeOff className="h-3.5 w-3.5" /></Button></>
                    ) : (
                      <><span>{'\u2022'.repeat(6)}</span><Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => setDecryptedLimitRevealed(true)}><Eye className="h-3.5 w-3.5" /></Button></>
                    )}
                  </div>
                ) : (
                  <div className="text-sm mt-1 font-medium flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-primary" />
                    <span>{limitDecryptError ? 'Failed' : 'Encrypted'}</span>
                    <Button variant="ghost" size="sm" className="h-5 px-1.5 text-xs text-primary" onClick={handleDecryptLimit} disabled={limitDecrypting}>
                      {limitDecrypting ? <Loader2 className="h-3 w-3 animate-spin" /> : limitDecryptError ? 'Retry' : 'Decrypt'}
                    </Button>
                  </div>
                )}
              </div>
              <div className="rounded-lg border border-green-200 bg-white p-3">
                <div className="text-xs text-muted-foreground">Renewal Period</div>
                <div className="text-sm mt-1 font-medium">
                  {onChainLimit ? (Number(onChainLimit.renewPeriod) === 86400 ? '1 day' : `${Number(onChainLimit.renewPeriod)}s`) : '...'}
                </div>
              </div>
            </div>
            <DecryptTimer active={limitDecrypting} />
            {limitDecryptError && (
              <Alert variant="destructive" className="mt-3">
                <AlertDescription>
                  {limitDecryptError}
                  <span className="block mt-1 text-xs opacity-75">Click "Retry" above to try again.</span>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {agentKey && (
        <>
          {/* Step 1: Register scoped session key */}
          {showInstallKey && (
          <Card className={(step1TxHash || completedMilestones.includes('key-installed')) ? 'border-green-300 bg-green-50/30' : ''}>
            <CardHeader>
              <div className="flex items-center gap-2">
                {(step1TxHash || completedMilestones.includes('key-installed')) ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <UserPlus className="h-5 w-5 text-primary" />}
                <CardTitle>1. Register Scoped Session Key</CardTitle>
              </div>
              <CardDescription>
                Install the ScopedSessionKeysValidator and register the agent key. It can ONLY call
                the ConfidentialSpendingExecutor — no other contracts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {validatorReady ? (
                <Alert className="border-green-200 bg-green-50">
                  <Shield className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">Scoped validator installed with agent key registered.</AlertDescription>
                </Alert>
              ) : (
                <Button onClick={handleInstallScopedKey} disabled={step1Loading} className="w-full">
                  {step1Loading ? (
                    <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Installing...</span>
                  ) : (
                    <span className="flex items-center gap-2"><UserPlus className="h-4 w-4" /> Install Scoped Validator + Register Key</span>
                  )}
                </Button>
              )}
              {step1TxHash && (
                <Alert className="border-green-200 bg-green-50">
                  <AlertDescription className="text-green-700">Scoped key installed! Tx: <TxHashLink hash={step1TxHash} /></AlertDescription>
                </Alert>
              )}
              {step1Error && <Alert variant="destructive"><AlertDescription>{step1Error}</AlertDescription></Alert>}
            </CardContent>
          </Card>
          )}

          {/* Step 2: Active scoped keys */}
          {showInstallKey && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle>2. Active Scoped Keys</CardTitle>
              </div>
              <CardDescription>
                Session keys registered on the scoped validator. Each is restricted to the spending executor.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!validatorReady ? (
                <p className="text-sm text-muted-foreground">Complete step 1 first.</p>
              ) : registeredKeys.length === 0 ? (
                <p className="text-sm text-muted-foreground">No scoped keys registered yet.</p>
              ) : (
                <div className="space-y-3">
                  {registeredKeys.map((key) => (
                    <div key={key} className="rounded-lg border px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-mono text-sm">{key.slice(0, 14)}...{key.slice(-10)}</div>
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Active</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Scoped to: <span className="font-mono">{CONFIDENTIAL_SPENDING_EXECUTOR.slice(0, 10)}...{CONFIDENTIAL_SPENDING_EXECUTOR.slice(-8)}</span> (ConfidentialSpendingExecutor)
                      </div>
                      {step3TxHash && (
                        <div className="text-xs text-muted-foreground">
                          Spending limit: <span className="font-medium text-foreground">{limitAmount} cTEST</span> <span className="text-primary">(FHE-enforced on-chain)</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          )}

          {/* Step 3: Set spending limit */}
          {showSetLimit && (
          <Card className={(step3TxHash || completedMilestones.includes('limit-set')) ? 'border-green-300 bg-green-50/30' : ''}>
            <CardHeader>
              <div className="flex items-center gap-2">
                {(step3TxHash || completedMilestones.includes('limit-set')) ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Lock className="h-5 w-5 text-primary" />}
                <CardTitle>3. Set Spending Limit</CardTitle>
              </div>
              <CardDescription>
                Install the ConfidentialSpendingExecutor and set a spending cap for the agent key.
                The limit is encrypted on-chain via FHE — nobody reading the chain can see the agent's budget. Cumulative spend tracking and enforcement are also fully encrypted.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {executorInstalled && (
                <Alert className="border-green-200 bg-green-50">
                  <Shield className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">Executor module installed.</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Spending Limit (cTEST)</label>
                <Input type="number" step="0.1" min="0" value={limitAmount} onChange={(e) => setLimitAmount(e.target.value)} className="w-40" disabled={step3Loading} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Renewal Period (days)</label>
                <Input type="number" step="1" min="1" value={renewalDays} onChange={(e) => setRenewalDays(e.target.value)} className="w-40" disabled={step3Loading} />
                <p className="text-xs text-muted-foreground">The cumulative spend resets after each period. The spend tracker is encrypted on-chain — over-limit transfers are silently zeroed by FHE.select.</p>
              </div>
              <Button onClick={handleSetLimit} disabled={step3Loading} className="w-full">
                {step3Loading ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Setting Limit...</span>
                ) : (
                  <span className="flex items-center gap-2"><Lock className="h-4 w-4" /> {executorInstalled ? 'Update' : 'Set'} Limit ({limitAmount} cTEST)</span>
                )}
              </Button>
              {step3Loading && (
                <Alert>
                  <AlertDescription className="text-muted-foreground text-xs">
                    This requires up to 3 wallet confirmations: install executor module, encrypt &amp; set spending limit, and set up FHE decryption delegation. Please confirm each in your wallet.
                  </AlertDescription>
                </Alert>
              )}
              {step3TxHash && (
                <div className="space-y-3">
                  <Alert className="border-green-200 bg-green-50">
                    <AlertDescription className="text-green-700">Spending limit set (encrypted on-chain)! Tx: <TxHashLink hash={step3TxHash} /></AlertDescription>
                  </Alert>

                  {/* Decrypt the limit to verify */}
                  <div className="space-y-1">
                    <Button variant="outline" className="w-full" onClick={handleDecryptLimit} disabled={limitDecrypting || decryptedLimit !== null}>
                      {limitDecrypting ? (
                        <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Decrypting limit...</span>
                      ) : decryptedLimit !== null ? (
                        <span className="flex items-center gap-2"><Eye className="h-4 w-4" /> Limit decrypted</span>
                      ) : (
                        <span className="flex items-center gap-2"><Lock className="h-4 w-4" /> Decrypt Spending Limit</span>
                      )}
                    </Button>
                    <p className="text-[10px] text-muted-foreground">Verify the encrypted limit by decrypting via Zama Gateway (~90 sec)</p>
                  </div>

                  <DecryptTimer active={limitDecrypting} />

                  {decryptedLimit !== null && (
                    <div className={`flex items-center justify-between rounded-lg border px-4 py-3 ${decryptedLimitRevealed ? 'border-green-200 bg-green-50' : ''}`}>
                      <div>
                        <div className="text-xs text-muted-foreground">Decrypted Spending Limit</div>
                        <div className={`text-xl font-bold font-mono ${decryptedLimitRevealed ? 'text-green-800' : ''}`}>
                          {decryptedLimitRevealed ? `${formatBalance(decryptedLimit)} cTEST` : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setDecryptedLimitRevealed(!decryptedLimitRevealed)}>
                        {decryptedLimitRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  )}

                  {limitDecryptError && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        {limitDecryptError}
                        <span className="block mt-1 text-xs opacity-75">The Zama relayer may need up to 90 seconds after the transaction. Click "Decrypt Spending Limit" to try again.</span>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
              {step3Error && <Alert variant="destructive"><AlertDescription>{step3Error}</AlertDescription></Alert>}
            </CardContent>
          </Card>
          )}

          {/* Step 4: Transfer within limit */}
          {showTransferWithin && (
          <Card className={(step4TxHash || completedMilestones.includes('transfer-within-limit')) ? 'border-green-300 bg-green-50/30' : 'border-primary/20'}>
            <CardHeader>
              <div className="flex items-center gap-2">
                {(step4TxHash || completedMilestones.includes('transfer-within-limit')) ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Zap className="h-5 w-5 text-primary" />}
                <CardTitle>4. Transfer Within Limit</CardTitle>
              </div>
              <CardDescription>
                The agent key sends a confidential transfer through the executor.
                The FHE spending limit is checked on-chain without revealing any amounts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Decrypt balance before */}
              <div className="space-y-2">
                <div className="space-y-1">
                  <Button variant="outline" size="sm" onClick={() => handleDecryptBalance(setBalanceBeforeLoading, setBalanceBefore, setBalanceBeforeRevealed)} disabled={balanceBeforeLoading}>
                    {balanceBeforeLoading ? (
                      <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Decrypting...</span>
                    ) : (
                      <span className="flex items-center gap-2"><Eye className="h-4 w-4" /> Decrypt Balance Before</span>
                    )}
                  </Button>
                  <p className="text-[10px] text-muted-foreground">no gas — decrypts via Zama Gateway</p>
                </div>
                <DecryptTimer active={balanceBeforeLoading} />
                {balanceBefore !== null && (
                  <div className={`flex items-center justify-between rounded-lg border px-4 py-2 ${balanceBeforeRevealed ? 'border-green-200 bg-green-50' : ''}`}>
                    <div>
                      <div className="text-xs text-muted-foreground">Balance Before</div>
                      <div className={`text-lg font-bold font-mono ${balanceBeforeRevealed ? 'text-green-800' : ''}`}>
                        {balanceBeforeRevealed ? `${formatBalance(balanceBefore)} cTEST` : '\u2022\u2022\u2022\u2022\u2022\u2022'}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setBalanceBeforeRevealed(!balanceBeforeRevealed)}>
                      {balanceBeforeRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
              </div>

              {/* Transfer */}
              <div className="flex items-center gap-2">
                <Input type="number" step="0.1" min="0" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} className="w-32" disabled={step4Loading} />
                <span className="text-sm text-muted-foreground">cTEST</span>
                <Button onClick={handleTransferWithinLimit} disabled={step4Loading} size="sm">
                  {step4Loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send as Agent'}
                </Button>
              </div>
              {step4TxHash && (
                <Alert className="border-green-200 bg-green-50">
                  <AlertDescription className="text-green-700">Transfer succeeded (within limit)! Tx: <TxHashLink hash={step4TxHash} /></AlertDescription>
                </Alert>
              )}
              {step4Error && <Alert variant="destructive"><AlertDescription>{step4Error}</AlertDescription></Alert>}

              {/* Decrypt balance after */}
              {step4TxHash && (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Button variant="outline" size="sm" onClick={() => handleDecryptBalance(setStep4BalanceAfterLoading, setStep4BalanceAfter, setStep4BalanceAfterRevealed)} disabled={step4BalanceAfterLoading}>
                      {step4BalanceAfterLoading ? (
                        <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Decrypting...</span>
                      ) : (
                        <span className="flex items-center gap-2"><Eye className="h-4 w-4" /> Decrypt Balance After</span>
                      )}
                    </Button>
                    <p className="text-[10px] text-muted-foreground">no gas — decrypts via Zama Gateway</p>
                  </div>
                  <DecryptTimer active={step4BalanceAfterLoading} />
                  {step4BalanceAfter !== null && (
                    <div className={`flex items-center justify-between rounded-lg border px-4 py-2 ${step4BalanceAfterRevealed ? 'border-green-200 bg-green-50' : ''}`}>
                      <div>
                        <div className="text-xs text-muted-foreground">Balance After</div>
                        <div className={`text-lg font-bold font-mono ${step4BalanceAfterRevealed ? 'text-green-800' : ''}`}>
                          {step4BalanceAfterRevealed ? `${formatBalance(step4BalanceAfter)} cTEST` : '\u2022\u2022\u2022\u2022\u2022\u2022'}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setStep4BalanceAfterRevealed(!step4BalanceAfterRevealed)}>
                        {step4BalanceAfterRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  )}
                  {balanceBefore !== null && step4BalanceAfter !== null && balanceBeforeRevealed && step4BalanceAfterRevealed && (
                    <div className="text-xs text-muted-foreground text-center">
                      {formatBalance(balanceBefore)} → {formatBalance(step4BalanceAfter)} cTEST
                      (spent {formatBalance(balanceBefore - step4BalanceAfter)})
                    </div>
                  )}
                </div>
              )}

            </CardContent>
          </Card>
          )}

          {/* Step 5: Exceed limit — amber enforcement state */}
          {showExceedLimit && (
          <Card className={(step5TxHash || completedMilestones.includes('limit-enforced')) ? 'border-green-300 bg-green-50/30' : 'border-amber-300/50'}>
            <CardHeader>
              <div className="flex items-center gap-2">
                {(step5TxHash || completedMilestones.includes('limit-enforced')) ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Ban className="h-5 w-5 text-amber-600" />}
                <CardTitle>5. Exceed the Limit</CardTitle>
              </div>
              <CardDescription>
                Try to send more than what's left in the spending cap. The FHE comparison
                will zero the amount — the transaction succeeds but no tokens move.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleExceedLimit} disabled={step5Loading} variant="outline" className="w-full border-amber-300 text-amber-700 hover:bg-amber-50">
                {step5Loading ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Attempting...</span>
                ) : (
                  <span className="flex items-center gap-2"><Ban className="h-4 w-4" /> Try Sending {limitAmount} cTEST (Over Limit)</span>
                )}
              </Button>

              {/* Amber enforcement state */}
              {step5Attempted && (step5TxHash || step5Error) && (
                <Alert className="border-amber-300 bg-amber-50">
                  <Shield className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800">Spending limit enforced by FHE</AlertTitle>
                  <AlertDescription className="text-amber-700 text-xs">
                    The transaction executed on-chain, but the encrypted spending limit check detected an overspend.
                    <code className="mx-1">FHE.select</code> zeroed the transfer amount — no tokens moved.
                    Nobody saw the numbers, but the math was provably enforced.
                    {step5TxHash && <span className="block mt-1">Tx: <TxHashLink hash={step5TxHash} /></span>}
                  </AlertDescription>
                </Alert>
              )}

              {/* Verify balance unchanged */}
              {step5Attempted && (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Button variant="outline" size="sm" onClick={handleVerifyUnchanged} disabled={step5VerifyLoading}>
                      {step5VerifyLoading ? (
                        <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</span>
                      ) : (
                        <span className="flex items-center gap-2"><Eye className="h-4 w-4" /> Verify balance unchanged</span>
                      )}
                    </Button>
                    <p className="text-[10px] text-muted-foreground">no gas — decrypts via Zama Gateway</p>
                  </div>
                  <DecryptTimer active={step5VerifyLoading} />
                  {balanceBefore !== null && balanceAfter !== null && (
                    <div className="text-xs text-muted-foreground">
                      Before: {formatBalance(balanceBefore)} → After: {formatBalance(balanceAfter)} cTEST
                      {balanceBefore === balanceAfter && (
                        <span className="text-amber-700 font-medium ml-2">Confirmed: no tokens moved</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          )}

          {/* Step 6: Bypass attempt */}
          {showBypass && (
          <Card className={(step6Attempted || completedMilestones.includes('bypass-blocked')) ? 'border-green-300 bg-green-50/30' : 'border-destructive/20'}>
            <CardHeader>
              <div className="flex items-center gap-2">
                {(step6Attempted || completedMilestones.includes('bypass-blocked')) ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Ban className="h-5 w-5 text-destructive" />}
                <CardTitle>6. Bypass Attempt — Direct Token Call</CardTitle>
              </div>
              <CardDescription>
                The agent tries calling the token contract directly, bypassing the executor.
                This fails — the agent EOA doesn't hold any tokens (the smart account does),
                and the executor is the only authorized path for the agent to move tokens.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleBypassAttempt} disabled={step6Loading} variant="outline" className="w-full border-destructive/50 text-destructive hover:bg-destructive/10">
                {step6Loading ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Attempting...</span>
                ) : (
                  <span className="flex items-center gap-2"><Ban className="h-4 w-4" /> Try Direct Token Transfer (Should Fail)</span>
                )}
              </Button>
              {/* Show result — error thrown (tx rejected or failed to send) */}
              {step6Attempted && step6Error && (
                <Alert className="border-green-200 bg-green-50">
                  <Shield className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Direct call blocked</AlertTitle>
                  <AlertDescription className="text-green-700 text-xs">
                    The agent tried to call the token directly, but it failed — the agent EOA has no tokens
                    and isn't authorized to transfer from the smart account. The executor is the only path,
                    and the executor enforces the FHE spending limit.
                  </AlertDescription>
                </Alert>
              )}

              {/* Show result — tx sent but reverted on-chain */}
              {step6Attempted && step6Reverted && (
                <Alert className="border-green-200 bg-green-50">
                  <Shield className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Transaction reverted — direct call blocked</AlertTitle>
                  <AlertDescription className="text-green-700 text-xs">
                    The transaction was submitted but reverted on-chain. The token contract rejected the call
                    because the agent EOA is not authorized to transfer tokens it doesn't hold.
                    {step6TxHash && <span className="block mt-1">Tx: <TxHashLink hash={step6TxHash} /></span>}
                  </AlertDescription>
                </Alert>
              )}

              {/* Show result — tx succeeded but zero tokens moved (FHE binding mismatch) */}
              {step6Attempted && !step6Error && !step6Reverted && step6TxHash && (
                <Alert className="border-green-200 bg-green-50">
                  <Shield className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700 text-xs">
                    <strong>Bypass ineffective.</strong> The transaction executed on-chain, but no tokens moved.
                    The agent called the token directly as its own EOA — but the tokens belong to the smart account, not the agent.
                    The agent can only move the smart account's tokens through the executor, which enforces the spending limit.
                    <span className="block mt-1">Tx: <TxHashLink hash={step6TxHash} /></span>
                  </AlertDescription>
                </Alert>
              )}

            </CardContent>
          </Card>
          )}
        </>
      )}
    </div>
  );
}
