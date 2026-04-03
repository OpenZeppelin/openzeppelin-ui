import { useState, useEffect, useRef } from 'react';
import {
  type Address, type Hash, type Hex,
  createPublicClient, createWalletClient, http, getAddress, encodeFunctionData,
  parseEther, formatEther,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'wagmi/chains';
import { useWalletClient, usePublicClient, useAccount } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Alert, AlertDescription } from './ui/alert';
import { useWallet } from '../hooks/useWallet';
import { useWeightedMultisigWallet } from '../hooks/useWeightedMultisigWallet';
import TxHashLink from './TxHashLink';

import DecryptTimer from './DecryptTimer';
import VantagePoints from './VantagePoints';
import { ZamaConfidentialProvider } from '@zama-accounts/sdk';
import {
  FAUCET_TOKEN_ADDRESS, RPC_URL, ECDSA_VALIDATOR_ADDRESS,
} from '../config/constants';
import { WEIGHTED_MULTISIG_VALIDATOR_ADDRESS } from '../config/constants';
import {
  Shield, Lock, Loader2, Users, Coins, Copy, ExternalLink, CheckCircle2,
  Key, AlertTriangle, Vote, Ban, Eye, Wallet, ArrowRight, Scale, XCircle,
} from 'lucide-react';

import StepProgress, { mapStepStatus } from './StepProgress';

// ── Constants ──────────────────────────────────────────────────────

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

const FAUCET_MINT_ABI = [{
  name: 'mint', type: 'function', stateMutability: 'nonpayable',
  inputs: [
    { name: 'to', type: 'address' },
    { name: 'encryptedAmount', type: 'bytes32' },
    { name: 'inputProof', type: 'bytes' },
  ],
  outputs: [],
}] as const;

const CONFIDENTIAL_TRANSFER_ABI = [{
  name: 'confidentialTransfer', type: 'function', stateMutability: 'nonpayable',
  inputs: [
    { name: 'to', type: 'address' },
    { name: 'encryptedAmount', type: 'bytes32' },
    { name: 'inputProof', type: 'bytes' },
  ],
  outputs: [],
}] as const;

const MULTISIG_VALIDATOR_ABI = [
  {
    type: 'function', name: 'requestDiscloseOperation', stateMutability: 'nonpayable',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'hash', type: 'bytes32' },
      { name: 'signingSigners', type: 'bytes[]' },
      { name: 'signerIdHandles', type: 'bytes32[]' },
      { name: 'signatures', type: 'bytes[]' },
    ],
    outputs: [],
  },
  {
    type: 'function', name: 'getSigners',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'start', type: 'uint32' },
      { name: 'end', type: 'uint32' },
    ],
    outputs: [{ name: '', type: 'bytes32[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function', name: 'getSignerCount',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

const TREASURY_FUNDING_AMOUNT = '0.03';
const SIGNER_FUNDING_AMOUNT = '0.002';

// ── Component ──────────────────────────────────────────────────────

export type WeightedMultisigMilestone = 'preview-seen' | 'authorities-named' | 'treasury-deployed' | 'governance-installed' | 'control-handed-over' | 'transfer-approved' | 'transfer-blocked' | 'vantage-complete';

export default function WeightedMultisigTab({ onMilestone, completedMilestones = [], onTreasuryCreated, visibleStep, onAdvance }: {
  onMilestone?: (event: WeightedMultisigMilestone) => void;
  completedMilestones?: string[];
  onTreasuryCreated?: (address: string) => void;
  visibleStep?: 'vantage-preview' | 'name-authorities' | 'deploy-fund' | 'install-governance' | 'hand-over-control' | 'authorized-transfer' | 'blocked-transfer' | 'vantage-live';
  onAdvance?: () => void;
} = {}) {
  const { wallet: personalWallet } = useWallet();
  const {
    boardMembers, threshold, setThreshold, treasuryWallet,
    signerHandles, weightHandles, generateBoardMembers, updateWeight,
    createTreasury, connectTreasury, setSignerHandles, setWeightHandles,
    savedSession, resumeSession, resetSession,
  } = useWeightedMultisigWallet();
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { address: eoaAddress } = useAccount();

  // ── Step 3: Deploy & Fund Treasury ──
  const [step3Loading, setStep3Loading] = useState(false);
  const [step3Error, setStep3Error] = useState<string | null>(null);
  const [step3TxHash, setStep3TxHash] = useState<Hash | null>(null);
  const [step3ActiveIdx, setStep3ActiveIdx] = useState(-1);
  const [treasuryFunded, setTreasuryFunded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mintAmount] = useState('50.0');
  const [treasuryBalance, setTreasuryBalance] = useState<bigint | null>(null);
  const [treasuryBalanceLoading, setTreasuryBalanceLoading] = useState(false);

  // ── Step 4: Install Weighted Multisig Validator ──
  const [step4Loading, setStep4Loading] = useState(false);
  const [step4Error, setStep4Error] = useState<string | null>(null);
  const [step4TxHash, setStep4TxHash] = useState<Hash | null>(null);
  const [step4ActiveIdx, setStep4ActiveIdx] = useState(-1);
  const [multisigInstalled, setMultisigInstalled] = useState(false);

  // ── Step 5: Hand Over Control ──
  const [step5Loading, setStep5Loading] = useState(false);
  const [step5Error, setStep5Error] = useState<string | null>(null);
  const [step5TxHash, setStep5TxHash] = useState<Hash | null>(null);
  const [ecdsaRemoved, setEcdsaRemoved] = useState(false);
  const [step5Confirmed, setStep5Confirmed] = useState(false);

  // ── Step 6: Weighted Approval ──
  const [step6Loading, setStep6Loading] = useState(false);
  const [step6Error, setStep6Error] = useState<string | null>(null);
  const [step6TxHash, setStep6TxHash] = useState<Hash | null>(null);
  const [step6ActiveIdx, setStep6ActiveIdx] = useState(-1);
  const [balanceBefore, setBalanceBefore] = useState<bigint | null>(null);
  const [balanceAfter, setBalanceAfter] = useState<bigint | null>(null);

  // ── Step 7: Weight Asymmetry (blocked transfer) ──
  const [step7Loading, setStep7Loading] = useState(false);
  const [step7Error, setStep7Error] = useState<string | null>(null);
  const [step7ActiveIdx, setStep7ActiveIdx] = useState(-1);
  const [blockedResult, setBlockedResult] = useState<'pending' | 'failed' | null>(null);

  // ── Check module installation state ──
  useEffect(() => {
    if (!treasuryWallet) return;
    const check = async () => {
      try {
        const pc = createPublicClient({ chain: sepolia, transport: http(RPC_URL) });
        const installed = await pc.readContract({
          abi: IS_MODULE_INSTALLED_ABI,
          address: treasuryWallet.address,
          functionName: 'isModuleInstalled',
          args: [1n, WEIGHTED_MULTISIG_VALIDATOR_ADDRESS, '0x'],
        }) as boolean;
        setMultisigInstalled(installed);

        const ecdsaInstalled = await pc.readContract({
          abi: IS_MODULE_INSTALLED_ABI,
          address: treasuryWallet.address,
          functionName: 'isModuleInstalled',
          args: [1n, ECDSA_VALIDATOR_ADDRESS, '0x'],
        }) as boolean;
        setEcdsaRemoved(!ecdsaInstalled);
      } catch { /* ignore */ }
    };
    check();
  }, [treasuryWallet, step4TxHash, step5TxHash]);

  // ── Decrypt treasury balance (reusable) ──
  const decryptTreasuryBalance = async (
    setLoading: (v: boolean) => void,
    setBal: (v: bigint | null) => void,
  ) => {
    if (!treasuryWallet) return;
    setLoading(true);
    setBal(null);
    const MAX_RETRIES = 5;
    const RETRY_DELAY_MS = 20_000;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const bal = await treasuryWallet.getConfidentialBalance(getAddress(FAUCET_TOKEN_ADDRESS));
        setBal(bal);
        setLoading(false);
        return;
      } catch (e) {
        console.error(`Treasury balance decrypt failed (attempt ${attempt + 1}):`, e);
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        }
      }
    }
    setLoading(false);
  };

  // ── Helpers ──
  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalWeight = boardMembers?.reduce((s, m) => s + m.weight, 0) ?? 0;

  // ── Step 2: Generate Board Members ──
  const handleGenerateBoard = () => {
    generateBoardMembers();
  };

  // ── Step 3: Deploy & Fund Treasury (create + fund + delegate + fund signer + mint) ──
  const step3SubSteps = [
    { label: 'Create treasury account', tag: 'no gas' as const, detail: 'Predicting address via CREATE2' },
    { label: `Fund treasury with ${TREASURY_FUNDING_AMOUNT} ETH`, tag: 'gas' as const, detail: 'Confirm in wallet' },
    { label: 'Set up FHE decryption delegation', tag: 'gas' as const, detail: 'Deploys account on first UserOp' },
    { label: `Fund disclosure signer with ${SIGNER_FUNDING_AMOUNT} ETH`, tag: 'gas' as const, detail: 'Signer pays gas for disclosure txs' },
    { label: 'Encrypt mint amount', tag: 'no gas' as const, detail: 'Client-side FHE encryption' },
    { label: 'Mint cTEST to treasury', tag: 'gas' as const, detail: 'Confirm in wallet' },
    { label: 'Grant EOA decryption access', tag: 'gas' as const, detail: 'Allows you to read the encrypted balance' },
  ];

  const handleCreateTreasury = async () => {
    if (!walletClient?.account || !publicClient) return;
    setStep3Loading(true);
    setStep3Error(null);
    setStep3TxHash(null);
    setStep3ActiveIdx(0);
    try {
      const treasury = await createTreasury();

      setStep3ActiveIdx(1);
      const fundHash = await walletClient.sendTransaction({
        account: walletClient.account,
        to: treasury.address,
        value: parseEther(TREASURY_FUNDING_AMOUNT),
        chain: sepolia,
      });
      await publicClient.waitForTransactionReceipt({ hash: fundHash });

      setStep3ActiveIdx(2);
      await treasury.ensureDecryptionDelegation(getAddress(FAUCET_TOKEN_ADDRESS));

      // Fund first board member for disclosure txs
      setStep3ActiveIdx(3);
      if (boardMembers && boardMembers.length >= 2) {
        const fundBHash = await walletClient.sendTransaction({
          account: walletClient.account,
          to: boardMembers[1].address,
          value: parseEther(SIGNER_FUNDING_AMOUNT),
          chain: sepolia,
        });
        await publicClient.waitForTransactionReceipt({ hash: fundBHash });
      }

      // Mint cTEST to treasury
      setStep3ActiveIdx(4);
      const provider = new ZamaConfidentialProvider({
        chainId: sepolia.id,
        signer: {
          address: treasury.address,
          signTypedData: async () => '0x' as Hex,
        },
      });
      const { handle, inputProof } = await provider.encrypt64(
        getAddress(FAUCET_TOKEN_ADDRESS),
        treasury.address,
        toBaseUnits(mintAmount),
      );

      setStep3ActiveIdx(5);
      const mintHash = await treasury.executeRaw([{
        to: getAddress(FAUCET_TOKEN_ADDRESS),
        data: encodeFunctionData({
          abi: FAUCET_MINT_ABI,
          functionName: 'mint',
          args: [treasury.address, handle as `0x${string}`, inputProof as `0x${string}`],
        }),
      }], { callGasLimit: 1_000_000n });

      // Grant EOA decryption access
      setStep3ActiveIdx(6);
      const balanceHandle = await publicClient.readContract({
        abi: [{ type: 'function', name: 'confidentialBalanceOf', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'bytes32' }], stateMutability: 'view' }] as const,
        address: getAddress(FAUCET_TOKEN_ADDRESS),
        functionName: 'confidentialBalanceOf',
        args: [treasury.address],
      }) as Hex;
      if (balanceHandle && balanceHandle !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        const aclAddress = '0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D' as Address;
        const allowData = encodeFunctionData({
          abi: [{ type: 'function', name: 'allow', inputs: [{ name: 'handle', type: 'bytes32' }, { name: 'account', type: 'address' }], outputs: [], stateMutability: 'nonpayable' }] as const,
          functionName: 'allow',
          args: [balanceHandle, eoaAddress!],
        });
        await treasury.executeRaw([{ to: aclAddress, data: allowData }]);
      }

      setStep3ActiveIdx(7);
      setStep3TxHash(fundHash);
      setTreasuryFunded(true);
      onMilestone?.('treasury-deployed');
      onTreasuryCreated?.(treasury.address);
    } catch (e) {
      setStep3Error(e instanceof Error ? e.message : String(e));
    } finally {
      setStep3Loading(false);
    }
  };

  // ── Step 4: Install Weighted Multisig Validator ──
  const step4SubSteps = [
    { label: 'Encrypt signer identities + threshold + weights', tag: 'no gas' as const, detail: 'Client-side FHE encryption via Zama SDK' },
    { label: 'Install weighted multisig validator', tag: 'gas' as const, detail: 'Confirm in wallet — uses 8M gas for 5 signers with weights' },
    { label: 'Delegate observer access to all signers', tag: 'gas' as const, detail: 'Confirm in wallet — signers can read treasury balances' },
  ];

  const handleInstallMultisig = async () => {
    if (!treasuryWallet) return;
    setStep4Loading(true);
    setStep4Error(null);
    setStep4TxHash(null);
    setStep4ActiveIdx(0);
    try {
      setStep4ActiveIdx(1);
      const result = await treasuryWallet.installWeightedMultisigValidator({
        observerTokens: [getAddress(FAUCET_TOKEN_ADDRESS)],
      });
      setStep4ActiveIdx(3);
      setStep4TxHash(result.txHash);
      setSignerHandles(result.signerHandles);
      setWeightHandles(result.weightHandles);
      setMultisigInstalled(true);
      onMilestone?.('governance-installed');
    } catch (e) {
      setStep4Error(e instanceof Error ? e.message : String(e));
    } finally {
      setStep4Loading(false);
    }
  };

  // ── Step 5: Remove Admin Access ──
  const handleRemoveEcdsa = async () => {
    if (!treasuryWallet) return;
    setStep5Loading(true);
    setStep5Error(null);
    setStep5TxHash(null);
    try {
      const hash = await treasuryWallet.uninstallValidator(ECDSA_VALIDATOR_ADDRESS);
      setStep5TxHash(hash);
      setEcdsaRemoved(true);
      onMilestone?.('control-handed-over');
    } catch (e) {
      setStep5Error(e instanceof Error ? e.message : String(e));
    } finally {
      setStep5Loading(false);
    }
  };

  // ── Shared multisig transfer logic ──
  const doMultisigTransfer = async (
    signerIndices: number[],
    amount: string,
    recipient: Address,
    onProgress?: (step: number) => void,
  ): Promise<{ success: boolean; txHash?: Hash; error?: string }> => {
    if (!treasuryWallet || !boardMembers || signerHandles.length === 0) {
      return { success: false, error: 'Not ready — missing treasury, board members, or signer handles' };
    }

    onProgress?.(0);
    const provider = new ZamaConfidentialProvider({
      chainId: sepolia.id,
      signer: {
        address: treasuryWallet.address,
        signTypedData: async () => '0x' as Hex,
      },
    });
    const { handle, inputProof } = await provider.encrypt64(
      getAddress(FAUCET_TOKEN_ADDRESS),
      treasuryWallet.address,
      toBaseUnits(amount),
    );

    const transferData = encodeFunctionData({
      abi: CONFIDENTIAL_TRANSFER_ABI,
      functionName: 'confidentialTransfer',
      args: [getAddress(recipient), handle as `0x${string}`, inputProof as `0x${string}`],
    });

    const { userOp, userOpHash } = await treasuryWallet.buildMultisigUserOp(
      [{ to: getAddress(FAUCET_TOKEN_ADDRESS), data: transferData }],
      { callGasLimit: 2_000_000n },
    );

    onProgress?.(1);
    const signerAccounts = signerIndices.map((i) => privateKeyToAccount(boardMembers[i].privateKey));
    const signatures = await Promise.all(
      signerAccounts.map((a) => a.sign({ hash: userOpHash as `0x${string}` })),
    );

    const discloseSigner = signerAccounts.length > 1 ? signerAccounts[1] : signerAccounts[0];
    const discloseWalletClient = createWalletClient({
      account: discloseSigner,
      chain: sepolia,
      transport: http(RPC_URL),
    });

    onProgress?.(2);
    const disclosureTxHash = await discloseWalletClient.writeContract({
      abi: MULTISIG_VALIDATOR_ABI,
      address: WEIGHTED_MULTISIG_VALIDATOR_ADDRESS,
      functionName: 'requestDiscloseOperation',
      args: [
        treasuryWallet.address,
        userOpHash as `0x${string}`,
        signerAccounts.map((a) => a.address as Hex),
        signerIndices.map((i) => signerHandles[i] as `0x${string}`),
        signatures,
      ],
      gas: 5_000_000n,
    });

    const pc = createPublicClient({ chain: sepolia, transport: http(RPC_URL) });
    const receipt = await pc.waitForTransactionReceipt({ hash: disclosureTxHash });

    let eboolHandle: Hex | undefined;
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() === WEIGHTED_MULTISIG_VALIDATOR_ADDRESS.toLowerCase()) {
        if (log.data && log.data.length >= 66) {
          eboolHandle = log.data.slice(0, 66) as Hex;
          break;
        }
      }
    }
    if (!eboolHandle) throw new Error('No ebool handle found in disclosure event');

    onProgress?.(3);
    const proof = await treasuryWallet.waitForDisclosureProof(eboolHandle);

    onProgress?.(4);
    try {
      const txHash = await treasuryWallet.submitWithProof(userOp, discloseSigner.address, proof);
      return { success: true, txHash };
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) };
    }
  };

  // ── Step 6: Weighted Approval (CEO + CFO) ──
  const step6SubSteps = [
    { label: 'Encrypt transfer amount + build UserOp', tag: 'no gas' as const, detail: 'Client-side FHE encryption' },
    { label: `Collect signatures: CEO(${boardMembers?.[0]?.weight ?? 5}) + CFO(${boardMembers?.[1]?.weight ?? 3})`, tag: 'no gas' as const, detail: `Total weight: ${(boardMembers?.[0]?.weight ?? 5) + (boardMembers?.[1]?.weight ?? 3)} >= ${threshold}` },
    { label: 'Submit FHE disclosure', tag: 'gas' as const, detail: 'Signer sends signatures to the encrypted validator' },
    { label: 'Wait for Zama proof', tag: 'no gas' as const, detail: 'Zama Gateway decrypts the validation result — typically 60-120s' },
    { label: 'Execute approved transfer', tag: 'gas' as const, detail: 'Submit UserOp with cryptographic proof' },
  ];

  const handleWeightedApproval = async () => {
    if (!treasuryWallet || !boardMembers) return;
    setStep6Loading(true);
    setStep6Error(null);
    setStep6TxHash(null);
    setStep6ActiveIdx(0);

    const recipient = eoaAddress!;

    try {
      try {
        const bal = await treasuryWallet.getConfidentialBalance(getAddress(FAUCET_TOKEN_ADDRESS));
        setBalanceBefore(bal);
      } catch { /* ok */ }

      const result = await doMultisigTransfer([0, 1], '5.0', recipient, setStep6ActiveIdx);

      if (result.success) {
        setStep6ActiveIdx(5);
        setStep6TxHash(result.txHash!);

        // Decrypt balance after
        try {
          await new Promise((r) => setTimeout(r, 5000));
          const bal = await treasuryWallet.getConfidentialBalance(getAddress(FAUCET_TOKEN_ADDRESS));
          setBalanceAfter(bal);
        } catch { /* ok */ }

        onMilestone?.('transfer-approved');
      } else {
        setStep6Error(result.error ?? 'Transfer failed');
      }
    } catch (e) {
      setStep6Error(e instanceof Error ? e.message : String(e));
    } finally {
      setStep6Loading(false);
    }
  };

  // ── Step 7: Weight Asymmetry (blocked) — CTO + Member1 + Member2 (weight 5 < 7) ──
  const step7SubSteps = [
    { label: 'Encrypt transfer + build UserOp', tag: 'no gas' as const, detail: 'Same flow as weighted approval' },
    { label: 'Collect 3 signatures (CTO + Member 1 + Member 2)', tag: 'no gas' as const, detail: `Total weight: ${(boardMembers?.[2]?.weight ?? 3) + (boardMembers?.[3]?.weight ?? 1) + (boardMembers?.[4]?.weight ?? 1)} — below threshold ${threshold}` },
    { label: 'Submit FHE disclosure', tag: 'gas' as const, detail: 'Signer sends the signatures to the validator' },
    { label: 'Wait for Zama proof', tag: 'no gas' as const, detail: 'Gateway decrypts validation result — will be false' },
    { label: 'Attempt submission (expected to fail)', tag: 'gas' as const, detail: 'Proof proves threshold was NOT met — tx blocked' },
  ];

  const handleBlockedTransfer = async () => {
    if (!treasuryWallet || !boardMembers) return;
    setStep7Loading(true);
    setStep7Error(null);
    setStep7ActiveIdx(0);
    setBlockedResult('pending');

    try {
      // CTO(2) + Member1(3) + Member2(4) → weights 3+1+1 = 5 < 7
      const result = await doMultisigTransfer([2, 3, 4], '1.0', eoaAddress!, setStep7ActiveIdx);

      if (!result.success) {
        setBlockedResult('failed');
        onMilestone?.('transfer-blocked');
      } else {
        setStep7Error('Unexpected: transfer succeeded. Weight validation may not be working correctly.');
        setBlockedResult(null);
      }
    } catch (e) {
      // Expected — the transfer should fail
      setBlockedResult('failed');
      onMilestone?.('transfer-blocked');
    } finally {
      setStep7Loading(false);
    }
  };

  // ── Render ──

  const showVantagePreview = !visibleStep || visibleStep === 'vantage-preview';
  const showStep2 = !visibleStep || visibleStep === 'name-authorities';
  const showStep3 = !visibleStep || visibleStep === 'deploy-fund';
  const showStep4 = !visibleStep || visibleStep === 'install-governance';
  const showStep5 = !visibleStep || visibleStep === 'hand-over-control';
  const showStep6 = !visibleStep || visibleStep === 'authorized-transfer';
  const showStep7 = !visibleStep || visibleStep === 'blocked-transfer';
  const showVantageLive = !visibleStep || visibleStep === 'vantage-live';

  const signerNamesForVantage = boardMembers
    ? boardMembers.map((m) => ({ role: m.role, address: m.address, weight: m.weight }))
    : [
        { role: 'CEO', address: '0x0000...0000', weight: 5 },
        { role: 'CFO', address: '0x0000...0000', weight: 3 },
        { role: 'CTO', address: '0x0000...0000', weight: 3 },
        { role: 'Member 1', address: '0x0000...0000', weight: 1 },
        { role: 'Member 2', address: '0x0000...0000', weight: 1 },
      ];

  return (
    <div className="space-y-4">
      {/* ── Vantage Points Preview ── */}
      {showVantagePreview && (
        <VantagePoints
          treasuryAddress=""
          balance={null}
          signerNames={signerNamesForVantage}
          signerHandles={[]}
          preview
          weighted
          thresholdLabel={`${threshold} (weight)`}
          onComplete={() => {
            onMilestone?.('preview-seen');
            onAdvance?.();
          }}
        />
      )}

      {/* Resume / Fresh prompt */}
      {savedSession && !boardMembers && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <CardTitle>Previous Session Found</CardTitle>
            </div>
            <CardDescription>
              Treasury <span className="font-mono text-xs">{savedSession.treasuryAddress.slice(0, 10)}...{savedSession.treasuryAddress.slice(-8)}</span> with {savedSession.boardMembers.length} board members ({savedSession.boardMembers.map(m => m.role).join(', ')}).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {resumeError && (
              <Alert variant="destructive"><AlertDescription>{resumeError}</AlertDescription></Alert>
            )}
            <div className="flex gap-3">
              <Button
                onClick={async () => {
                  setResumeLoading(true);
                  setResumeError(null);
                  try {
                    await resumeSession();
                  } catch (e) {
                    setResumeError(e instanceof Error ? e.message : String(e));
                  } finally {
                    setResumeLoading(false);
                  }
                }}
                disabled={resumeLoading}
                className="flex-1"
              >
                {resumeLoading ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Resuming...</span>
                ) : (
                  <span className="flex items-center gap-2"><ArrowRight className="h-4 w-4" /> Resume Previous Session</span>
                )}
              </Button>
              <Button variant="outline" onClick={resetSession} disabled={resumeLoading} className="flex-1">
                Start Fresh
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Generate Board + Set Weights ── */}
      {showStep2 && !savedSession && (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle>2. Name the Signatories & Weights</CardTitle>
          </div>
          <CardDescription>
            Create 5 board members with different roles and weights. The CEO has veto-level
            weight — but nobody on-chain can see that.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {boardMembers ? (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Role</th>
                      <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Address</th>
                      <th className="text-center py-2 px-2 font-medium text-muted-foreground">Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boardMembers.map((m, i) => (
                      <tr key={m.address} className="border-b border-muted/50">
                        <td className="py-2 pr-3 font-medium">{m.role}</td>
                        <td className="py-2 pr-3">
                          <span className="font-mono text-xs">{m.address.slice(0, 10)}...{m.address.slice(-6)}</span>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <Input
                            type="number"
                            min="1"
                            max="20"
                            value={m.weight}
                            onChange={(e) => updateWeight(i, parseInt(e.target.value) || 1)}
                            className="w-16 h-7 text-center text-sm mx-auto"
                            disabled={multisigInstalled}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <span className="text-muted-foreground">Total weight:</span>{' '}
                  <span className="font-medium">{totalWeight}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Threshold:</span>
                  <Input
                    type="number"
                    min="1"
                    max={totalWeight}
                    value={threshold}
                    onChange={(e) => setThreshold(parseInt(e.target.value) || 1)}
                    className="w-16 h-7 text-center text-sm"
                    disabled={multisigInstalled}
                  />
                  <span className="text-xs text-muted-foreground">(minimum total weight to approve)</span>
                </div>
              </div>

              {/* Weight distribution bar */}
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground font-medium">Weight Distribution</div>
                <div className="flex h-4 rounded overflow-hidden border">
                  {boardMembers.map((m, i) => {
                    const pct = (m.weight / totalWeight) * 100;
                    const colors = ['bg-primary', 'bg-blue-500', 'bg-purple-500', 'bg-gray-400', 'bg-gray-300'];
                    return (
                      <div
                        key={m.address}
                        className={`${colors[i]} flex items-center justify-center text-[9px] text-white font-medium`}
                        style={{ width: `${pct}%` }}
                        title={`${m.role}: ${m.weight}`}
                      >
                        {pct > 10 ? m.weight : ''}
                      </div>
                    );
                  })}
                </div>
                <div className="flex text-[10px] text-muted-foreground gap-3">
                  {boardMembers.map((m, i) => {
                    const dots = ['text-primary', 'text-blue-500', 'text-purple-500', 'text-gray-400', 'text-gray-300'];
                    return (
                      <span key={m.address} className={dots[i]}>{m.role}: {m.weight}</span>
                    );
                  })}
                </div>
              </div>

              {!completedMilestones.includes('authorities-named') && (
                <Button onClick={() => onMilestone?.('authorities-named')} className="w-full">
                  <span className="flex items-center gap-2"><ArrowRight className="h-4 w-4" /> Continue</span>
                </Button>
              )}
            </div>
          ) : (
            <Button onClick={handleGenerateBoard} className="w-full">
              <span className="flex items-center gap-2"><Users className="h-4 w-4" /> Generate 5 Board Members</span>
            </Button>
          )}
        </CardContent>
      </Card>
      )}

      {/* ── Step 3: Deploy & Fund Treasury ── */}
      {showStep3 && boardMembers && (
        <Card className={(treasuryFunded || completedMilestones.includes('treasury-deployed')) ? 'border-green-300 bg-green-50/30' : ''}>
          <CardHeader>
            <div className="flex items-center gap-2">
              {(treasuryFunded || completedMilestones.includes('treasury-deployed')) ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Wallet className="h-5 w-5 text-primary" />}
              <CardTitle>3. Deploy & Fund Treasury</CardTitle>
            </div>
            <CardDescription>
              The treasury is a new smart account, separate from your personal account. Your connected wallet deploys it, funds it with cTEST, and will configure governance before stepping aside.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {treasuryFunded && treasuryWallet ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => copyAddress(treasuryWallet.address)}
                    className="flex items-center gap-1.5 font-mono text-sm hover:text-primary transition-colors cursor-pointer"
                  >
                    {treasuryWallet.address.slice(0, 10)}...{treasuryWallet.address.slice(-8)}
                    {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                  <a
                    href={`https://sepolia.etherscan.io/address/${treasuryWallet.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
                <Alert className="border-green-200 bg-green-50">
                  <AlertDescription className="text-green-700 text-xs">
                    Treasury created, funded & minted {mintAmount} cTEST! Tx: <TxHashLink hash={step3TxHash!} />
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <>
                <Button onClick={handleCreateTreasury} disabled={step3Loading || treasuryFunded || completedMilestones.includes('treasury-deployed')} className="w-full">
                  {step3Loading ? (
                    <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Creating Treasury...</span>
                  ) : (
                    <span className="flex items-center gap-2"><Wallet className="h-4 w-4" /> Deploy & Fund Treasury</span>
                  )}
                </Button>
                {step3ActiveIdx >= 0 && (
                  <StepProgress steps={mapStepStatus(step3SubSteps, step3ActiveIdx)} />
                )}
              </>
            )}
            {step3Error && <Alert variant="destructive"><AlertDescription>{step3Error}</AlertDescription></Alert>}
          </CardContent>
        </Card>
      )}

      {/* ── Step 4: Install Weighted Multisig Validator ── */}
      {showStep4 && boardMembers && (
        <Card className={(multisigInstalled || completedMilestones.includes('governance-installed')) ? 'border-green-300 bg-green-50/30' : ''}>
          <CardHeader>
            <div className="flex items-center gap-2">
              {(multisigInstalled || completedMilestones.includes('governance-installed')) ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Scale className="h-5 w-5 text-primary" />}
              <CardTitle>4. Install Encrypted Governance</CardTitle>
            </div>
            <CardDescription>
              Signer identities, weights, and the {threshold}-weight threshold are encrypted using FHE before being stored on-chain. Nobody can see who the signers are, what they weigh, or what threshold is needed. All signers are automatically granted observer access to view treasury balances.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {multisigInstalled ? (
              <div className="space-y-3">
                <Alert className="border-green-200 bg-green-50">
                  <Shield className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    Weighted multisig validator installed with encrypted signer identities, weights, and threshold.
                  </AlertDescription>
                </Alert>
                {signerHandles.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground font-medium">Encrypted Signer Handles</div>
                    {signerHandles.map((h, i) => (
                      <div key={h} className="rounded border px-3 py-2 bg-muted/50 flex items-center justify-between">
                        <div>
                          <span className="text-xs text-muted-foreground">{boardMembers?.[i]?.role ?? `Signer ${i}`}: </span>
                          <span className="font-mono text-xs">{h.slice(0, 14)}...{h.slice(-10)}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">weight: ???</span>
                      </div>
                    ))}
                  </div>
                )}
                {step4TxHash && (
                  <div className="text-xs text-muted-foreground">Tx: <TxHashLink hash={step4TxHash} /></div>
                )}
              </div>
            ) : (
              <>
                <Button
                  onClick={handleInstallMultisig}
                  disabled={step4Loading || !treasuryWallet || multisigInstalled || completedMilestones.includes('governance-installed')}
                  className="w-full"
                >
                  {step4Loading ? (
                    <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Installing...</span>
                  ) : (
                    <span className="flex items-center gap-2"><Scale className="h-4 w-4" /> Install Weighted Multisig Validator</span>
                  )}
                </Button>
                {step4ActiveIdx >= 0 && (
                  <StepProgress steps={mapStepStatus(step4SubSteps, step4ActiveIdx)} />
                )}
              </>
            )}
            {step4Error && <Alert variant="destructive"><AlertDescription>{step4Error}</AlertDescription></Alert>}
          </CardContent>
        </Card>
      )}

      {/* ── Step 5: Hand Over Control ── */}
      {showStep5 && boardMembers && (
        <Card className={ecdsaRemoved ? 'border-green-300 bg-green-50/30' : ''}>
          <CardHeader>
            <div className="flex items-center gap-2">
              {ecdsaRemoved ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <AlertTriangle className="h-5 w-5 text-amber-500" />}
              <CardTitle>5. Hand Over Control</CardTitle>
            </div>
            <CardDescription>
              A treasury controlled by one admin key defeats the purpose of multisig. This step removes the deployer's unilateral access. After this, only the board — through weighted encrypted approval — can authorize transactions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {ecdsaRemoved ? (
              <Alert className="border-green-200 bg-green-50">
                <Shield className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  Admin access removed. The connected wallet no longer has any special access to this treasury. Only the board can authorize transactions.
                  {step5TxHash && <> Tx: <TxHashLink hash={step5TxHash} /></>}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-700 text-xs">
                    This action is irreversible for this demo session. After removal, your connected wallet cannot send any transactions from the treasury. Only board members can authorize actions via weighted multisig.
                  </AlertDescription>
                </Alert>
                {!step5Confirmed ? (
                  <Button variant="outline" className="w-full border-destructive text-destructive hover:bg-destructive/10" onClick={() => setStep5Confirmed(true)}>
                    <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> I understand — proceed</span>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full border-destructive text-destructive hover:bg-destructive/10 font-semibold"
                    onClick={handleRemoveEcdsa}
                    disabled={step5Loading}
                  >
                    {step5Loading ? (
                      <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Removing ECDSA validator...</span>
                    ) : (
                      <span className="flex items-center gap-2"><Ban className="h-4 w-4" /> Remove Admin Access</span>
                    )}
                  </Button>
                )}
              </>
            )}
            {step5Error && <Alert variant="destructive"><AlertDescription>{step5Error}</AlertDescription></Alert>}
          </CardContent>
        </Card>
      )}

      {/* ── Step 6: Weighted Approval ── */}
      {showStep6 && boardMembers && (
        <Card className={(step6TxHash || completedMilestones.includes('transfer-approved')) ? 'border-green-300 bg-green-50/30' : ''}>
          <CardHeader>
            <div className="flex items-center gap-2">
              {(step6TxHash || completedMilestones.includes('transfer-approved')) ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Vote className="h-5 w-5 text-primary" />}
              <CardTitle>6. Weighted Board Approval</CardTitle>
            </div>
            <CardDescription>
              CEO (weight {boardMembers?.[0]?.weight}) + CFO (weight {boardMembers?.[1]?.weight}) sign the proposal. Total weight: {(boardMembers?.[0]?.weight ?? 0) + (boardMembers?.[1]?.weight ?? 0)} — meets the threshold of {threshold}. The FHE validator checks entirely in encrypted space whether enough weight approved.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step6TxHash ? (
              <div className="space-y-3">
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700">
                    Board-approved transfer complete. Tx: <TxHashLink hash={step6TxHash} />
                  </AlertDescription>
                </Alert>
                {balanceBefore !== null && balanceAfter !== null && (
                  <Alert className="border-green-200 bg-green-50">
                    <AlertDescription className="text-green-700">
                      Before: {formatBalance(balanceBefore)} → After: {formatBalance(balanceAfter)} cTEST (sent {formatBalance(balanceBefore - balanceAfter)})
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <>
                <Button onClick={handleWeightedApproval} disabled={step6Loading} className="w-full">
                  {step6Loading ? (
                    <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Processing...</span>
                  ) : (
                    <span className="flex items-center gap-2"><Vote className="h-4 w-4" /> Propose Transfer</span>
                  )}
                </Button>
                {step6ActiveIdx >= 0 && (
                  <StepProgress steps={mapStepStatus(step6SubSteps, step6ActiveIdx)} />
                )}
              </>
            )}
            {step6Error && <Alert variant="destructive"><AlertDescription>{step6Error}</AlertDescription></Alert>}
          </CardContent>
        </Card>
      )}

      {/* ── Step 7: Weight Asymmetry — Blocked Transfer ── */}
      {showStep7 && boardMembers && (
        <Card className={blockedResult === 'failed' ? 'border-green-300 bg-green-50/30' : 'border-primary/30'}>
          <CardHeader>
            <div className="flex items-center gap-2">
              {blockedResult === 'failed' ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Scale className="h-5 w-5 text-primary" />}
              <CardTitle>7. Weight Asymmetry — Insufficient Weight</CardTitle>
            </div>
            <CardDescription>
              CTO (weight {boardMembers?.[2]?.weight}) + Member 1 (weight {boardMembers?.[3]?.weight}) + Member 2 (weight {boardMembers?.[4]?.weight}) sign — 3 signers, total weight {(boardMembers?.[2]?.weight ?? 0) + (boardMembers?.[3]?.weight ?? 0) + (boardMembers?.[4]?.weight ?? 0)}, below the threshold of {threshold}. The FHE validator detects the insufficiency in encrypted space, and the transaction is blocked. More signers doesn't mean more weight.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {blockedResult === 'failed' ? (
              <Alert className="border-green-200 bg-green-50">
                <Scale className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  <strong>Insufficient weight — rejected.</strong> 3 signers failed where 2 different signers succeeded. Without knowing the encrypted weights, this result is inexplicable. The governance structure — who holds power, how much, and what threshold is needed — is completely invisible on-chain.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Button onClick={handleBlockedTransfer} disabled={step7Loading} className="w-full" variant="outline">
                  {step7Loading ? (
                    <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Running...</span>
                  ) : (
                    <span className="flex items-center gap-2"><Scale className="h-4 w-4" /> Try With 3 Signers (Should Fail)</span>
                  )}
                </Button>
                {step7ActiveIdx >= 0 && (
                  <StepProgress steps={mapStepStatus(step7SubSteps, step7ActiveIdx)} />
                )}
              </>
            )}
            {step7Error && <Alert variant="destructive"><AlertDescription>{step7Error}</AlertDescription></Alert>}
          </CardContent>
        </Card>
      )}

      {/* ── Four Vantage Points (Live) ── */}
      {showVantageLive && (
        <VantagePoints
          treasuryAddress={treasuryWallet?.address ?? ''}
          balance={balanceAfter ?? treasuryBalance}
          signerNames={signerNamesForVantage}
          signerHandles={signerHandles}
          weighted
          thresholdLabel={`${threshold} (weight)`}
          onComplete={() => onMilestone?.('vantage-complete')}
        />
      )}
    </div>
  );
}
