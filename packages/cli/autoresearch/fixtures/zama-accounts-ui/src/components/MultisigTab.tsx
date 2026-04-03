import { useState, useEffect, useRef } from 'react';
import {
  type Address, type Hash, type Hex,
  createPublicClient, createWalletClient, http, getAddress, encodeFunctionData,
  parseEther, formatEther, isAddress,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'wagmi/chains';
import { useWalletClient, usePublicClient, useAccount } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { useWallet } from '../hooks/useWallet';
import { useMultisigWallet } from '../hooks/useMultisigWallet';
import TxHashLink from './TxHashLink';

import DecryptTimer from './DecryptTimer';
import type { MultisigPreparedUserOp } from '@zama-accounts/sdk';
import { ZamaConfidentialProvider } from '@zama-accounts/sdk';
import {
  FAUCET_TOKEN_ADDRESS, RPC_URL, MULTISIG_VALIDATOR_ADDRESS, ECDSA_VALIDATOR_ADDRESS,
} from '../config/constants';
import {
  Shield, Lock, Loader2, Users, Coins, Copy, ExternalLink, CheckCircle2,
  Key, AlertTriangle, Vote, Ban, Eye, EyeOff, Wallet, ArrowRight,
} from 'lucide-react';

import VantagePoints from './VantagePoints';

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

const SIGNER_B_FUNDING_AMOUNT = '0.001';
const TREASURY_FUNDING_AMOUNT = '0.02';

const ROLE_NAMES = ['CEO', 'CFO', 'General Counsel'] as const;

import StepProgress, { mapStepStatus } from './StepProgress';

// ── Component ──────────────────────────────────────────────────────

export type MultisigMilestone = 'preview-seen' | 'authorities-named' | 'treasury-deployed' | 'governance-installed' | 'control-handed-over' | 'transfer-approved' | 'transfer-blocked' | 'vantage-complete';

export default function MultisigTab({ onMilestone, completedMilestones = [], onTreasuryCreated, visibleStep, onAdvance }: {
  onMilestone?: (event: MultisigMilestone) => void;
  completedMilestones?: string[];
  onTreasuryCreated?: (address: string) => void;
  visibleStep?: 'vantage-preview' | 'name-authorities' | 'deploy-fund' | 'install-governance' | 'hand-over-control' | 'authorized-transfer' | 'blocked-transfer' | 'vantage-live';
  onAdvance?: () => void;
} = {}) {
  const { wallet: personalWallet } = useWallet();
  const {
    boardMembers, threshold, setThreshold, treasuryWallet,
    signerHandles, generateBoardMembers, createTreasury, connectTreasury, setSignerHandles,
    savedSession, resumeSession, resetSession,
  } = useMultisigWallet();
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { address: eoaAddress } = useAccount();

  // ── CFO ETH balance ──
  const [signerBBalance, setSignerBBalance] = useState<bigint | null>(null);
  const [signerBFunded, setSignerBFunded] = useState(false);

  // ── Step 2: Deploy & Fund ──
  const [step2Loading, setStep2Loading] = useState(false);
  const [step2Error, setStep2Error] = useState<string | null>(null);
  const [step2TxHash, setStep2TxHash] = useState<Hash | null>(null);
  const [step2ActiveIdx, setStep2ActiveIdx] = useState(-1);
  const [treasuryFunded, setTreasuryFunded] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── Step 3: Install Encrypted Governance ──
  const [step3Loading, setStep3Loading] = useState(false);
  const [step3Error, setStep3Error] = useState<string | null>(null);
  const [step3TxHash, setStep3TxHash] = useState<Hash | null>(null);
  const [step3ActiveIdx, setStep3ActiveIdx] = useState(-1);
  const [multisigInstalled, setMultisigInstalled] = useState(false);

  // ── Step 4: Hand Over Control ──
  const [step4Loading, setStep4Loading] = useState(false);
  const [step4Error, setStep4Error] = useState<string | null>(null);
  const [step4TxHash, setStep4TxHash] = useState<Hash | null>(null);
  const [ecdsaRemoved, setEcdsaRemoved] = useState(false);
  const [step4Confirmed, setStep4Confirmed] = useState(false);

  // ── Treasury balance (shared) ──
  const [treasuryBalance, setTreasuryBalance] = useState<bigint | null>(null);
  const [treasuryBalanceLoading, setTreasuryBalanceLoading] = useState(false);
  const [treasuryBalanceRevealed, setTreasuryBalanceRevealed] = useState(false);

  // ── Step 5: Authorized Transfer ──
  const [transferRecipient, setTransferRecipient] = useState('');
  const [transferAmount, setTransferAmount] = useState('5.0');
  const [step5Loading, setStep5Loading] = useState(false);
  const [step5Error, setStep5Error] = useState<string | null>(null);
  const [step5TxHash, setStep5TxHash] = useState<Hash | null>(null);
  const [step5ActiveIdx, setStep5ActiveIdx] = useState(-1);
  const [step5BalanceBefore, setStep5BalanceBefore] = useState<bigint | null>(null);
  const [step5BalanceAfter, setStep5BalanceAfter] = useState<bigint | null>(null);
  const [step5BalanceLoading, setStep5BalanceLoading] = useState(false);
  const [step5BalanceRevealed, setStep5BalanceRevealed] = useState(false);

  // ── Step 6: Blocked Transfer ──
  const [step6Loading, setStep6Loading] = useState(false);
  const [step6Error, setStep6Error] = useState<string | null>(null);
  const [step6Attempted, setStep6Attempted] = useState(false);
  const [step6ActiveIdx, setStep6ActiveIdx] = useState(-1);
  const [step6BalanceBefore, setStep6BalanceBefore] = useState<bigint | null>(null);
  const [step6BalanceAfter, setStep6BalanceAfter] = useState<bigint | null>(null);
  const [step6BalanceLoading, setStep6BalanceLoading] = useState(false);
  const [step6BalanceRevealed, setStep6BalanceRevealed] = useState(false);

  // ── Check multisig installation state on treasury ──
  useEffect(() => {
    if (!treasuryWallet) return;
    const check = async () => {
      try {
        const pc = createPublicClient({ chain: sepolia, transport: http(RPC_URL) });
        const installed = await pc.readContract({
          abi: IS_MODULE_INSTALLED_ABI,
          address: treasuryWallet.address,
          functionName: 'isModuleInstalled',
          args: [1n, MULTISIG_VALIDATOR_ADDRESS, '0x'],
        }) as boolean;
        setMultisigInstalled(installed);

        // Check ECDSA removal
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
  }, [treasuryWallet, step3TxHash, step4TxHash]);

  // ── Check CFO balance ──
  useEffect(() => {
    if (!boardMembers || boardMembers.length < 2 || !publicClient) return;
    publicClient.getBalance({ address: boardMembers[1].address }).then(setSignerBBalance);
  }, [boardMembers, publicClient, signerBFunded]);

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

  // ── Step 1: Name the Signatories ──
  const handleGenerateBoard = () => {
    generateBoardMembers(3);
    onMilestone?.('authorities-named');
  };

  // ── Step 2: Deploy & Fund ──
  const step2SubSteps = [
    { label: 'Predict treasury address', detail: 'CREATE2 address derivation' },
    { label: `Fund treasury with ${TREASURY_FUNDING_AMOUNT} ETH`, detail: 'Confirm in wallet' },
    { label: 'Set up FHE decryption delegation', detail: 'Confirm in wallet' },
    { label: `Fund CFO with ${SIGNER_B_FUNDING_AMOUNT} ETH`, detail: "CFO's key pays gas for signature submission" },
    { label: 'Encrypt mint amount', detail: 'Client-side FHE encryption' },
    { label: 'Mint 100 cTEST to treasury', detail: 'Confirm in wallet' },
    { label: 'Grant deployer balance access', detail: 'Confirm in wallet' },
  ];

  const handleDeployAndCapitalize = async () => {
    if (!walletClient?.account || !publicClient) return;
    setStep2Loading(true);
    setStep2Error(null);
    setStep2TxHash(null);
    setStep2ActiveIdx(0);
    try {
      // 0: Predict treasury address
      const treasury = await createTreasury();

      // 1: Fund treasury
      setStep2ActiveIdx(1);
      const fundHash = await walletClient.sendTransaction({
        account: walletClient.account,
        to: treasury.address,
        value: parseEther(TREASURY_FUNDING_AMOUNT),
        chain: sepolia,
      });
      await publicClient.waitForTransactionReceipt({ hash: fundHash });

      // 2: FHE delegation
      setStep2ActiveIdx(2);
      await treasury.ensureDecryptionDelegation(getAddress(FAUCET_TOKEN_ADDRESS));

      // 3: Fund CFO
      setStep2ActiveIdx(3);
      if (boardMembers && boardMembers.length >= 2) {
        const fundBHash = await walletClient.sendTransaction({
          account: walletClient.account,
          to: boardMembers[1].address,
          value: parseEther(SIGNER_B_FUNDING_AMOUNT),
          chain: sepolia,
        });
        await publicClient.waitForTransactionReceipt({ hash: fundBHash });
        setSignerBFunded(true);
      }

      // 4: Encrypt mint amount
      setStep2ActiveIdx(4);
      const mintAmount = '100';
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

      const mintData = encodeFunctionData({
        abi: FAUCET_MINT_ABI,
        functionName: 'mint',
        args: [treasury.address, handle as `0x${string}`, inputProof as `0x${string}`],
      });

      // 5: Mint
      setStep2ActiveIdx(5);
      const mintHash = await treasury.executeRaw(
        [{ to: getAddress(FAUCET_TOKEN_ADDRESS), value: 0n, data: mintData }],
        { callGasLimit: 1_000_000n },
      );

      // 6: Grant deployer balance access
      setStep2ActiveIdx(6);
      const pc = createPublicClient({ chain: sepolia, transport: http(RPC_URL) });
      const balanceHandle = await pc.readContract({
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

      setStep2ActiveIdx(7); // all done
      setStep2TxHash(fundHash);
      setTreasuryFunded(true);
      onMilestone?.('treasury-deployed');
      onTreasuryCreated?.(treasury.address);
    } catch (e) {
      setStep2Error(e instanceof Error ? e.message : String(e));
    } finally {
      setStep2Loading(false);
    }
  };

  // ── Step 3: Install Encrypted Governance ──
  const step3SubSteps = [
    { label: 'Encrypt signer identities + threshold', detail: 'Client-side FHE encryption via Zama SDK' },
    { label: 'Install encrypted governance on treasury', detail: 'Confirm in wallet — uses 5M gas for FHE onInstall' },
    { label: 'Grant observer access to all signers', detail: 'Signers can read treasury balances' },
  ];

  const handleInstallMultisig = async () => {
    if (!treasuryWallet) return;
    setStep3Loading(true);
    setStep3Error(null);
    setStep3TxHash(null);
    setStep3ActiveIdx(0);
    try {
      setStep3ActiveIdx(1);
      const result = await treasuryWallet.installMultisigValidator({
        observerTokens: [getAddress(FAUCET_TOKEN_ADDRESS)],
      });
      setStep3ActiveIdx(3); // all done
      setStep3TxHash(result.txHash);
      setSignerHandles(result.signerHandles);
      setMultisigInstalled(true);
      onMilestone?.('governance-installed');
    } catch (e) {
      setStep3Error(e instanceof Error ? e.message : String(e));
    } finally {
      setStep3Loading(false);
    }
  };

  // ── Step 4: Hand Over Control ──
  const handleRemoveEcdsa = async () => {
    if (!treasuryWallet) return;
    setStep4Loading(true);
    setStep4Error(null);
    setStep4TxHash(null);
    try {
      const hash = await treasuryWallet.uninstallValidator(ECDSA_VALIDATOR_ADDRESS);
      setStep4TxHash(hash);
      setEcdsaRemoved(true);
      onMilestone?.('control-handed-over');
    } catch (e) {
      setStep4Error(e instanceof Error ? e.message : String(e));
    } finally {
      setStep4Loading(false);
    }
  };

  // ── Step 5: Authorized Transfer (CFO + General Counsel) ──
  const step5SubSteps = [
    { label: 'Encrypt transfer amount + build transaction', detail: 'Client-side FHE encryption' },
    { label: 'CEO signs the proposal', detail: 'Raw signature — no gas' },
    { label: 'CFO signs the proposal', detail: 'Raw signature — no gas' },
    { label: 'Submit for FHE validation', detail: 'CFO submits both signatures' },
    { label: 'Zama Gateway decrypts the result', detail: 'Typically 60-120s on testnet' },
    { label: 'Execute the transfer', detail: 'Submit with cryptographic proof' },
  ];

  const handleAuthorizedTransfer = async () => {
    if (!treasuryWallet || !boardMembers || boardMembers.length < 3 || signerHandles.length < 3) return;
    setStep5Loading(true);
    setStep5Error(null);
    setStep5TxHash(null);
    setStep5ActiveIdx(0);

    const recipient = transferRecipient || eoaAddress!;

    try {
      // Capture balance before
      try {
        const bal = await treasuryWallet.getConfidentialBalance(getAddress(FAUCET_TOKEN_ADDRESS));
        setStep5BalanceBefore(bal);
      } catch { /* ok if decrypt not ready */ }

      // 0: Encrypt + build
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
        toBaseUnits(transferAmount),
      );

      const transferData = encodeFunctionData({
        abi: CONFIDENTIAL_TRANSFER_ABI,
        functionName: 'confidentialTransfer',
        args: [getAddress(recipient) as `0x${string}`, handle as `0x${string}`, inputProof as `0x${string}`],
      });

      const { userOp, userOpHash } = await treasuryWallet.buildMultisigUserOp(
        [{ to: getAddress(FAUCET_TOKEN_ADDRESS), data: transferData }],
        { callGasLimit: 2_000_000n },
      );

      // 1: CEO signs
      setStep5ActiveIdx(1);
      const signerCEO = privateKeyToAccount(boardMembers[0].privateKey);
      const sigCEO = await signerCEO.sign({ hash: userOpHash as `0x${string}` });

      // 2: CFO signs
      setStep5ActiveIdx(2);
      const signerCFO = privateKeyToAccount(boardMembers[1].privateKey);
      const sigCFO = await signerCFO.sign({ hash: userOpHash as `0x${string}` });

      // 3: Submit FHE disclosure via CFO
      setStep5ActiveIdx(3);
      const cfoWalletClient = createWalletClient({
        account: signerCFO,
        chain: sepolia,
        transport: http(RPC_URL),
      });

      const disclosureTxHash = await cfoWalletClient.writeContract({
        abi: MULTISIG_VALIDATOR_ABI,
        address: MULTISIG_VALIDATOR_ADDRESS,
        functionName: 'requestDiscloseOperation',
        args: [
          treasuryWallet.address,
          userOpHash as `0x${string}`,
          [signerCEO.address as Hex, signerCFO.address as Hex],
          [signerHandles[0] as `0x${string}`, signerHandles[1] as `0x${string}`],
          [sigCEO, sigCFO],
        ],
        gas: 3_000_000n,
      });

      console.log('[Multisig Step 5] disclosure tx:', disclosureTxHash);

      const pc = createPublicClient({ chain: sepolia, transport: http(RPC_URL) });
      const receipt = await pc.waitForTransactionReceipt({ hash: disclosureTxHash });

      console.log('[Multisig Step 5] disclosure receipt status:', receipt.status);
      console.log('[Multisig Step 5] disclosure gas used:', receipt.gasUsed.toString());

      let eboolHandle: Hex | undefined;
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() === MULTISIG_VALIDATOR_ADDRESS.toLowerCase()) {
          if (log.data && log.data.length >= 66) {
            eboolHandle = log.data.slice(0, 66) as Hex;
            break;
          }
        }
      }
      if (!eboolHandle) throw new Error('No ebool handle found in disclosure event');
      console.log('[Multisig Step 5] ebool handle:', eboolHandle);

      // 4: Wait for Zama proof
      setStep5ActiveIdx(4);
      const proof = await treasuryWallet.waitForDisclosureProof(eboolHandle);
      console.log('[Multisig Step 5] proof length:', proof.length);

      // 5: Execute approved transfer
      setStep5ActiveIdx(5);
      const txHash = await treasuryWallet.submitWithProof(userOp, signerCFO.address, proof);

      setStep5ActiveIdx(6); // all done
      setStep5TxHash(txHash);
      onMilestone?.('transfer-approved');
    } catch (e) {
      setStep5Error(e instanceof Error ? e.message : String(e));
    } finally {
      setStep5Loading(false);
    }
  };

  // ── Step 6: Blocked Transfer (CEO alone) ──
  const step6SubSteps = [
    { label: 'Encrypt transfer + build transaction', detail: 'Client-side FHE encryption' },
    { label: 'General Counsel signs the proposal', detail: 'One signature — below the 2-of-3 threshold' },
    { label: 'Submit for FHE validation', detail: 'CFO submits the single signature' },
    { label: 'Zama Gateway decrypts the result', detail: 'Result is false' },
    { label: 'Attempt execution', detail: 'Proof confirms threshold not met — blocked' },
  ];

  const handleBlockedTransfer = async () => {
    if (!treasuryWallet || !boardMembers || boardMembers.length < 3 || signerHandles.length < 3) return;
    setStep6Loading(true);
    setStep6Error(null);
    setStep6Attempted(false);
    setStep6ActiveIdx(0);

    try {
      // Capture balance before
      try {
        const bal = await treasuryWallet.getConfidentialBalance(getAddress(FAUCET_TOKEN_ADDRESS));
        setStep6BalanceBefore(bal);
      } catch { /* ok */ }

      // 0: Encrypt + build
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
        toBaseUnits('0.5'),
      );

      const transferData = encodeFunctionData({
        abi: CONFIDENTIAL_TRANSFER_ABI,
        functionName: 'confidentialTransfer',
        args: [eoaAddress! as `0x${string}`, handle as `0x${string}`, inputProof as `0x${string}`],
      });

      const { userOp, userOpHash } = await treasuryWallet.buildMultisigUserOp(
        [{ to: getAddress(FAUCET_TOKEN_ADDRESS), data: transferData }],
        { callGasLimit: 2_000_000n },
      );

      // 1: Sign with only General Counsel
      setStep6ActiveIdx(1);
      const signerGC = privateKeyToAccount(boardMembers[2].privateKey);
      const signerCFO = privateKeyToAccount(boardMembers[1].privateKey);
      const sigGC = await signerGC.sign({ hash: userOpHash as `0x${string}` });

      // 2: Submit disclosure via CFO
      setStep6ActiveIdx(2);
      const cfoWalletClient = createWalletClient({
        account: signerCFO,
        chain: sepolia,
        transport: http(RPC_URL),
      });

      const disclosureTxHash = await cfoWalletClient.writeContract({
        abi: MULTISIG_VALIDATOR_ABI,
        address: MULTISIG_VALIDATOR_ADDRESS,
        functionName: 'requestDiscloseOperation',
        args: [
          treasuryWallet.address,
          userOpHash as `0x${string}`,
          [signerGC.address as Hex],
          [signerHandles[2] as `0x${string}`],
          [sigGC],
        ],
        gas: 3_000_000n,
      });

      const pc = createPublicClient({ chain: sepolia, transport: http(RPC_URL) });
      const receipt = await pc.waitForTransactionReceipt({ hash: disclosureTxHash });

      let eboolHandle: Hex | undefined;
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() === MULTISIG_VALIDATOR_ADDRESS.toLowerCase()) {
          if (log.data && log.data.length >= 66) {
            eboolHandle = log.data.slice(0, 66) as Hex;
            break;
          }
        }
      }
      if (!eboolHandle) throw new Error('No ebool handle found in disclosure event');

      // 3: Wait for proof (proof of FALSE)
      setStep6ActiveIdx(3);
      const proof = await treasuryWallet.waitForDisclosureProof(eboolHandle);

      // 4: Try to submit — should fail
      setStep6ActiveIdx(4);
      await treasuryWallet.submitWithProof(userOp, signerCFO.address, proof);

      // If we get here, something unexpected happened
      setStep6Error('Unexpected: submission succeeded with insufficient signatures');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStep6Error(msg);
    } finally {
      setStep6Loading(false);
      setStep6Attempted(true);
    }
  };

  // ── Copy helper ──
  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Visibility ──────────────────────────────────────────────────────
  const showVantagePreview = !visibleStep || visibleStep === 'vantage-preview';
  const showNameAuthorities = !visibleStep || visibleStep === 'name-authorities';
  const showDeployFund = !visibleStep || visibleStep === 'deploy-fund';
  const showInstallGov = !visibleStep || visibleStep === 'install-governance';
  const showHandOver = !visibleStep || visibleStep === 'hand-over-control';
  const showAuthorized = !visibleStep || visibleStep === 'authorized-transfer';
  const showBlocked = !visibleStep || visibleStep === 'blocked-transfer';
  const showVantageLive = !visibleStep || visibleStep === 'vantage-live';

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 pt-4">
      {/* Explainer */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle className="font-medium">Confidential Multisig Governance</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          Deploy a treasury governed by 2-of-3 encrypted multisig. Signer identities and the approval
          threshold are encrypted on-chain using FHE — nobody can see who the signers are or how many
          are needed. Deploy, configure, capitalize, then hand over control.
        </AlertDescription>
      </Alert>

      {/* ── Vantage Points Preview — shown at start ── */}
      {showVantagePreview && (
        <VantagePoints
          treasuryAddress=""
          balance={null}
          signerNames={[
            { role: 'CEO', address: '0x0000...0000' },
            { role: 'CFO', address: '0x0000...0000' },
            { role: 'General Counsel', address: '0x0000...0000' },
          ]}
          signerHandles={[]}
          preview
          onComplete={() => { onMilestone?.('preview-seen'); onAdvance?.(); }}
        />
      )}

      {/* ── Treasury Governance Summary — shown only on transfer steps ── */}
      {treasuryWallet && multisigInstalled && ecdsaRemoved && boardMembers && (showAuthorized || showBlocked) && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              <CardTitle className="text-green-800">Treasury Governance</CardTitle>
            </div>
            <CardDescription className="text-green-700">
              Setup complete. The treasury is governed by {threshold}-of-{boardMembers.length} encrypted multisig. No admin backdoor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-green-200 bg-white p-3 col-span-2">
                <div className="text-xs text-muted-foreground">Treasury Address</div>
                <div className="font-mono text-sm mt-1">{treasuryWallet.address.slice(0, 10)}...{treasuryWallet.address.slice(-8)}</div>
              </div>
              {boardMembers.map((m, i) => (
                <div key={m.address} className="rounded-lg border border-green-200 bg-white p-3">
                  <div className="text-xs text-muted-foreground">{ROLE_NAMES[i]}{i === 1 ? ' (gas relayer)' : ''}</div>
                  <div className="font-mono text-sm mt-1">{m.address.slice(0, 10)}...{m.address.slice(-8)}</div>
                </div>
              ))}
              <div className="rounded-lg border border-green-200 bg-white p-3">
                <div className="text-xs text-muted-foreground">Threshold</div>
                <div className="text-sm mt-1 font-medium">{threshold} of {boardMembers.length}</div>
              </div>
              <div className="rounded-lg border border-green-200 bg-white p-3">
                <div className="text-xs text-muted-foreground">Admin (ECDSA)</div>
                <div className="text-sm mt-1 font-medium text-green-700">Removed</div>
              </div>
            </div>

            {/* Treasury balance */}
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline" size="sm"
                  onClick={() => decryptTreasuryBalance(setTreasuryBalanceLoading, setTreasuryBalance)}
                  disabled={treasuryBalanceLoading}
                >
                  {treasuryBalanceLoading ? (
                    <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Decrypting...</span>
                  ) : (
                    <span className="flex items-center gap-2"><Eye className="h-4 w-4" /> {treasuryBalance !== null ? 'Refresh Balance' : 'Decrypt Treasury Balance'}</span>
                  )}
                </Button>
                <span className="text-[10px] text-muted-foreground">no gas — decrypts via Zama Gateway</span>
              </div>
              <DecryptTimer active={treasuryBalanceLoading} />
              {treasuryBalance !== null && (
                <div className={`flex items-center justify-between rounded-lg border px-4 py-2 ${treasuryBalanceRevealed ? 'border-green-200 bg-white' : 'bg-white'}`}>
                  <div>
                    <div className="text-xs text-muted-foreground">Treasury Balance (cTEST)</div>
                    <div className={`text-lg font-bold font-mono ${treasuryBalanceRevealed ? 'text-green-800' : ''}`}>
                      {treasuryBalanceRevealed ? formatBalance(treasuryBalance) : '\u2022\u2022\u2022\u2022\u2022\u2022'}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setTreasuryBalanceRevealed(!treasuryBalanceRevealed)}>
                    {treasuryBalanceRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Resume / Fresh prompt ── */}
      {savedSession && !boardMembers && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <CardTitle>Previous Session Found</CardTitle>
            </div>
            <CardDescription>
              Treasury <span className="font-mono text-xs">{savedSession.treasuryAddress.slice(0, 10)}...{savedSession.treasuryAddress.slice(-8)}</span> with {savedSession.boardMembers.length} signing authorities.
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

      {/* ── Step 1: Name the Signatories ── */}
      {!savedSession && showNameAuthorities && (
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle>Name the Signatories</CardTitle>
          </div>
          <CardDescription>
            In a confidential multisig, signer identities and the approval threshold are encrypted
            on-chain using FHE. Nobody — not even blockchain validators — can see who the signers
            are or how many are needed. For this demo, we generate three signing keys in your browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {boardMembers ? (
            <div className="space-y-3">
              {/* Role table */}
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Role</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Address</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Authority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boardMembers.map((m, i) => (
                      <tr key={m.address} className={i === 1 ? 'bg-primary/5' : ''}>
                        <td className="px-4 py-2 font-medium">{ROLE_NAMES[i]}</td>
                        <td className="px-4 py-2 font-mono text-xs">{m.address.slice(0, 10)}...{m.address.slice(-8)}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">Signing authority</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-2 rounded-lg border px-4 py-2 bg-muted/50">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Threshold: <strong>{threshold} of {boardMembers.length}</strong></span>
              </div>

              <p className="text-xs text-muted-foreground">
                Identities and threshold are encrypted before leaving your browser.
              </p>

              {onAdvance && (
                <Button onClick={onAdvance} className="w-full">
                  Next Step <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg border px-4 py-2 bg-muted/50">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Threshold: <strong>2 of 3</strong></span>
              </div>
              <p className="text-xs text-muted-foreground">
                Identities and threshold are encrypted before leaving your browser.
              </p>
              <Button onClick={handleGenerateBoard} className="w-full">
                <span className="flex items-center gap-2"><Key className="h-4 w-4" /> Generate Signing Keys</span>
              </Button>
            </div>
          )}

        </CardContent>
      </Card>
      )}


      {boardMembers && (
        <>
          {/* ── Step 2: Deploy & Fund ── */}
          {showDeployFund && (
          <Card className={(treasuryFunded || completedMilestones.includes('treasury-deployed')) ? 'border-green-300 bg-green-50/30' : ''}>
            <CardHeader>
              <div className="flex items-center gap-2">
                {(treasuryFunded || completedMilestones.includes('treasury-deployed')) ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Wallet className="h-5 w-5 text-primary" />}
                <CardTitle>Deploy & Fund Treasury</CardTitle>
              </div>
              <CardDescription>
                The treasury is a new smart account, separate from your personal account. Your
                connected wallet deploys it, funds it with ETH and 100 cTEST, and funds the CFO
                with gas for signature submission.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {treasuryWallet && step2TxHash ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                    <div>
                      <div className="text-xs text-green-700">Treasury Address</div>
                      <button
                        onClick={() => copyAddress(treasuryWallet.address)}
                        className="flex items-center gap-1.5 font-mono text-sm hover:text-primary transition-colors cursor-pointer"
                      >
                        {treasuryWallet.address.slice(0, 10)}...{treasuryWallet.address.slice(-8)}
                        {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                      </button>
                    </div>
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
                      Treasury deployed & capitalized with 100 cTEST! Tx: <TxHashLink hash={step2TxHash} />
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <>
                  <Button onClick={handleDeployAndCapitalize} disabled={step2Loading || treasuryFunded || completedMilestones.includes('treasury-deployed')} className="w-full">
                    {step2Loading ? (
                      <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Deploying & Capitalizing...</span>
                    ) : (
                      <span className="flex items-center gap-2"><Wallet className="h-4 w-4" /> Deploy & Fund Treasury</span>
                    )}
                  </Button>
                  {step2ActiveIdx >= 0 && (
                    <StepProgress steps={mapStepStatus(step2SubSteps, step2ActiveIdx)} />
                  )}
                </>
              )}
              {step2Error && <Alert variant="destructive"><AlertDescription>{step2Error}</AlertDescription></Alert>}

              {(treasuryFunded || completedMilestones.includes('treasury-deployed')) && onAdvance && (
                <Button onClick={onAdvance} className="w-full">
                  Next Step <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </CardContent>
          </Card>
          )}

          {/* ── Step 3: Install Encrypted Governance ── */}
          {showInstallGov && (
          <Card className={completedMilestones.includes('governance-installed') ? 'border-green-300 bg-green-50/30' : ''}>
            <CardHeader>
              <div className="flex items-center gap-2">
                {completedMilestones.includes('governance-installed') ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Lock className="h-5 w-5 text-primary" />}
                <CardTitle>Install Encrypted Governance</CardTitle>
              </div>
              <CardDescription>
                The three signer identities and {threshold}-of-{boardMembers.length} threshold are
                encrypted using FHE before being stored on-chain. Even though the data is public,
                nobody can read who the signers are. All signers are automatically granted observer
                access to view treasury balances.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {completedMilestones.includes('governance-installed') ? (
                <div className="space-y-3">
                  <Alert className="border-green-200 bg-green-50">
                    <Shield className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700">Encrypted governance installed. Signer identities are ciphertexts on-chain.</AlertDescription>
                  </Alert>
                  {signerHandles.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground font-medium">What the world sees on-chain:</div>
                      {signerHandles.map((h, i) => (
                        <div key={h} className="rounded border px-3 py-2 bg-muted/50">
                          <span className="text-xs text-muted-foreground">{ROLE_NAMES[i]} &middot; </span>
                          <span className="font-mono text-xs">{h.slice(0, 14)}...{h.slice(-10)}</span>
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground italic">
                        These are the ciphertexts stored on-chain. The contract enforces rules it cannot read.
                      </p>
                    </div>
                  )}
                  {step3TxHash && (
                    <div className="text-xs text-muted-foreground">Tx: <TxHashLink hash={step3TxHash} /></div>
                  )}
                </div>
              ) : (
                <>
                  <Button
                    onClick={handleInstallMultisig}
                    disabled={step3Loading || !treasuryWallet || completedMilestones.includes('governance-installed')}
                    className="w-full"
                  >
                    {step3Loading ? (
                      <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Installing...</span>
                    ) : (
                      <span className="flex items-center gap-2"><Lock className="h-4 w-4" /> Install Encrypted Governance</span>
                    )}
                  </Button>
                  {step3ActiveIdx >= 0 && (
                    <StepProgress steps={mapStepStatus(step3SubSteps, step3ActiveIdx)} />
                  )}
                </>
              )}
              {step3Error && <Alert variant="destructive"><AlertDescription>{step3Error}</AlertDescription></Alert>}

              {completedMilestones.includes('governance-installed') && onAdvance && (
                <Button onClick={onAdvance} className="w-full">
                  Next Step <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </CardContent>
          </Card>
          )}

          {/* ── Step 4: Hand Over Control ── */}
          {showHandOver && (
          <Card className={completedMilestones.includes('control-handed-over') ? 'border-green-300 bg-green-50/30' : 'border-amber-300/50'}>
            <CardHeader>
              <div className="flex items-center gap-2">
                {completedMilestones.includes('control-handed-over') ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <AlertTriangle className="h-5 w-5 text-amber-600" />}
                <CardTitle>Hand Over Control</CardTitle>
              </div>
              <CardDescription>
                Once admin access is removed, your connected wallet has no authority over this treasury.
                The only path to authorizing a transaction is a 2-of-3 approval — enforced by the
                encrypted validator.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {completedMilestones.includes('control-handed-over') ? (
                <div className="space-y-3">
                  <Alert className="border-green-200 bg-green-50">
                    <Shield className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">No single party can authorize a transaction.</AlertTitle>
                    <AlertDescription className="text-green-700 text-xs">
                      The ECDSA validator has been uninstalled. The connected wallet no longer has any
                      special access to this treasury. Only the encrypted 2-of-3 multisig can authorize transactions.
                      {step4TxHash && <span className="block mt-1">Tx: <TxHashLink hash={step4TxHash} /></span>}
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <div className="space-y-3">
                  {!step4Confirmed ? (
                    <div className="space-y-3">
                      <Alert className="border-amber-300 bg-amber-50">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-700 text-xs">
                          Once admin access is removed, your connected wallet has no authority over this
                          treasury. The only path to authorizing a transaction is a 2-of-3 approval —
                          enforced by the encrypted validator.
                        </AlertDescription>
                      </Alert>
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={step4Confirmed}
                          onChange={(e) => setStep4Confirmed(e.target.checked)}
                          className="mt-1"
                          disabled={!multisigInstalled || !treasuryWallet}
                        />
                        <span className="text-sm text-muted-foreground">
                          I understand this is irreversible. After removal, only the 2-of-3 encrypted multisig can authorize transactions.
                        </span>
                      </label>
                    </div>
                  ) : (
                    <Button
                      onClick={handleRemoveEcdsa}
                      disabled={step4Loading}
                      variant="outline"
                      className="w-full border-red-300 text-red-700 hover:bg-red-50"
                    >
                      {step4Loading ? (
                        <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Removing admin access...</span>
                      ) : (
                        <span className="flex items-center gap-2"><Ban className="h-4 w-4" /> Confirm — Remove Access</span>
                      )}
                    </Button>
                  )}
                  {step4Error && <Alert variant="destructive"><AlertDescription>{step4Error}</AlertDescription></Alert>}
                </div>
              )}

              {completedMilestones.includes('control-handed-over') && onAdvance && (
                <Button onClick={onAdvance} className="w-full">
                  Next Step <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </CardContent>
          </Card>
          )}

          {/* ── Authorized Transfer (CFO + General Counsel) ── */}
          {showAuthorized && (
          <Card className={(step5TxHash || completedMilestones.includes('transfer-approved')) ? 'border-green-300 bg-green-50/30' : 'border-primary/20'}>
            <CardHeader>
              <div className="flex items-center gap-2">
                {(step5TxHash || completedMilestones.includes('transfer-approved')) ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Vote className="h-5 w-5 text-primary" />}
                <CardTitle>Authorized Transfer</CardTitle>
              </div>
              <CardDescription>
                CEO and CFO co-sign the proposal, meeting the {threshold}-of-{boardMembers.length} threshold.
                The signatures are submitted to the FHE validator, which checks — entirely in
                encrypted space — whether enough valid signers approved. The Zama Gateway decrypts
                the result into a cryptographic proof, attached to the transaction for on-chain
                verification. Nobody sees who signed or what the threshold was.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Recipient</label>
                  <button
                    onClick={() => setTransferRecipient(eoaAddress ?? '')}
                    className="text-xs text-primary hover:underline cursor-pointer"
                    disabled={step5Loading}
                  >
                    Use connected wallet
                  </button>
                </div>
                <Input
                  placeholder={eoaAddress ?? '0x...'}
                  value={transferRecipient}
                  onChange={(e) => setTransferRecipient(e.target.value)}
                  className="font-mono text-sm"
                  disabled={step5Loading}
                />
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="number" step="0.1" min="0" value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-32" disabled={step5Loading}
                />
                <span className="text-sm text-muted-foreground">cTEST</span>
              </div>

              {/* Progress checklist */}
              {step5ActiveIdx >= 0 && !step5TxHash && (
                <StepProgress steps={mapStepStatus(step5SubSteps, step5ActiveIdx)} />
              )}
              {step5ActiveIdx === 4 && !step5TxHash && (
                <DecryptTimer active={true} />
              )}

              <Button
                onClick={handleAuthorizedTransfer}
                disabled={step5Loading || !ecdsaRemoved || !treasuryWallet}
                className="w-full"
              >
                {step5Loading ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Processing...</span>
                ) : step5TxHash ? (
                  'Authorize Another Transfer'
                ) : (
                  <span className="flex items-center gap-2"><Vote className="h-4 w-4" /> Authorize Transfer</span>
                )}
              </Button>

              {step5TxHash && (
                <div className="space-y-3">
                  <Alert className="border-green-200 bg-green-50">
                    <Shield className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">Authorized transfer complete</AlertTitle>
                    <AlertDescription className="text-green-700 text-xs">
                      The {threshold}-of-{boardMembers.length} multisig approved and executed the transfer.
                      The entire validation happened in encrypted space.
                      <span className="block mt-1">Tx: <TxHashLink hash={step5TxHash} /></span>
                    </AlertDescription>
                  </Alert>

                  {/* Inline balance verification */}
                  <div className="space-y-1">
                    <Button
                      variant="outline" size="sm"
                      onClick={() => decryptTreasuryBalance(setStep5BalanceLoading, setStep5BalanceAfter)}
                      disabled={step5BalanceLoading}
                    >
                      {step5BalanceLoading ? (
                        <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Decrypting...</span>
                      ) : (
                        <span className="flex items-center gap-2"><Eye className="h-4 w-4" /> Verify — Decrypt Treasury Balance</span>
                      )}
                    </Button>
                    <p className="text-[10px] text-muted-foreground">no gas — decrypts via Zama Gateway</p>
                  </div>
                  <DecryptTimer active={step5BalanceLoading} />
                  {step5BalanceAfter !== null && (
                    <div className={`flex items-center justify-between rounded-lg border px-4 py-2 ${step5BalanceRevealed ? 'border-green-200 bg-green-50' : ''}`}>
                      <div>
                        <div className="text-xs text-muted-foreground">Treasury Balance After Transfer</div>
                        <div className={`text-lg font-bold font-mono ${step5BalanceRevealed ? 'text-green-800' : ''}`}>
                          {step5BalanceRevealed ? `${formatBalance(step5BalanceAfter)} cTEST` : '\u2022\u2022\u2022\u2022\u2022\u2022'}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setStep5BalanceRevealed(!step5BalanceRevealed)}>
                        {step5BalanceRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  )}
                  {step5BalanceBefore !== null && step5BalanceAfter !== null && step5BalanceRevealed && (
                    <div className="text-xs text-muted-foreground text-center">
                      Before: {formatBalance(step5BalanceBefore)} <ArrowRight className="inline h-3 w-3" /> After: {formatBalance(step5BalanceAfter)} cTEST
                      (sent {formatBalance(step5BalanceBefore - step5BalanceAfter)})
                    </div>
                  )}
                </div>
              )}
              {step5Error && <Alert variant="destructive"><AlertDescription>{step5Error}</AlertDescription></Alert>}

              {(step5TxHash || completedMilestones.includes('transfer-approved')) && onAdvance && (
                <Button onClick={onAdvance} className="w-full">
                  Next Step <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </CardContent>
          </Card>
          )}

          {/* ── Blocked Transfer (CEO alone) ── */}
          {showBlocked && (
          <Card className={step6Attempted && step6Error ? 'border-green-300 bg-green-50/30' : 'border-destructive/20'}>
            <CardHeader>
              <div className="flex items-center gap-2">
                {step6Attempted && step6Error ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Ban className="h-5 w-5 text-destructive" />}
                <CardTitle>Blocked Transfer</CardTitle>
              </div>
              <CardDescription>
                What happens when the threshold is not met? The CEO alone attempts a 0.5 cTEST transfer
                (1 of {boardMembers.length}) — below the {threshold}-of-{boardMembers.length} threshold.
                The FHE validator detects the insufficiency in encrypted space, and the transaction is blocked.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {step6ActiveIdx >= 0 && !step6Attempted && (
                <StepProgress steps={mapStepStatus(step6SubSteps, step6ActiveIdx)} />
              )}
              {step6ActiveIdx === 3 && !step6Attempted && (
                <DecryptTimer active={true} />
              )}

              <Button
                onClick={handleBlockedTransfer}
                disabled={step6Loading || !ecdsaRemoved || !treasuryWallet}
                variant="outline"
                className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
              >
                {step6Loading ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Running blocked transfer demo...</span>
                ) : (
                  <span className="flex items-center gap-2"><Ban className="h-4 w-4" /> Attempt Transfer — 1 Signature</span>
                )}
              </Button>

              {step6Attempted && step6Error && (
                <div className="space-y-3">
                  <Alert className="border-green-200 bg-green-50">
                    <Shield className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">Insufficient signatures — rejected</AlertTitle>
                    <AlertDescription className="text-green-700 text-xs">
                      The FHE validator compared the encrypted signature count against the encrypted
                      threshold — the result was <strong>false</strong>. The Zama Gateway produced a
                      proof of rejection, and the transaction was blocked. Even the failure reveals
                      nothing about the threshold or signers.
                    </AlertDescription>
                  </Alert>

                  {/* Inline balance verification */}
                  <div className="space-y-1">
                    <Button
                      variant="outline" size="sm"
                      onClick={() => decryptTreasuryBalance(setStep6BalanceLoading, setStep6BalanceAfter)}
                      disabled={step6BalanceLoading}
                    >
                      {step6BalanceLoading ? (
                        <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Decrypting...</span>
                      ) : (
                        <span className="flex items-center gap-2"><Eye className="h-4 w-4" /> Verify — Balance Unchanged</span>
                      )}
                    </Button>
                    <p className="text-[10px] text-muted-foreground">no gas — decrypts via Zama Gateway</p>
                  </div>
                  <DecryptTimer active={step6BalanceLoading} />
                  {step6BalanceAfter !== null && (
                    <div className={`flex items-center justify-between rounded-lg border px-4 py-2 ${step6BalanceRevealed ? 'border-green-200 bg-green-50' : ''}`}>
                      <div>
                        <div className="text-xs text-muted-foreground">Treasury Balance (unchanged)</div>
                        <div className={`text-lg font-bold font-mono ${step6BalanceRevealed ? 'text-green-800' : ''}`}>
                          {step6BalanceRevealed ? `${formatBalance(step6BalanceAfter)} cTEST` : '\u2022\u2022\u2022\u2022\u2022\u2022'}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setStep6BalanceRevealed(!step6BalanceRevealed)}>
                        {step6BalanceRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  )}
                  {step6BalanceBefore !== null && step6BalanceAfter !== null && step6BalanceRevealed && (
                    <div className="text-xs text-muted-foreground text-center">
                      Before: {formatBalance(step6BalanceBefore)} &rarr; After: {formatBalance(step6BalanceAfter)} cTEST
                      {step6BalanceBefore === step6BalanceAfter ? ' (no change — blocked)' : ''}
                    </div>
                  )}
                </div>
              )}

              {step6Attempted && step6Error && onAdvance && (
                <Button onClick={onAdvance} className="w-full">
                  Next Step <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </CardContent>
          </Card>
          )}

          {/* ── Four Vantage Points (Live) ── */}
          {showVantageLive && (
            <VantagePoints
              treasuryAddress={treasuryWallet?.address ?? ''}
              balance={treasuryBalance}
              signerNames={[
                { role: 'CEO', address: boardMembers?.[0]?.address ?? '' },
                { role: 'CFO', address: boardMembers?.[1]?.address ?? '' },
                { role: 'General Counsel', address: boardMembers?.[2]?.address ?? '' },
              ]}
              signerHandles={signerHandles}
              onComplete={() => onMilestone?.('vantage-complete')}
            />
          )}
        </>
      )}
    </div>
  );
}
