import { useState, useEffect } from 'react';
import { formatEther, createPublicClient, http } from 'viem';
import { sepolia } from 'wagmi/chains';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { useWallet } from '../hooks/useWallet';
import { Lock, Copy, ExternalLink, CheckCircle2, RefreshCw, LayoutDashboard, Eye, Zap, Users, Shield, XCircle, Clock, Vote, Scale } from 'lucide-react';
import type { WalletStatus } from '@zama-accounts/sdk';
import ConfidentialTransfersTab from './ConfidentialTransfersTab';
import ObserversTab from './ObserversTab';
import SessionKeysTab from './SessionKeysTab';
import MultisigTab from './MultisigTab';
import WeightedMultisigTab from './WeightedMultisigTab';
import AccessTiersTab from './AccessTiersTab';
import SdkCodePanel from './SdkCodePanel';
import { SCOPED_SESSION_KEYS_VALIDATOR, CONFIDENTIAL_SPENDING_EXECUTOR, FAUCET_TOKEN_ADDRESS, MULTISIG_VALIDATOR_ADDRESS, RPC_URL } from '../config/constants';

const TOKEN_DECIMALS = 6;
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

function AccountHeader() {
  const { wallet, disconnect } = useWallet();
  const [status, setStatus] = useState<WalletStatus | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = async () => {
    if (!wallet) return;
    try {
      setStatus(await wallet.getStatus());
    } catch { /* ignore */ }
  };

  useEffect(() => { refresh(); }, [wallet]); // eslint-disable-line react-hooks/exhaustive-deps

  const copyAddress = () => {
    if (!wallet) return;
    navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg">Confidential Accounts</span>
        </div>
        <div className="flex items-center gap-2">
          <ConnectButton showBalance={false} accountStatus="avatar" />
          <Button variant="ghost" size="sm" onClick={disconnect}>Switch</Button>
        </div>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button onClick={copyAddress} className="flex items-center gap-1.5 font-mono text-sm hover:text-primary transition-colors cursor-pointer">
                {wallet?.address.slice(0, 8)}...{wallet?.address.slice(-6)}
                {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
              <a href={`https://sepolia.etherscan.io/address/${wallet?.address}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Balance:</span>
                <span className="font-medium">{status ? `${formatEther(status.ethBalance)} ETH` : '...'}</span>
                <button onClick={refresh} className="text-muted-foreground hover:text-primary cursor-pointer"><RefreshCw className="h-3 w-3" /></button>
              </div>
              {status && (
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${status.isDeployed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {status.isDeployed ? 'Deployed' : 'Pending'}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ModuleStatus({ label, installed, icon: Icon }: { label: string; installed: boolean | null; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center justify-between rounded-lg border px-4 py-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{label}</span>
      </div>
      {installed === null ? (
        <span className="text-xs text-muted-foreground">Checking...</span>
      ) : installed ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
          <CheckCircle2 className="h-3 w-3" /> Installed
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          <XCircle className="h-3 w-3" /> Not installed
        </span>
      )}
    </div>
  );
}

type ObserverInfo = { address: `0x${string}`; status: string; expirationTimestamp: bigint };
type SessionKeyInfo = { key: `0x${string}`; hasScope: boolean };

function DashboardHome() {
  const { wallet } = useWallet();
  const [scopedValidator, setScopedValidator] = useState<boolean | null>(null);
  const [spendingExecutor, setSpendingExecutor] = useState<boolean | null>(null);
  const [multisigValidator, setMultisigValidator] = useState<boolean | null>(null);
  const [multisigSignerCount, setMultisigSignerCount] = useState<number | null>(null);
  const [observers, setObservers] = useState<ObserverInfo[]>([]);
  const [sessionKeys, setSessionKeys] = useState<SessionKeyInfo[]>([]);
  const [spendingLimit, setSpendingLimit] = useState<{ limit: string; renewPeriod: bigint } | null>(null);

  useEffect(() => {
    if (!wallet) return;
    const check = async () => {
      const pc = createPublicClient({ chain: sepolia, transport: http(RPC_URL) });

      // Check modules
      try {
        const v = await pc.readContract({
          abi: IS_MODULE_INSTALLED_ABI, address: wallet.address,
          functionName: 'isModuleInstalled', args: [1n, SCOPED_SESSION_KEYS_VALIDATOR, '0x'],
        }) as boolean;
        setScopedValidator(v);

        // Read session keys if validator installed
        if (v) {
          const keys = await pc.readContract({
            abi: [{ type: 'function', name: 'keys', inputs: [{ name: 'account', type: 'address' }, { name: 'startIdx', type: 'uint256' }, { name: 'endIdx', type: 'uint256' }], outputs: [{ name: '', type: 'bytes[]' }], stateMutability: 'view' }],
            address: SCOPED_SESSION_KEYS_VALIDATOR,
            functionName: 'keys',
            args: [wallet.address, 0n, 100n],
          }) as `0x${string}`[];

          const keyInfos: SessionKeyInfo[] = [];
          for (const key of keys) {
            const scope = await pc.readContract({
              abi: [{ type: 'function', name: 'getKeyScope', inputs: [{ name: 'account', type: 'address' }, { name: 'key', type: 'bytes' }, { name: 'target', type: 'address' }], outputs: [{ name: '', type: 'bytes4[]' }], stateMutability: 'view' }],
              address: SCOPED_SESSION_KEYS_VALIDATOR,
              functionName: 'getKeyScope',
              args: [wallet.address, key, CONFIDENTIAL_SPENDING_EXECUTOR],
            }) as `0x${string}`[];
            keyInfos.push({ key, hasScope: scope.length > 0 });
          }
          setSessionKeys(keyInfos);

          // Read spending limit for each key that has scope
          for (const ki of keyInfos) {
            if (!ki.hasScope) continue;
            try {
              const keyAddr = ('0x' + ki.key.slice(2, 42)) as `0x${string}`;
              const config = await pc.readContract({
                abi: [{ type: 'function', name: 'spenderConfig', inputs: [{ name: 'account', type: 'address' }, { name: 'token', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: 'limitHandle', type: 'bytes32' }, { name: 'start', type: 'uint48' }, { name: 'renewPeriod', type: 'uint48' }], stateMutability: 'view' }],
                address: CONFIDENTIAL_SPENDING_EXECUTOR,
                functionName: 'spenderConfig',
                args: [wallet.address, FAUCET_TOKEN_ADDRESS, keyAddr],
              }) as unknown as [string, bigint, bigint];
              const limitHandle = config[0] as string;
              const hasLimit = limitHandle !== '0x0000000000000000000000000000000000000000000000000000000000000000';
              if (hasLimit) {
                setSpendingLimit({ limit: limitHandle, renewPeriod: config[2] });
                break; // show first configured limit
              }
            } catch { /* ignore */ }
          }
        }
      } catch { setScopedValidator(false); }

      try {
        const e = await pc.readContract({
          abi: IS_MODULE_INSTALLED_ABI, address: wallet.address,
          functionName: 'isModuleInstalled', args: [2n, CONFIDENTIAL_SPENDING_EXECUTOR, '0x'],
        }) as boolean;
        setSpendingExecutor(e);
      } catch { setSpendingExecutor(false); }

      // Check multisig validator
      try {
        const m = await pc.readContract({
          abi: IS_MODULE_INSTALLED_ABI, address: wallet.address,
          functionName: 'isModuleInstalled', args: [1n, MULTISIG_VALIDATOR_ADDRESS, '0x'],
        }) as boolean;
        setMultisigValidator(m);
        if (m) {
          const count = await pc.readContract({
            abi: [{ type: 'function', name: 'getSignerCount', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' }],
            address: MULTISIG_VALIDATOR_ADDRESS,
            functionName: 'getSignerCount',
            args: [wallet.address],
          }) as bigint;
          setMultisigSignerCount(Number(count));
        }
      } catch { setMultisigValidator(false); }

      // Read observers from localStorage
      const stored = localStorage.getItem(`observers-${wallet.address}`);
      if (stored) {
        const addresses: `0x${string}`[] = JSON.parse(stored);
        const obsInfos: ObserverInfo[] = [];
        for (const addr of addresses) {
          try {
            const delegation = await wallet.getObserverStatus(addr, FAUCET_TOKEN_ADDRESS);
            obsInfos.push({ address: addr, status: delegation.status, expirationTimestamp: delegation.expirationTimestamp });
          } catch {
            obsInfos.push({ address: addr, status: 'none', expirationTimestamp: 0n });
          }
        }
        setObservers(obsInfos);
      }
    };
    check();
  }, [wallet]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4 pt-4">
      <Card>
        <CardHeader>
          <CardTitle>Account Overview</CardTitle>
          <CardDescription>
            Your confidential smart account on Sepolia. Explore the tabs to interact with FHE features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Smart Account</div>
              <div className="font-mono text-sm mt-1">{wallet?.address.slice(0, 14)}...{wallet?.address.slice(-10)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Network</div>
              <div className="text-sm mt-1 font-medium">Sepolia Testnet</div>
            </div>
          </div>

          <SdkCodePanel
            label="Connect to your account via SDK"
            code={`import { AgentWallet, ZamaConfidentialProvider } from '@zama-accounts/sdk';

const wallet = await AgentWallet.builder()
  .chain(sepolia)
  .rpcUrl(rpcUrl)
  .signer(signer)
  .bundler({ url: bundlerUrl })
  .withConfidential(provider)
  .connect('${wallet?.address ?? '0x...'}');

const status = await wallet.getStatus();
console.log('ETH balance:', status.ethBalance);
console.log('Deployed:', status.isDeployed);`}
          />
        </CardContent>
      </Card>

      {/* Installed Modules */}
      <Card>
        <CardHeader>
          <CardTitle>Installed Modules</CardTitle>
          <CardDescription>On-chain module status for this account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <ModuleStatus label="Scoped Session Keys Validator" installed={scopedValidator} icon={Shield} />
          <ModuleStatus label="Confidential Spending Executor" installed={spendingExecutor} icon={Lock} />
          <ModuleStatus label="Confidential Multisig Validator" installed={multisigValidator} icon={Vote} />
          {multisigValidator && multisigSignerCount !== null && (
            <div className="text-xs text-muted-foreground px-4 py-1">
              {multisigSignerCount} signer{multisigSignerCount !== 1 ? 's' : ''} registered
            </div>
          )}
          {scopedValidator === false && spendingExecutor === false && multisigValidator === false && (
            <p className="text-xs text-muted-foreground pt-2">
              No modules installed yet. Use the Session Keys tab to set up scoped keys and spending limits.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Session Keys */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <CardTitle>Session Keys</CardTitle>
          </div>
          <CardDescription>Registered scoped session keys and spending limits.</CardDescription>
        </CardHeader>
        <CardContent>
          {sessionKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No session keys registered. Set up in the Session Keys tab.</p>
          ) : (
            <div className="space-y-3">
              {sessionKeys.map((sk) => (
                <div key={sk.key} className="rounded-lg border px-4 py-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm">{sk.key.slice(0, 14)}...{sk.key.slice(-10)}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${sk.hasScope ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {sk.hasScope ? 'Scoped' : 'No scope'}
                    </span>
                  </div>
                  {sk.hasScope && (
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div>Scoped to: <span className="font-medium">ConfidentialSpendingExecutor</span></div>
                      {spendingLimit && (
                        <>
                          <div>Spending limit: <span className="font-medium text-foreground">Encrypted</span></div>
                          <div>Renewal: <span className="font-medium text-foreground">{Number(spendingLimit.renewPeriod) === 86400 ? '1 day' : Number(spendingLimit.renewPeriod) < 86400 ? `${Math.round(Number(spendingLimit.renewPeriod) / 3600)}h` : `${Math.round(Number(spendingLimit.renewPeriod) / 86400)} days`}</span></div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Observers */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle>Observers</CardTitle>
          </div>
          <CardDescription>Addresses with delegated decryption access to your confidential balances.</CardDescription>
        </CardHeader>
        <CardContent>
          {observers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No observers delegated. Set up in the Observers tab.</p>
          ) : (
            <div className="space-y-3">
              {observers.map((obs) => (
                <div key={obs.address} className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <div className="space-y-1">
                    <span className="font-mono text-sm">{obs.address.slice(0, 10)}...{obs.address.slice(-8)}</span>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${
                        obs.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {obs.status === 'active' ? 'Active' : obs.status === 'expired' ? 'Expired' : 'None'}
                      </span>
                      {obs.status === 'active' && obs.expirationTimestamp > 0n && (
                        <span className="text-muted-foreground">
                          Expires {new Date(Number(obs.expirationTimestamp) * 1000).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Dashboard() {
  return (
    <div className="mx-auto max-w-3xl p-4 space-y-4">
      <AccountHeader />

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">
            <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="transfers">
            <Lock className="h-3.5 w-3.5 mr-1.5" />
            Transfers
          </TabsTrigger>
          <TabsTrigger value="observers">
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Observers
          </TabsTrigger>
          <TabsTrigger value="session-keys">
            <Zap className="h-3.5 w-3.5 mr-1.5" />
            Session Keys
          </TabsTrigger>
          <TabsTrigger value="multisig">
            <Vote className="h-3.5 w-3.5 mr-1.5" />
            Multisig
          </TabsTrigger>
          <TabsTrigger value="weighted-multisig">
            <Scale className="h-3.5 w-3.5 mr-1.5" />
            Weighted
          </TabsTrigger>
          <TabsTrigger value="access-tiers">
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            Access Tiers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardHome />
        </TabsContent>
        <TabsContent value="transfers">
          <ConfidentialTransfersTab />
        </TabsContent>
        <TabsContent value="observers">
          <ObserversTab />
        </TabsContent>
        <TabsContent value="session-keys">
          <SessionKeysTab />
        </TabsContent>
        <TabsContent value="multisig">
          <MultisigTab />
        </TabsContent>
        <TabsContent value="weighted-multisig">
          <WeightedMultisigTab />
        </TabsContent>
        <TabsContent value="access-tiers">
          <AccessTiersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
