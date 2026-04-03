import { useState, useEffect } from 'react';
import { type Address, type Hash, type Hex, isAddress, createPublicClient, http, getAddress } from 'viem';
import { sepolia } from 'wagmi/chains';
import { useWalletClient } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { useWallet } from '../hooks/useWallet';
import TxHashLink from './TxHashLink';

import DecryptTimer from './DecryptTimer';
import { FAUCET_TOKEN_ADDRESS, RPC_URL } from '../config/constants';
import { ZamaConfidentialProvider } from '@zama-accounts/sdk';
import {
  Eye, EyeOff, UserPlus, UserMinus, Users, Loader2, Shield, Clock, Search, ArrowRight,
} from 'lucide-react';

const TOKEN_DECIMALS = 6;

function formatBalance(value: bigint): string {
  const str = value.toString().padStart(TOKEN_DECIMALS + 1, '0');
  const whole = str.slice(0, str.length - TOKEN_DECIMALS);
  const frac = str.slice(str.length - TOKEN_DECIMALS).replace(/0+$/, '') || '0';
  return `${whole}.${frac}`;
}

function formatExpiration(timestamp: bigint): string {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type ObserverInfo = {
  address: Address;
  status: 'active' | 'expired' | 'none';
  expirationTimestamp: bigint;
};

export default function ObserversTab({ onMilestone, visibleStep, onAdvance }: {
  onMilestone?: (event: 'access-denied-proved' | 'observer-granted' | 'observers-listed' | 'observer-revoked') => void;
  /** Which step to show. When set, only that step's card is rendered. */
  visibleStep?: 'prove-denied' | 'grant' | 'list' | 'revoke';
  /** Called when user wants to advance to the next step */
  onAdvance?: () => void;
} = {}) {
  const { wallet } = useWallet();
  const { data: walletClient } = useWalletClient();

  // Look up the EOA that created/connected this smart account.
  // Primary: localStorage entry. Fallback: if in demo context, the connected wallet
  // IS the owner (they just created/reconnected to this account).
  const ownerEOA = (() => {
    if (!wallet) return null;
    try {
      const saved: Array<{ address: string; ownerEOA?: string }> = JSON.parse(
        localStorage.getItem('zama-ui-accounts') || '[]',
      );
      const entry = saved.find((a) => a.address.toLowerCase() === wallet.address.toLowerCase());
      if (entry?.ownerEOA) return entry.ownerEOA.toLowerCase();
    } catch { /* fall through */ }
    // Fallback: assume connected wallet is owner (true in demo launcher context)
    return walletClient?.account?.address?.toLowerCase() ?? null;
  })();

  // ─── Connected wallet has decryption access? (hard block) ───
  const [connectedHasAccess, setConnectedHasAccess] = useState(false);
  const [accessCheckDone, setAccessCheckDone] = useState(false);

  // Is the connected wallet specifically the owner (not just any observer with access)?
  const isOwnerConnected = !!(
    walletClient?.account &&
    ownerEOA &&
    walletClient.account.address.toLowerCase() === ownerEOA
  );

  // ─── Step 1: Try decrypt as observer ───
  const [ownerAccount, setOwnerAccount] = useState(wallet?.address ?? '');
  const [observerDecrypting, setObserverDecrypting] = useState(false);
  const [observerBalance, setObserverBalance] = useState<bigint | null>(null);
  const [observerBalanceRevealed, setObserverBalanceRevealed] = useState(false);
  const [observerError, setObserverError] = useState<string | null>(null);

  // ─── Step 2: Grant + verify ───
  const [observerAddress, setObserverAddress] = useState('');
  const [durationDays, setDurationDays] = useState('30');
  const [adding, setAdding] = useState(false);
  const [addTxHash, setAddTxHash] = useState<Hash | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  // Inline verify decrypt after grant
  const [verifyDecrypting, setVerifyDecrypting] = useState(false);
  const [verifyBalance, setVerifyBalance] = useState<bigint | null>(null);
  const [verifyBalanceRevealed, setVerifyBalanceRevealed] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // ─── Step 3: Active observers list + decrypt ───
  const [observers, setObservers] = useState<ObserverInfo[]>([]);
  const [step3DecryptLoading, setStep3DecryptLoading] = useState(false);
  const [step3Balance, setStep3Balance] = useState<bigint | null>(null);
  const [step3Revealed, setStep3Revealed] = useState(false);
  const [step3Error, setStep3Error] = useState<string | null>(null);

  // ─── Step 4: Revoke + verify ───
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [revokeTxHash, setRevokeTxHash] = useState<Hash | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [lastRevokedAddress, setLastRevokedAddress] = useState<Address | null>(null);
  // Inline verify decrypt after revoke
  const [revokeVerifyDecrypting, setRevokeVerifyDecrypting] = useState(false);
  const [revokeVerifyBalance, setRevokeVerifyBalance] = useState<bigint | null>(null);
  const [revokeVerifyRevealed, setRevokeVerifyRevealed] = useState(false);
  const [revokeVerifyError, setRevokeVerifyError] = useState<string | null>(null);

  // Refresh observer list
  const refreshObservers = async () => {
    if (!wallet) return;
    const stored = localStorage.getItem(`observers-${wallet.address}`);
    if (!stored) { setObservers([]); onMilestone?.('observer-revoked'); return; }
    const addresses: Address[] = JSON.parse(stored);
    const results: ObserverInfo[] = [];
    for (const addr of addresses) {
      try {
        const delegation = await wallet.getObserverStatus(addr, getAddress(FAUCET_TOKEN_ADDRESS));
        results.push({
          address: addr,
          status: delegation.status,
          expirationTimestamp: delegation.expirationTimestamp,
        });
      } catch {
        results.push({ address: addr, status: 'none', expirationTimestamp: 0n });
      }
    }
    setObservers(results);
    if (results.every(o => o.status !== 'active')) {
      onMilestone?.('observer-revoked');
    }
  };

  // Auto-populate owner account when wallet loads (if not already set)
  useEffect(() => {
    if (wallet && !ownerAccount) setOwnerAccount(wallet.address);
  }, [wallet]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check if connected wallet already has decryption access for the target account
  useEffect(() => {
    const connectedEOA = walletClient?.account?.address;
    if (!wallet || !connectedEOA || !isAddress(ownerAccount) || ownerAccount.toLowerCase() !== wallet.address.toLowerCase()) {
      setConnectedHasAccess(false);
      setAccessCheckDone(true);
      return;
    }

    // Fast path: localStorage ownerEOA match
    if (ownerEOA && connectedEOA.toLowerCase() === ownerEOA) {
      setConnectedHasAccess(true);
      setAccessCheckDone(true);
      return;
    }

    // On-chain fallback: check delegation status
    let cancelled = false;
    setAccessCheckDone(false);
    wallet.getObserverStatus(connectedEOA, getAddress(FAUCET_TOKEN_ADDRESS))
      .then((delegation) => {
        if (!cancelled) {
          setConnectedHasAccess(delegation.status === 'active');
          setAccessCheckDone(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setConnectedHasAccess(false);
          setAccessCheckDone(true);
        }
      });
    return () => { cancelled = true; };
  }, [walletClient?.account?.address, ownerAccount, wallet, ownerEOA]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { refreshObservers(); }, [wallet]); // eslint-disable-line react-hooks/exhaustive-deps

  // Helper: create a provider for the observer (connected wallet)
  const createObserverProvider = () => {
    if (!walletClient?.account) throw new Error('No wallet connected');
    return new ZamaConfidentialProvider({
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
  };

  // Helper: read balance handle from token contract
  const readBalanceHandle = async (accountAddr: Address): Promise<Hex | null> => {
    const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC_URL) });
    const handle = await publicClient.readContract({
      abi: [{ type: 'function', name: 'confidentialBalanceOf', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'bytes32' }], stateMutability: 'view' }],
      address: getAddress(FAUCET_TOKEN_ADDRESS),
      functionName: 'confidentialBalanceOf',
      args: [accountAddr],
    }) as Hex;
    if (handle === '0x0000000000000000000000000000000000000000000000000000000000000000') return null;
    return handle;
  };

  // Reusable observer decrypt
  const doObserverDecrypt = async (
    setDecrypting: (v: boolean) => void,
    setBal: (v: bigint | null) => void,
    setRevealed: (v: boolean) => void,
    setErr: (v: string | null) => void,
  ) => {
    if (!walletClient || !isAddress(ownerAccount)) return;
    setDecrypting(true);
    setErr(null);
    setBal(null);
    setRevealed(false);
    try {
      const handle = await readBalanceHandle(ownerAccount as Address);
      if (!handle) { setErr('No encrypted balance found for this account.'); return; }
      const provider = createObserverProvider();
      const balance = await provider.decrypt64(
        getAddress(FAUCET_TOKEN_ADDRESS),
        ownerAccount as Address,
        handle,
        true,
      );
      setBal(balance);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setDecrypting(false);
    }
  };

  // Step 1: Try decrypt (should fail)
  const handleObserverDecrypt = () => {

    doObserverDecrypt(setObserverDecrypting, setObserverBalance, setObserverBalanceRevealed, setObserverError);
  };

  // Step 2: Grant observer access
  const handleAddObserver = async () => {
    if (!wallet || !isAddress(observerAddress)) return;

    setAdding(true);
    setAddError(null);
    setAddTxHash(null);
    try {
      const expirationTimestamp = BigInt(Math.floor(Date.now() / 1000)) + BigInt(durationDays) * 86400n;
      const hash = await wallet.manageObservers(
        [{ address: observerAddress as Address, expirationTimestamp }],
        [getAddress(FAUCET_TOKEN_ADDRESS)],
      );
      if (hash) setAddTxHash(hash);
      onMilestone?.('observer-granted');

      const stored = localStorage.getItem(`observers-${wallet.address}`);
      const list: Address[] = stored ? JSON.parse(stored) : [];
      if (!list.includes(observerAddress as Address)) {
        list.push(observerAddress as Address);
        localStorage.setItem(`observers-${wallet.address}`, JSON.stringify(list));
      }
      setObserverAddress('');
      await refreshObservers();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : String(e));
    } finally {
      setAdding(false);
    }
  };

  // Step 2 inline: Verify decrypt after grant
  const handleVerifyDecrypt = () => {

    doObserverDecrypt(setVerifyDecrypting, setVerifyBalance, setVerifyBalanceRevealed, setVerifyError);
  };

  // Step 4: Revoke observer
  const handleRevokeObserver = async (addressToRevoke: Address) => {
    if (!wallet) return;

    setRevokeLoading(true);
    setRevokeError(null);
    setRevokeTxHash(null);
    try {
      const provider = (wallet as any).confidentialProvider as ZamaConfidentialProvider | undefined;
      if (!provider) throw new Error('No confidential provider');
      const aclAddress = provider.getAclAddress(wallet.chain.id);
      if (!aclAddress) throw new Error('No ACL address');
      const revokeData = provider.buildRevokeDelegation(addressToRevoke, getAddress(FAUCET_TOKEN_ADDRESS));
      const hash = await wallet.executeRaw([{ to: aclAddress, data: revokeData }]);
      setRevokeTxHash(hash);
      setLastRevokedAddress(addressToRevoke);
      onMilestone?.('observer-revoked');
      await refreshObservers();
    } catch (e) {
      setRevokeError(e instanceof Error ? e.message : String(e));
    } finally {
      setRevokeLoading(false);
    }
  };

  // Step 4 inline: Verify revocation (should fail — which confirms revocation worked)
  const handleRevokeVerifyDecrypt = () => {
    doObserverDecrypt(
      setRevokeVerifyDecrypting,
      setRevokeVerifyBalance,
      setRevokeVerifyRevealed,
      (err) => { setRevokeVerifyError(err); if (err) onMilestone?.('observer-revoked'); },
    );
  };

  const showProveDenied = !visibleStep || visibleStep === 'prove-denied';
  const showGrant = !visibleStep || visibleStep === 'grant';
  const showList = !visibleStep || visibleStep === 'list';
  const showRevoke = !visibleStep || visibleStep === 'revoke';

  return (
    <div className="space-y-4 pt-4">
      {/* Explainer */}
      <Alert>
        <Users className="h-4 w-4" />
        <AlertTitle className="font-medium">Observer Delegation</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          Observers can decrypt your confidential balance but never transfer your tokens — read-only access
          enforced at the protocol level. This flow uses two wallets: the account owner (grants/revokes access)
          and an observer (attempts decryption). No ETH needed for the observer — decryption is off-chain via the Zama relayer.
        </AlertDescription>
      </Alert>

      {/* ── Step 1: Prove access is denied without delegation ── */}
      {showProveDenied && <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            <CardTitle>Try Decrypting Without Access</CardTitle>
          </div>
          <CardDescription>
            Connect a wallet that has no delegation and try to decrypt a confidential balance.
            The Zama relayer will reject the request — proving that encrypted balances are private by default.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Account Owner Address</label>
              {wallet && (
                <button onClick={() => setOwnerAccount(wallet.address)} className="text-xs text-primary hover:underline cursor-pointer">
                  Use deployed account
                </button>
              )}
            </div>
            <Input
              placeholder="0x... (the smart account to decrypt)"
              value={ownerAccount}
              onChange={(e) => setOwnerAccount(e.target.value)}
              className="font-mono text-sm"
              disabled={observerDecrypting}
            />
          </div>

          {connectedHasAccess && accessCheckDone && (
            <Alert className="border-amber-300 bg-amber-50">
              <Shield className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800 text-sm">Switch wallets first</AlertTitle>
              <AlertDescription className="text-amber-700 text-xs">
                This wallet already has decryption access for this account — decryption will succeed, which defeats the purpose of this step.
                Switch to a <strong>wallet with no access</strong> to prove that decryption is denied without delegation.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-1">
            <Button variant="outline" className="w-full" onClick={handleObserverDecrypt} disabled={observerDecrypting || !isAddress(ownerAccount) || connectedHasAccess}>
              {observerDecrypting ? (
                <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Attempting decrypt...</span>
              ) : (
                <span className="flex items-center gap-2"><Eye className="h-4 w-4" /> Try Decrypt (Should Fail)</span>
              )}
            </Button>
            <p className="text-[10px] text-muted-foreground">no gas — decrypts via Zama Gateway</p>
          </div>

          <DecryptTimer active={observerDecrypting} />

          {observerBalance !== null && (
            <div className={`flex items-center justify-between rounded-lg border px-4 py-3 ${observerBalanceRevealed ? 'border-green-200 bg-green-50' : ''}`}>
              <div>
                <div className="text-xs text-muted-foreground">Decrypted Balance for {ownerAccount.slice(0, 8)}...{ownerAccount.slice(-6)}</div>
                <div className={`text-xl font-bold font-mono ${observerBalanceRevealed ? 'text-green-800' : ''}`}>
                  {observerBalanceRevealed ? `${formatBalance(observerBalance)} cTEST` : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setObserverBalanceRevealed(!observerBalanceRevealed)}>
                {observerBalanceRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          )}

          {observerError && (
            <Alert className="border-green-200 bg-green-50">
              <Shield className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Access denied — no delegation</AlertTitle>
              <AlertDescription className="text-green-700 text-xs">
                The Zama relayer rejected the decryption request because this wallet has no observer delegation
                for the target account. This is the expected behavior — grant access in the next step.
              </AlertDescription>
            </Alert>
          )}

          {observerError && onAdvance && (
            <Button onClick={() => { onMilestone?.('access-denied-proved'); onAdvance(); }} className="w-full">
              Next Step <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}

        </CardContent>
      </Card>}

      {/* ── Step 2: Grant Observer Access + Verify ── */}
      {showGrant && <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <CardTitle>Grant Observer Access</CardTitle>
          </div>
          <CardDescription>
            As the account owner, grant an observer the ability to decrypt your confidential balance.
            The observer can then verify access by decrypting from their own wallet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription className="text-muted-foreground text-xs">
              <strong>Tip:</strong> Connect the observer wallet first and click "Use connected wallet" to capture their address.
              Then switch back to the owner wallet to submit the delegation transaction.
            </AlertDescription>
          </Alert>

          {!isOwnerConnected && accessCheckDone && (
            <Alert className="border-amber-300 bg-amber-50">
              <Shield className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800 text-sm">Switch to the owner wallet</AlertTitle>
              <AlertDescription className="text-amber-700 text-xs">
                Only the account owner can grant observer delegation. Switch to the owner wallet to submit this transaction.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Observer Address</label>
              {walletClient?.account && (
                <button onClick={() => setObserverAddress(walletClient.account!.address)} className="text-xs text-primary hover:underline cursor-pointer">
                  Use connected wallet
                </button>
              )}
            </div>
            <Input placeholder="0x..." value={observerAddress} onChange={(e) => setObserverAddress(e.target.value)} className="font-mono text-sm" disabled={adding} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Duration (days)</label>
            <Input type="number" min="1" value={durationDays} onChange={(e) => setDurationDays(e.target.value)} disabled={adding} className="w-32" />
          </div>
          <Button onClick={handleAddObserver} disabled={adding || !isAddress(observerAddress) || !isOwnerConnected}>
            {adding ? (
              <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Delegating...</span>
            ) : (
              <span className="flex items-center gap-2"><UserPlus className="h-4 w-4" /> Add Observer</span>
            )}
          </Button>

          {addTxHash && (
            <div className="space-y-3">
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-700">Delegation set! Tx: <TxHashLink hash={addTxHash} /></AlertDescription>
              </Alert>

              {/* Inline verify: decrypt as observer to prove it works */}
              {isOwnerConnected ? (
                <Alert className="border-amber-300 bg-amber-50">
                  <Shield className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800 text-sm">Switch to the observer wallet</AlertTitle>
                  <AlertDescription className="text-amber-700 text-xs">
                    The observer is the one who decrypts — the owner just granted permission. Switch to the observer wallet to verify it works.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <AlertDescription className="text-muted-foreground text-xs">
                    Verify that the observer can now decrypt the owner's balance after delegation was granted.
                  </AlertDescription>
                </Alert>
              )}
              <div className="space-y-1">
                <Button variant="outline" className="w-full" onClick={handleVerifyDecrypt} disabled={verifyDecrypting || !isAddress(ownerAccount) || isOwnerConnected}>
                  {verifyDecrypting ? (
                    <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Decrypting as Observer...</span>
                  ) : (
                    <span className="flex items-center gap-2"><Eye className="h-4 w-4" /> Verify — Decrypt as Observer</span>
                  )}
                </Button>
                <p className="text-[10px] text-muted-foreground">no gas — decrypts via Zama Gateway</p>
              </div>

              <DecryptTimer active={verifyDecrypting} />

              {verifyBalance !== null && (
                <div className={`flex items-center justify-between rounded-lg border px-4 py-3 ${verifyBalanceRevealed ? 'border-green-200 bg-green-50' : ''}`}>
                  <div>
                    <div className="text-xs text-muted-foreground">Decrypted Balance for {ownerAccount.slice(0, 8)}...{ownerAccount.slice(-6)}</div>
                    <div className={`text-xl font-bold font-mono ${verifyBalanceRevealed ? 'text-green-800' : ''}`}>
                      {verifyBalanceRevealed ? `${formatBalance(verifyBalance)} cTEST` : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setVerifyBalanceRevealed(!verifyBalanceRevealed)}>
                    {verifyBalanceRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              )}
              {verifyError && <Alert variant="destructive"><AlertDescription>{verifyError}</AlertDescription></Alert>}
            </div>
          )}
          {addError && <Alert variant="destructive"><AlertDescription>{addError}</AlertDescription></Alert>}

          {addTxHash && onAdvance && (
            <Button onClick={onAdvance} className="w-full">
              Next Step <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}

        </CardContent>
      </Card>}

      {/* ── Step 3: Active Observers + Decrypt ── */}
      {showList && <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              <CardTitle>Decrypt Balance As Observer</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={refreshObservers}>Refresh</Button>
          </div>
          <CardDescription>
            Switch to the observer wallet and decrypt the account owner's confidential balance.
            This proves that the delegation is working — the observer can read the balance without being able to transfer tokens.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isOwnerConnected && accessCheckDone && (
            <Alert className="border-amber-300 bg-amber-50">
              <Shield className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800 text-sm">Switch to the observer wallet</AlertTitle>
              <AlertDescription className="text-amber-700 text-xs">
                You're connected as the account owner. Switch to the observer wallet to decrypt the balance as a delegated observer.
              </AlertDescription>
            </Alert>
          )}

          {observers.length > 0 && (
            <div className="space-y-3">
              {observers.map((obs) => (
                <div key={obs.address} className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Observer:</span>
                      <span className="font-mono text-sm">{obs.address.slice(0, 10)}...{obs.address.slice(-8)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
                        obs.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {obs.status === 'active' ? 'Active' : obs.status === 'expired' ? 'Expired' : 'None'}
                      </span>
                      {obs.status === 'active' && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" /> Expires {formatExpiration(obs.expirationTimestamp)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Decrypt balance as observer */}
          <div className="space-y-2 pt-2 border-t">
            <div className="space-y-1">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => doObserverDecrypt(setStep3DecryptLoading, setStep3Balance, setStep3Revealed, setStep3Error)}
                disabled={step3DecryptLoading || !isAddress(ownerAccount) || isOwnerConnected}
              >
                {step3DecryptLoading ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Decrypting as Observer...</span>
                ) : (
                  <span className="flex items-center gap-2"><Eye className="h-4 w-4" /> Decrypt Balance as Observer</span>
                )}
              </Button>
              <p className="text-[10px] text-muted-foreground">no gas — decrypts via Zama Gateway</p>
            </div>
            <DecryptTimer active={step3DecryptLoading} />
            {step3Balance !== null && (
              <div className={`flex items-center justify-between rounded-lg border px-4 py-3 ${step3Revealed ? 'border-green-200 bg-green-50' : ''}`}>
                <div>
                  <div className="text-xs text-muted-foreground">Balance (cTEST)</div>
                  <div className={`text-xl font-bold font-mono ${step3Revealed ? 'text-green-800' : ''}`}>
                    {step3Revealed ? `${formatBalance(step3Balance)} cTEST` : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setStep3Revealed(!step3Revealed)}>
                  {step3Revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            )}
            {step3Error && (
              <Alert variant="destructive"><AlertDescription>{step3Error}</AlertDescription></Alert>
            )}
          </div>

          {observers.length > 0 && onAdvance && (
            <Button onClick={() => { onMilestone?.('observers-listed'); onAdvance(); }} className="w-full">
              Next Step <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </CardContent>
      </Card>}

      {/* ── Step 4: Revoke Access + Verify ── */}
      {showRevoke && <Card className="border-destructive/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserMinus className="h-5 w-5 text-destructive" />
            <CardTitle>Revoke Observer Access</CardTitle>
          </div>
          <CardDescription>
            Remove an observer's decryption access. After revoking, verify from the observer's wallet
            that the Zama relayer now rejects their decryption requests.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isOwnerConnected && accessCheckDone && (
            <Alert className="border-amber-300 bg-amber-50">
              <Shield className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800 text-sm">Switch to the owner wallet</AlertTitle>
              <AlertDescription className="text-amber-700 text-xs">
                Only the account owner can revoke observer delegation. Switch to the owner wallet to submit this transaction.
              </AlertDescription>
            </Alert>
          )}
          {observers.filter((o) => o.status === 'active').length === 0 ? (
            <p className="text-sm text-muted-foreground">No active observers to revoke.</p>
          ) : (
            <div className="space-y-3">
              {observers.filter((o) => o.status === 'active').map((obs) => (
                <div key={obs.address} className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <div className="space-y-1">
                    <span className="font-mono text-sm">{obs.address.slice(0, 10)}...{obs.address.slice(-8)}</span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> Expires {formatExpiration(obs.expirationTimestamp)}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="border-destructive/50 text-destructive hover:bg-destructive/10" onClick={() => handleRevokeObserver(obs.address)} disabled={revokeLoading || !isOwnerConnected}>
                    {revokeLoading ? <Loader2 className="h-4 w-4 animate-spin text-destructive" /> : <span className="flex items-center gap-1.5"><UserMinus className="h-3.5 w-3.5" /> Revoke</span>}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {revokeTxHash && (
            <div className="space-y-3">
              <Alert className="border-green-200 bg-green-50">
                <Shield className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Delegation revoked</AlertTitle>
                <AlertDescription className="text-green-700 text-xs">
                  {lastRevokedAddress && (
                    <span className="block font-mono mb-1">{lastRevokedAddress.slice(0, 10)}...{lastRevokedAddress.slice(-8)}</span>
                  )}
                  This observer's decryption access has been removed.
                  <span className="block mt-1">Tx: <TxHashLink hash={revokeTxHash} /></span>
                </AlertDescription>
              </Alert>

              {/* Inline verify: try decrypt as observer — should fail */}
              {isOwnerConnected ? (
                <Alert className="border-amber-300 bg-amber-50">
                  <Shield className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800 text-sm">Switch to the observer wallet</AlertTitle>
                  <AlertDescription className="text-amber-700 text-xs">
                    The owner still has decryption access. Switch to the observer's wallet to confirm their delegation was removed.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <AlertDescription className="text-muted-foreground text-xs">
                    Try decrypting as the revoked observer — the Zama relayer should reject the request.
                  </AlertDescription>
                </Alert>
              )}
              <div className="space-y-1">
                <Button variant="outline" className="w-full" onClick={handleRevokeVerifyDecrypt} disabled={revokeVerifyDecrypting || !isAddress(ownerAccount) || isOwnerConnected}>
                  {revokeVerifyDecrypting ? (
                    <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Decrypting...</span>
                  ) : (
                    <span className="flex items-center gap-2"><Eye className="h-4 w-4" /> Verify — Try Decrypt (Should Fail)</span>
                  )}
                </Button>
                <p className="text-[10px] text-muted-foreground">no gas — decrypts via Zama Gateway</p>
              </div>

              <DecryptTimer active={revokeVerifyDecrypting} />

              {revokeVerifyBalance !== null && (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertDescription className="text-yellow-700">
                    Unexpected: decryption succeeded ({formatBalance(revokeVerifyBalance)} cTEST). Revocation may not have propagated yet.
                  </AlertDescription>
                </Alert>
              )}

              {revokeVerifyError && (
                <Alert className="border-green-200 bg-green-50">
                  <Shield className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-800">Access denied — revocation confirmed</AlertTitle>
                  <AlertDescription className="text-green-700 text-xs">
                    The relayer rejected the request because delegation was revoked.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          {revokeError && <Alert variant="destructive"><AlertDescription>{revokeError}</AlertDescription></Alert>}

        </CardContent>
      </Card>}
    </div>
  );
}
