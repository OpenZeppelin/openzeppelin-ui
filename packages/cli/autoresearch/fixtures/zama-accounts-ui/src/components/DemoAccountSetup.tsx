/**
 * Shared account creation step for all demos.
 * - If existingAddress is provided: auto-reconnects on mount (resume flow)
 * - Otherwise: shows "Create & Fund Account" button (new flow)
 * - If reconnect fails: shows error + create fallback
 */
import { useState, useEffect, useRef } from 'react';
import { type Address, type Hex, parseEther, getAddress } from 'viem';
import { useWalletClient, usePublicClient } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { AgentWallet, ZamaConfidentialProvider } from '@zama-accounts/sdk';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { createSigner } from '../lib/createSigner';
import { BUNDLER_URL, RPC_URL, FAUCET_TOKEN_ADDRESS, ACCOUNT_FUNDING_AMOUNT, SEPOLIA_FAUCETS } from '../config/constants';
import { useDemoSession, type DemoSession } from '../hooks/useDemoSession';
import { Loader2, CheckCircle2, Circle, ExternalLink, Rocket, ArrowRight } from 'lucide-react';

type SetupStep = 'predict' | 'fund' | 'deploy' | 'done';

interface DemoAccountSetupProps {
  /** Called when account is ready */
  onAccountCreated: (wallet: AgentWallet) => void;
  /** Optional builder customization (e.g., .confidentialMultisig()) */
  buildWallet?: (signer: ReturnType<typeof createSigner>, provider: ZamaConfidentialProvider) => ReturnType<typeof AgentWallet.builder>;
  /** If set, auto-reconnect to this address on mount (resume flow) */
  existingAddress?: string;
  /** Show "Use existing account" from other demos that meet criteria. Set to true to enable. */
  showReusableAccounts?: boolean;
  /** Card title override */
  title?: string;
  /** Card description override */
  description?: string;
}

/**
 * Accounts from other demos that are reusable: deployed + has minted tokens.
 * Excludes multisig types and accounts already claimed by another demo session.
 * An account can only be reused once — if any other session (besides the one that
 * created it) already references the same address, it's off the list.
 */
function getReusableAccounts(sessions: DemoSession[], currentInstanceId: string, connectedEOA: string): DemoSession[] {
  // Build a set of account addresses that are already used by a DIFFERENT session than the one that created them.
  // For each address, find the session that created it (earliest) and check if any other session reuses it.
  const addressUsageCounts = new Map<string, number>();
  for (const s of sessions) {
    if (s.accountAddress) {
      const addr = s.accountAddress.toLowerCase();
      addressUsageCounts.set(addr, (addressUsageCounts.get(addr) ?? 0) + 1);
    }
  }

  return sessions.filter((s) =>
    s.id !== currentInstanceId &&
    s.accountAddress &&
    s.ownerEOA === connectedEOA.toLowerCase() &&
    s.type !== 'multisig' &&
    s.type !== 'weighted-multisig' &&
    s.milestones?.includes('minted') &&
    // Only reusable if no other session has already claimed this address
    (addressUsageCounts.get(s.accountAddress.toLowerCase()) ?? 0) <= 1,
  );
}

function StepIndicator({ current, step, label }: { current: SetupStep; step: SetupStep; label: string }) {
  const steps: SetupStep[] = ['predict', 'fund', 'deploy', 'done'];
  const currentIdx = steps.indexOf(current);
  const stepIdx = steps.indexOf(step);
  const isDone = currentIdx > stepIdx;
  const isActive = current === step;

  return (
    <div className="flex items-center gap-3">
      {isDone ? (
        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
      ) : isActive ? (
        <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
      ) : (
        <Circle className="h-5 w-5 text-muted-foreground/30 shrink-0" />
      )}
      <span className={isDone ? 'text-muted-foreground' : isActive ? 'font-medium' : 'text-muted-foreground/50'}>
        {label}
      </span>
    </div>
  );
}

export default function DemoAccountSetup({
  onAccountCreated,
  buildWallet: customBuilder,
  existingAddress,
  showReusableAccounts = false,
  title = 'Create Smart Account',
  description = 'Deploy an ERC-7579 smart account with FHE decryption delegation. This takes ~15 seconds.',
}: DemoAccountSetupProps) {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { sessions, activeDemoId } = useDemoSession();
  const connectedEOA = walletClient?.account?.address ?? '';
  const reusableAccounts = showReusableAccounts && activeDemoId
    ? getReusableAccounts(sessions, activeDemoId, connectedEOA)
    : [];
  const [isCreating, setIsCreating] = useState(false);
  const [setupStep, setSetupStep] = useState<SetupStep | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [insufficientBalance, setInsufficientBalance] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectFailed, setReconnectFailed] = useState(false);
  const reconnectAttempted = useRef(false);

  // "Connected to reused account, confirm before proceeding" state
  const [pendingWallet, setPendingWallet] = useState<AgentWallet | null>(null);
  const [pendingLabel, setPendingLabel] = useState<string>('');
  const [balanceDecrypting, setBalanceDecrypting] = useState(false);
  const [decryptedBalance, setDecryptedBalance] = useState<bigint | null>(null);
  const [balanceRevealed, setBalanceRevealed] = useState(false);
  const [decryptError, setDecryptError] = useState<string | null>(null);

  const makeBuilder = (wc: NonNullable<typeof walletClient>) => {
    const signer = createSigner(wc);
    const confidentialProvider = new ZamaConfidentialProvider({
      chainId: sepolia.id,
      signer: {
        address: signer.address,
        signTypedData: signer.signTypedData,
      },
    });
    return customBuilder
      ? customBuilder(signer, confidentialProvider)
      : AgentWallet.builder()
          .chain(sepolia)
          .rpcUrl(RPC_URL)
          .signer(signer)
          .bundler({ url: BUNDLER_URL })
          .withConfidential(confidentialProvider);
  };

  // Auto-reconnect when resuming a session with an existing address
  useEffect(() => {
    if (!existingAddress || !walletClient || reconnectAttempted.current) return;
    reconnectAttempted.current = true;
    setReconnecting(true);
    setError(null);

    const reconnect = async () => {
      try {
        const builder = makeBuilder(walletClient);
        const w = await builder.connect(existingAddress as Address);

        // Ensure localStorage has the ownerEOA — ObserversTab needs it for ownership check
        const saved: Array<{ address: string; createdAt: number; ownerEOA?: string }> = JSON.parse(
          localStorage.getItem('zama-ui-accounts') || '[]',
        );
        const existing = saved.find((a) => a.address.toLowerCase() === w.address.toLowerCase());
        if (existing) {
          if (!existing.ownerEOA) {
            existing.ownerEOA = walletClient.account!.address;
            localStorage.setItem('zama-ui-accounts', JSON.stringify(saved));
          }
        } else {
          saved.push({ address: w.address, createdAt: Date.now(), ownerEOA: walletClient.account!.address });
          localStorage.setItem('zama-ui-accounts', JSON.stringify(saved));
        }

        onAccountCreated(w);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setReconnectFailed(true);
      } finally {
        setReconnecting(false);
      }
    };
    reconnect();
  }, [existingAddress, walletClient]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async () => {
    if (!walletClient || !publicClient) {
      setError('Wallet not ready. Please ensure your wallet is connected to Sepolia.');
      return;
    }
    setIsCreating(true);
    setError(null);
    setInsufficientBalance(false);
    setSetupStep('predict');

    try {
      const builder = makeBuilder(walletClient);
      const salt = ('0x' + Date.now().toString(16).padStart(64, '0')) as Hex;
      const w = await builder.create({ salt });

      setSetupStep('fund');
      const fundingAmount = parseEther(ACCOUNT_FUNDING_AMOUNT);
      const userBalance = await publicClient.getBalance({ address: walletClient.account!.address });
      if (userBalance < fundingAmount) {
        setInsufficientBalance(true);
        throw new Error(`Insufficient balance. You need at least ${ACCOUNT_FUNDING_AMOUNT} Sepolia ETH.`);
      }
      const balance = await publicClient.getBalance({ address: w.address });
      if (balance < parseEther('0.001')) {
        const hash = await walletClient.sendTransaction({
          account: walletClient.account!,
          to: w.address,
          value: fundingAmount,
          chain: sepolia,
        });
        await publicClient.waitForTransactionReceipt({ hash });
      }

      setSetupStep('deploy');
      await w.ensureDecryptionDelegation(getAddress(FAUCET_TOKEN_ADDRESS));

      // Save to localStorage so ObserversTab can identify the owner EOA
      const saved: Array<{ address: string; createdAt: number; ownerEOA?: string }> = JSON.parse(
        localStorage.getItem('zama-ui-accounts') || '[]',
      );
      if (!saved.some((a) => a.address.toLowerCase() === w.address.toLowerCase())) {
        saved.push({ address: w.address, createdAt: Date.now(), ownerEOA: walletClient.account!.address });
        localStorage.setItem('zama-ui-accounts', JSON.stringify(saved));
      }

      setSetupStep('done');
      await new Promise((r) => setTimeout(r, 400));
      onAccountCreated(w);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSetupStep(null);
    } finally {
      setIsCreating(false);
    }
  };

  // Reconnecting state — user clicked Resume, auto-reconnect in progress
  if (reconnecting) {
    return (
      <Card>
        <CardContent className="py-8 space-y-3">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="font-medium">Reconnecting to account...</span>
          </div>
          <div className="text-center font-mono text-xs text-muted-foreground">
            {existingAddress}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Connected to reused account — show balance + continue
  if (pendingWallet) {
    const handleDecrypt = async () => {
      setBalanceDecrypting(true);
      setDecryptError(null);
      setDecryptedBalance(null);
      try {
        const bal = await pendingWallet.getConfidentialBalance(getAddress(FAUCET_TOKEN_ADDRESS));
        setDecryptedBalance(bal);
      } catch (e) {
        setDecryptError(e instanceof Error ? e.message : String(e));
      } finally {
        setBalanceDecrypting(false);
      }
    };

    const TOKEN_DECIMALS = 6;
    const formatBal = (v: bigint) => {
      const str = v.toString().padStart(TOKEN_DECIMALS + 1, '0');
      const whole = str.slice(0, str.length - TOKEN_DECIMALS);
      const frac = str.slice(str.length - TOKEN_DECIMALS).replace(/0+$/, '') || '0';
      return `${whole}.${frac}`;
    };

    return (
      <Card className="border-green-300 bg-green-50/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <CardTitle>Connected to {pendingLabel}</CardTitle>
          </div>
          <CardDescription className="font-mono text-xs">{pendingWallet.address}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Decrypt balance */}
          <div className="space-y-2">
            {decryptedBalance !== null ? (
              <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                <div>
                  <div className="text-xs text-muted-foreground">Balance (cTEST)</div>
                  <div className="text-xl font-bold font-mono text-green-800">
                    {balanceRevealed ? `${formatBal(decryptedBalance)} cTEST` : '\u2022\u2022\u2022\u2022\u2022\u2022'}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setBalanceRevealed(!balanceRevealed)}>
                  {balanceRevealed ? 'Hide' : 'Reveal'}
                </Button>
              </div>
            ) : (
              <Button variant="outline" className="w-full" onClick={handleDecrypt} disabled={balanceDecrypting}>
                {balanceDecrypting ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Decrypting balance...</span>
                ) : (
                  'Decrypt Balance'
                )}
              </Button>
            )}
            {decryptError && (
              <p className="text-xs text-destructive">{decryptError}</p>
            )}
          </div>

          {/* Continue */}
          <Button className="w-full h-12 text-base" onClick={() => onAccountCreated(pendingWallet)}>
            Continue to Demo <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          <CardTitle>{reconnectFailed ? 'Reconnect Failed' : title}</CardTitle>
        </div>
        <CardDescription>
          {reconnectFailed
            ? `Could not reconnect to ${existingAddress?.slice(0, 10)}...${existingAddress?.slice(-6)}. You can create a new account instead.`
            : description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {insufficientBalance && (
          <Alert>
            <AlertDescription>
              <p className="font-medium mb-2">Get Sepolia ETH from a faucet:</p>
              <div className="space-y-1">
                {SEPOLIA_FAUCETS.map((faucet) => (
                  <a
                    key={faucet.name}
                    href={faucet.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-primary hover:underline text-sm"
                  >
                    {faucet.name}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {isCreating && setupStep ? (
          <div className="space-y-3 py-2">
            <StepIndicator current={setupStep} step="predict" label="Predict counterfactual address" />
            <StepIndicator current={setupStep} step="fund" label="Fund account with SepoliaETH" />
            <StepIndicator current={setupStep} step="deploy" label="Deploy + set up FHE delegation" />
            <StepIndicator current={setupStep} step="done" label="Account ready" />
          </div>
        ) : (
          <div className="space-y-4">
            <Button className="w-full h-12 text-base" onClick={handleCreate} disabled={isCreating}>
              Create & Fund Account
            </Button>
            {reusableAccounts.length > 0 && (
              <div className="space-y-2">
                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-2 text-muted-foreground">or use an existing account</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">These accounts already have tokens — skip deploy and mint.</p>
                {reusableAccounts.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      if (!walletClient || !s.accountAddress) return;
                      setReconnecting(true);
                      setError(null);
                      const doConnect = async () => {
                        try {
                          const builder = makeBuilder(walletClient);
                          const w = await builder.connect(s.accountAddress as Address);
                          setPendingWallet(w);
                          setPendingLabel(s.label);
                        } catch (e) {
                          setError(e instanceof Error ? e.message : String(e));
                        } finally {
                          setReconnecting(false);
                        }
                      };
                      doConnect();
                    }}
                    disabled={reconnecting}
                    className="w-full flex items-center justify-between rounded-lg border px-4 py-3 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer text-left"
                  >
                    <div>
                      <div className="text-sm font-medium">{s.label}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {s.accountAddress!.slice(0, 10)}...{s.accountAddress!.slice(-6)}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
