import { useState } from 'react';
import { type Address, type Hash, type Hex, isAddress, encodeFunctionData, getAddress } from 'viem';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { useWallet } from '../hooks/useWallet';
import { ZamaConfidentialProvider } from '@zama-accounts/sdk';
import TxHashLink from './TxHashLink';

import DecryptTimer from './DecryptTimer';
import StepProgress, { mapStepStatus } from './StepProgress';
import { FAUCET_TOKEN_ADDRESS } from '../config/constants';
import { Lock, Eye, EyeOff, Loader2, Shield, Coins, Copy, ExternalLink, CheckCircle2, RefreshCw, ArrowRight } from 'lucide-react';

const FAUCET_MINT_ABI = [
  {
    name: 'mint',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'encryptedAmount', type: 'bytes32' },
      { name: 'inputProof', type: 'bytes' },
    ],
    outputs: [],
  },
] as const;

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

export default function ConfidentialTransfersTab({ onMilestone, transfersComplete, onContinue, visibleStep, onAdvance }: {
  onMilestone?: (event: 'minted' | 'transferred' | 'decrypted') => void;
  /** When true, show the transition card at the bottom */
  transfersComplete?: boolean;
  /** Called when user clicks "Continue to Observers" */
  onContinue?: () => void;
  /** Which step to show. When set, only that step's card is rendered. */
  visibleStep?: 'mint' | 'transfer' | 'decrypt';
  /** Called when user wants to advance to the next step */
  onAdvance?: () => void;
} = {}) {
  const { wallet } = useWallet();
  const { address: eoaAddress } = useAccount();

  // ── Step 1: Mint ──
  const [mintAmount, setMintAmount] = useState('100');
  const [minting, setMinting] = useState(false);
  const [mintTxHash, setMintTxHash] = useState<Hash | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);
  const [mintActiveIdx, setMintActiveIdx] = useState(-1);

  // Step 1 inline balance
  const [mintBalance, setMintBalance] = useState<bigint | null>(null);
  const [mintBalanceLoading, setMintBalanceLoading] = useState(false);
  const [mintBalanceRevealed, setMintBalanceRevealed] = useState(false);
  const [mintBalanceRetryStatus, setMintBalanceRetryStatus] = useState<string | null>(null);

  // ── Step 2: Transfer ──
  const [recipient, setRecipient] = useState('');
  const [transferAmount, setTransferAmount] = useState('1');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferActiveIdx, setTransferActiveIdx] = useState(-1);
  const [txHash, setTxHash] = useState<Hash | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Step 2 inline balance
  const [postBalance, setPostBalance] = useState<bigint | null>(null);
  const [postBalanceLoading, setPostBalanceLoading] = useState(false);
  const [postBalanceRevealed, setPostBalanceRevealed] = useState(false);
  const [postBalanceRetryStatus, setPostBalanceRetryStatus] = useState<string | null>(null);

  // Top-level balance
  const [topBalance, setTopBalance] = useState<bigint | null>(null);
  const [topBalanceLoading, setTopBalanceLoading] = useState(false);
  const [topBalanceRevealed, setTopBalanceRevealed] = useState(false);
  const [topBalanceRetryStatus, setTopBalanceRetryStatus] = useState<string | null>(null);

  // Token address copy
  const [tokenCopied, setTokenCopied] = useState(false);
  const copyTokenAddress = () => {
    navigator.clipboard.writeText(FAUCET_TOKEN_ADDRESS);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  };

  // ── Decrypt helper ──
  const handleCheckBalance = async (
    setLoading: (v: boolean) => void,
    setBal: (v: bigint | null) => void,
    setRevealed: (v: boolean) => void,
    setRetry: (v: string | null) => void,
  ) => {
    if (!wallet) return;
    setLoading(true);
    setBal(null);
    setRevealed(false);
    setRetry(null);
    const MAX_RETRIES = 5;
    const RETRY_DELAY_MS = 20_000;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const bal = await wallet.getConfidentialBalance(getAddress(FAUCET_TOKEN_ADDRESS));
        setBal(bal);
        setRetry(null);
        setLoading(false);
        onMilestone?.('decrypted');
        return;
      } catch (e) {
        console.error(`Balance check failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, e);
        if (attempt < MAX_RETRIES) {
          setRetry(`Waiting for Zama relayer... (retry ${attempt + 1}/${MAX_RETRIES})`);
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        } else {
          setRetry('Decrypt failed after retries. The Zama relayer may still be processing — try again later.');
        }
      }
    }
    setLoading(false);
  };

  // ── Step 1: Mint ──
  const mintSubSteps = [
    { label: 'Encrypt mint amount', tag: 'no gas' as const, detail: 'Client-side FHE encryption' },
    { label: 'Mint cTEST tokens', tag: 'gas' as const, detail: 'Confirm in wallet' },
    { label: 'Grant decryption access', tag: 'gas' as const, detail: 'Confirm in wallet — allows you to read your encrypted balance' },
  ];

  const handleMint = async () => {
    if (!wallet || !mintAmount) return;
    setMinting(true);
    setMintError(null);
    setMintTxHash(null);
    setMintActiveIdx(0);
    try {
      const signerAddress = wallet.address;
      const provider = new ZamaConfidentialProvider({
        chainId: wallet.chain.id,
        signer: { address: signerAddress, signTypedData: async () => '0x' as Hex },
      });

      const { handle, inputProof } = await provider.encrypt64(
        getAddress(FAUCET_TOKEN_ADDRESS),
        signerAddress,
        toBaseUnits(mintAmount),
      );

      const mintData = encodeFunctionData({
        abi: FAUCET_MINT_ABI,
        functionName: 'mint',
        args: [signerAddress, handle as `0x${string}`, inputProof as `0x${string}`],
      });

      setMintActiveIdx(1);
      const hash = await wallet.executeRaw(
        [{ to: getAddress(FAUCET_TOKEN_ADDRESS), value: 0n, data: mintData }],
        { callGasLimit: 1_000_000n },
      );

      setMintActiveIdx(2);
      const { createPublicClient: createPC, http: httpTransport } = await import('viem');
      const { sepolia } = await import('wagmi/chains');
      const pc = createPC({ chain: sepolia, transport: httpTransport() });
      const balanceHandle = await pc.readContract({
        abi: [{ type: 'function', name: 'confidentialBalanceOf', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'bytes32' }], stateMutability: 'view' }] as const,
        address: getAddress(FAUCET_TOKEN_ADDRESS),
        functionName: 'confidentialBalanceOf',
        args: [wallet.address],
      }) as Hex;
      console.log('[Mint] Balance handle:', balanceHandle);
      if (balanceHandle && balanceHandle !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        const aclAddress = '0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D' as Address;
        const allowData = encodeFunctionData({
          abi: [{ type: 'function', name: 'allow', inputs: [{ name: 'handle', type: 'bytes32' }, { name: 'account', type: 'address' }], outputs: [], stateMutability: 'nonpayable' }] as const,
          functionName: 'allow',
          args: [balanceHandle, eoaAddress!],
        });
        console.log('[Mint] Sending ACL allow UserOp...');
        await wallet.executeRaw([{ to: aclAddress, data: allowData }], { callGasLimit: 200_000n });
        console.log('[Mint] ACL allow complete');
      } else {
        console.log('[Mint] No balance handle found — skipping ACL grant');
      }

      setMintActiveIdx(3);
      setMintTxHash(hash);
      onMilestone?.('minted');
    } catch (e) {
      setMintError(e instanceof Error ? e.message : String(e));
    } finally {
      setMinting(false);
    }
  };

  // ── Step 2: Transfer ──
  const transferSubSteps = [
    { label: 'Encrypt transfer amount', tag: 'no gas' as const, detail: 'Client-side FHE encryption' },
    { label: 'Submit encrypted UserOperation', tag: 'gas' as const, detail: 'Confirm in wallet — amount is hidden from everyone' },
  ];

  const handleTransfer = async () => {
    if (!wallet || !isAddress(recipient) || !transferAmount) return;
    setError(null);
    setTxHash(null);
    setTransferLoading(true);
    setTransferActiveIdx(0);
    try {
      // Save balance before for comparison
      try {
        const bal = await wallet.getConfidentialBalance(getAddress(FAUCET_TOKEN_ADDRESS));
        setMintBalance(bal);
      } catch { /* ok */ }

      setTransferActiveIdx(1);
      const result = await wallet.sendConfidential(
        getAddress(FAUCET_TOKEN_ADDRESS),
        getAddress(recipient as Address),
        toBaseUnits(transferAmount),
      );
      setTransferActiveIdx(2);
      setTxHash(result.transactionHash);
      onMilestone?.('transferred');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setTransferLoading(false);
    }
  };

  const showMint = !visibleStep || visibleStep === 'mint';
  const showTransfer = !visibleStep || visibleStep === 'transfer';
  const showDecrypt = !visibleStep || visibleStep === 'decrypt';

  return (
    <div className="space-y-4 pt-4">
      {/* Explainer */}
      <Alert>
        <Lock className="h-4 w-4" />
        <AlertTitle className="font-medium">Fully Homomorphic Encryption</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          Amounts are encrypted client-side using Zama FHE before hitting the chain.
          The contract processes encrypted values — no one sees the actual amount, not even validators.
        </AlertDescription>
      </Alert>

      {/* Token info + balance — show when decrypt step is visible */}
      {showDecrypt && (
        <div className="rounded-lg border px-4 py-3 space-y-2.5">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-primary" />
              <span className="font-medium">cTEST</span>
              <span className="text-muted-foreground">Confidential Test Token</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={copyTokenAddress}
                className="flex items-center gap-1.5 font-mono text-xs hover:text-primary transition-colors cursor-pointer"
              >
                {FAUCET_TOKEN_ADDRESS.slice(0, 8)}...{FAUCET_TOKEN_ADDRESS.slice(-6)}
                {tokenCopied ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
              <a
                href={`https://sepolia.etherscan.io/address/${FAUCET_TOKEN_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {topBalance !== null ? (
              <div className={`flex items-center gap-2 rounded border px-3 py-1.5 ${topBalanceRevealed ? 'border-green-200 bg-green-50' : ''}`}>
                <span className={`font-mono text-sm font-medium ${topBalanceRevealed ? 'text-green-800' : ''}`}>
                  {topBalanceRevealed ? `${formatBalance(topBalance)} cTEST` : '\u2022\u2022\u2022\u2022\u2022\u2022'}
                </span>
                <button onClick={() => setTopBalanceRevealed(!topBalanceRevealed)} className="cursor-pointer text-muted-foreground hover:text-primary">
                  {topBalanceRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            ) : null}
            <Button
              variant="outline" size="sm"
              onClick={() => handleCheckBalance(setTopBalanceLoading, setTopBalance, setTopBalanceRevealed, setTopBalanceRetryStatus)}
              disabled={topBalanceLoading || !wallet}
            >
              {topBalanceLoading ? (
                <span className="flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Decrypting...</span>
              ) : (
                <span className="flex items-center gap-2">
                  {topBalance !== null ? <RefreshCw className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {topBalance !== null ? 'Refresh' : 'Decrypt Balance'}
                </span>
              )}
            </Button>
            <span className="text-[10px] text-muted-foreground">no gas — decrypts via Zama Gateway</span>
          </div>
          <DecryptTimer active={topBalanceLoading} retryStatus={topBalanceRetryStatus} />
        </div>
      )}

      {/* ── Step 1: Mint + Decrypt ── */}
      {showMint && (
        <Card className={mintTxHash ? 'border-green-300 bg-green-50/30' : ''}>
          <CardHeader>
            <div className="flex items-center gap-2">
              {mintTxHash ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Coins className="h-5 w-5 text-primary" />}
              <CardTitle>Mint Confidential Tokens</CardTitle>
            </div>
            <CardDescription>
              Mint cTEST tokens to your smart account. The amount is FHE-encrypted before submission.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                type="number" min="0" step="0.1"
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value)}
                placeholder="1.0"
                className="flex-1"
                disabled={minting}
              />
              <Button onClick={handleMint} disabled={minting || !mintAmount}>
                {minting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Minting...
                  </span>
                ) : (
                  'Mint to My Account'
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Enter amount in cTEST (e.g. 1.0, 0.5)</p>

            {mintActiveIdx >= 0 && !mintTxHash && (
              <StepProgress steps={mapStepStatus(mintSubSteps, mintActiveIdx)} />
            )}

            {mintTxHash && (
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-700">
                  Minted! Tx: <TxHashLink hash={mintTxHash} />
                </AlertDescription>
              </Alert>
            )}
            {mintError && (
              <Alert variant="destructive">
                <AlertDescription>{mintError}</AlertDescription>
              </Alert>
            )}

            {/* Inline decrypt after mint */}
            {mintTxHash && (
              <div className="space-y-2">
                <div className="space-y-1">
                  <Button
                    variant="outline" size="sm"
                    onClick={() => handleCheckBalance(setMintBalanceLoading, setMintBalance, setMintBalanceRevealed, setMintBalanceRetryStatus)}
                    disabled={mintBalanceLoading}
                  >
                    {mintBalanceLoading ? (
                      <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Decrypting...</span>
                    ) : (
                      <span className="flex items-center gap-2"><Eye className="h-4 w-4" /> Decrypt Balance</span>
                    )}
                  </Button>
                  <p className="text-[10px] text-muted-foreground">no gas — decrypts via Zama Gateway</p>
                </div>
                <DecryptTimer active={mintBalanceLoading} retryStatus={mintBalanceRetryStatus} />
                {mintBalance !== null && (
                  <div className={`flex items-center justify-between rounded-lg border px-4 py-3 ${mintBalanceRevealed ? 'border-green-200 bg-green-50' : ''}`}>
                    <div>
                      <div className="text-xs text-muted-foreground">Decrypted Balance (cTEST)</div>
                      <div className={`text-xl font-bold font-mono ${mintBalanceRevealed ? 'text-green-800' : ''}`}>
                        {mintBalanceRevealed ? `${formatBalance(mintBalance)} cTEST` : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setMintBalanceRevealed(!mintBalanceRevealed)}>
                      {mintBalanceRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {mintTxHash && onAdvance && (
              <Button onClick={onAdvance} className="w-full">
                Next Step <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Transfer + Decrypt ── */}
      {showTransfer && (
        <Card className={txHash ? 'border-green-300 bg-green-50/30' : 'border-primary/20'}>
          <CardHeader>
            <div className="flex items-center gap-2">
              {txHash ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Lock className="h-5 w-5 text-primary" />}
              <CardTitle>Send Confidential Transfer</CardTitle>
            </div>
            <CardDescription>
              Transfer cTEST tokens. The amount is encrypted — hidden from everyone on-chain.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Recipient</label>
                <button
                  onClick={() => setRecipient(FAUCET_TOKEN_ADDRESS)}
                  className="text-xs text-primary hover:underline cursor-pointer"
                  disabled={transferLoading}
                >
                  Use test address
                </button>
              </div>
              <Input
                placeholder="0x..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="font-mono text-sm"
                disabled={transferLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (cTEST)</label>
              <Input
                type="number" min="0" step="0.1" placeholder="0.5"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                disabled={transferLoading}
              />
            </div>

            {transferActiveIdx >= 0 && !txHash && (
              <StepProgress steps={mapStepStatus(transferSubSteps, transferActiveIdx)} />
            )}

            <Button
              className="w-full"
              onClick={txHash ? () => { setTxHash(null); setTransferActiveIdx(-1); setPostBalance(null); } : handleTransfer}
              disabled={transferLoading || (!txHash && (!isAddress(recipient) || !transferAmount))}
            >
              {txHash ? 'Send Another' : transferLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Sending...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Lock className="h-4 w-4" /> Send Encrypted Transfer
                </span>
              )}
            </Button>

            {txHash && (
              <Alert className="border-green-200 bg-green-50">
                <Shield className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Encrypted transfer sent</AlertTitle>
                <AlertDescription className="text-green-700">
                  Tx: <TxHashLink hash={txHash} />
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {txHash && onAdvance && (
              <Button onClick={onAdvance} className="w-full">
                Next Step <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Continue to Observers — shown when all transfer milestones are hit */}
      {transfersComplete && onContinue && (
        <Button onClick={onContinue} className="w-full">
          Continue to Observers <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      )}
    </div>
  );
}
