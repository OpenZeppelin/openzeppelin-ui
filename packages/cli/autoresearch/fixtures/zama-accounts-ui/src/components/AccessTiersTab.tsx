import { useState, useEffect } from 'react';
import { type Address, type Hex, getAddress, createPublicClient, http } from 'viem';
import { sepolia } from 'wagmi/chains';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { useWallet } from '../hooks/useWallet';
import { useMultisigWallet } from '../hooks/useMultisigWallet';
import { useWeightedMultisigWallet } from '../hooks/useWeightedMultisigWallet';
import DecryptTimer from './DecryptTimer';
import SdkCodePanel from './SdkCodePanel';
import {
  Eye, EyeOff, Lock, Shield, Loader2, Users, CheckCircle2, XCircle, ArrowRight,
} from 'lucide-react';
import {
  FAUCET_TOKEN_ADDRESS, MULTISIG_VALIDATOR_ADDRESS, RPC_URL,
} from '../config/constants';

type Role = 'public' | 'auditor' | 'board';

const ROLE_CONFIG: Record<Role, { label: string; color: string; bgColor: string; borderColor: string; description: string }> = {
  public: {
    label: 'Public',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    description: 'Anyone can see the account address and transaction history on Etherscan.',
  },
  auditor: {
    label: 'Auditor',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'Delegated for the token contract only. Can verify financial health without seeing governance.',
  },
  board: {
    label: 'Board Member',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    description: 'Delegated for both token and validator contracts. Can decrypt balances and has verifiable governance delegation.',
  },
};

interface FieldState {
  label: string;
  publicView: string;
  auditorView: string;
  boardView: string;
}

export default function AccessTiersTab() {
  const { wallet: personalWallet } = useWallet();
  const { treasuryWallet: multisigTreasury, boardMembers: multisigBoard } = useMultisigWallet();
  const { treasuryWallet: weightedTreasury, boardMembers: weightedBoard } = useWeightedMultisigWallet();
  const { address: eoaAddress } = useAccount();

  // Use whichever treasury is available (weighted preferred)
  const treasuryWallet = weightedTreasury ?? multisigTreasury;
  const boardMembers = weightedBoard ?? multisigBoard;

  const [selectedRole, setSelectedRole] = useState<Role>('public');
  const [transitioning, setTransitioning] = useState(false);
  const [balanceDecrypted, setBalanceDecrypted] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balance, setBalance] = useState<bigint | null>(null);
  const [signerCount, setSignerCount] = useState<number | null>(null);

  // Load signer count
  useEffect(() => {
    if (!treasuryWallet) return;
    // Signer count is public (not encrypted)
    const validatorAddress = MULTISIG_VALIDATOR_ADDRESS;
    const pc = createPublicClient({ chain: sepolia, transport: http(RPC_URL) });
    pc.readContract({
      abi: [{
        type: 'function', name: 'getSignerCount',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
      }] as const,
      address: validatorAddress,
      functionName: 'getSignerCount',
      args: [treasuryWallet.address],
    }).then((count) => {
      setSignerCount(Number(count));
    }).catch(() => {});
  }, [treasuryWallet]);

  const handleRoleSwitch = (role: Role) => {
    setTransitioning(true);
    setTimeout(() => {
      setSelectedRole(role);
      setTransitioning(false);
    }, 200);
  };

  const handleDecryptBalance = async () => {
    if (!treasuryWallet) return;
    setBalanceLoading(true);
    try {
      const bal = await treasuryWallet.getConfidentialBalance(getAddress(FAUCET_TOKEN_ADDRESS));
      setBalance(bal);
      setBalanceDecrypted(true);
    } catch (e) {
      console.error('Balance decrypt failed:', e);
    } finally {
      setBalanceLoading(false);
    }
  };

  const roleConfig = ROLE_CONFIG[selectedRole];

  if (!personalWallet) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Create a personal account first (Dashboard tab).
        </CardContent>
      </Card>
    );
  }

  if (!treasuryWallet) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Lock className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
          <p className="font-medium mb-1">No treasury found</p>
          <p className="text-sm">
            Complete the Multisig or Weighted Multisig tab first to create a treasury.
            The access tiers demo uses that treasury to show different views.
          </p>
        </CardContent>
      </Card>
    );
  }

  const TOKEN_DECIMALS = 6;
  const formatBal = (v: bigint): string => {
    const str = v.toString().padStart(TOKEN_DECIMALS + 1, '0');
    const whole = str.slice(0, str.length - TOKEN_DECIMALS);
    const frac = str.slice(str.length - TOKEN_DECIMALS).replace(/0+$/, '') || '0';
    return `${whole}.${frac}`;
  };

  const fields: FieldState[] = [
    { label: 'Address', publicView: treasuryWallet.address, auditorView: treasuryWallet.address, boardView: treasuryWallet.address },
    { label: 'Tx History', publicView: 'Visible on Etherscan', auditorView: 'Visible on Etherscan', boardView: 'Visible on Etherscan' },
    { label: 'Balance', publicView: 'encrypted', auditorView: balance !== null ? `${formatBal(balance)} cTEST` : 'decryptable', boardView: balance !== null ? `${formatBal(balance)} cTEST` : 'decryptable' },
    { label: 'Signer Count', publicView: signerCount !== null ? `${signerCount} signers` : 'loading...', auditorView: signerCount !== null ? `${signerCount} signers` : 'loading...', boardView: signerCount !== null ? `${signerCount} signers` : 'loading...' },
    { label: 'Signer IDs', publicView: 'encrypted', auditorView: 'encrypted', boardView: 'delegated' },
    { label: 'Threshold', publicView: 'encrypted', auditorView: 'encrypted', boardView: 'delegated' },
    { label: 'Weights', publicView: 'encrypted', auditorView: 'encrypted', boardView: 'delegated' },
  ];

  const getFieldValue = (field: FieldState): string => {
    switch (selectedRole) {
      case 'public': return field.publicView;
      case 'auditor': return field.auditorView;
      case 'board': return field.boardView;
    }
  };

  const isEncrypted = (value: string) => value === 'encrypted';
  const isDecryptable = (value: string) => value === 'decryptable';
  const isDelegated = (value: string) => value === 'delegated';

  return (
    <div className="space-y-4">
      <Alert className="border-primary/20 bg-primary/5">
        <Eye className="h-4 w-4 text-primary" />
        <AlertDescription>
          <strong>Same treasury. Three views.</strong> Switch between roles to see how per-contract
          FHE delegation creates natural access tiers with zero additional engineering.
        </AlertDescription>
      </Alert>

      {/* Role selector */}
      <div className="flex gap-2 p-1 bg-muted rounded-lg">
        {(Object.entries(ROLE_CONFIG) as [Role, typeof ROLE_CONFIG[Role]][]).map(([role, config]) => (
          <button
            key={role}
            onClick={() => handleRoleSwitch(role)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              selectedRole === role
                ? `${config.bgColor} ${config.color} shadow-sm`
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {config.label}
          </button>
        ))}
      </div>

      {/* Treasury card */}
      <Card className={`transition-all duration-200 ${transitioning ? 'opacity-50 scale-[0.99]' : 'opacity-100'} ${roleConfig.borderColor}`}>
        <CardHeader className={`${roleConfig.bgColor} rounded-t-lg`}>
          <div className="flex items-center gap-2">
            <Shield className={`h-5 w-5 ${roleConfig.color}`} />
            <CardTitle className={`text-base ${roleConfig.color}`}>
              Viewing as: {roleConfig.label}
            </CardTitle>
          </div>
          <CardDescription>{roleConfig.description}</CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          {fields.map((field) => {
            const value = getFieldValue(field);
            const encrypted = isEncrypted(value);
            const decryptable = isDecryptable(value);
            const delegated = isDelegated(value);

            return (
              <div key={field.label} className="flex items-center justify-between py-2 border-b border-muted/50 last:border-0">
                <span className="text-sm font-medium text-muted-foreground">{field.label}</span>
                <div className="flex items-center gap-2">
                  {encrypted ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground/60 bg-muted/50 px-2.5 py-1 rounded">
                      <Lock className="h-3.5 w-3.5" />
                      <span className="font-mono blur-[3px] select-none">0x7a3f...b2c1</span>
                    </span>
                  ) : delegated ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-green-600">
                      <Shield className="h-3.5 w-3.5" />
                      Delegated
                    </span>
                  ) : decryptable ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-amber-600">
                      <Eye className="h-3.5 w-3.5" />
                      Decryptable
                    </span>
                  ) : field.label === 'Address' ? (
                    <span className="font-mono text-sm">
                      {value.slice(0, 10)}...{value.slice(-8)}
                    </span>
                  ) : (
                    <span className="text-sm">{value}</span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Decrypt button for auditor/board */}
          {selectedRole !== 'public' && !balanceDecrypted && (
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDecryptBalance}
                disabled={balanceLoading}
              >
                {balanceLoading ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Decrypting balance...</span>
                ) : (
                  <span className="flex items-center gap-2"><Eye className="h-3.5 w-3.5" /> Decrypt Balance</span>
                )}
              </Button>
              <DecryptTimer active={balanceLoading} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insight callout */}
      <Alert className="border-primary/20 bg-primary/5">
        <Shield className="h-4 w-4 text-primary" />
        <AlertDescription className="text-xs space-y-1">
          <p>
            <strong>How it works:</strong> FHE ACL delegation is per-contract.
          </p>
          <p>
            Delegating for the <strong>token contract</strong> enables balance decryption (Auditor).
            Delegating for the <strong>validator contract</strong> is verifiable on-chain as a governance
            role — the delegation status itself is the access signal.
          </p>
          <p>
            <strong>Note:</strong> Governance field decryption (signer IDs, threshold, weights) requires
            Zama relayer support for validator-scoped handles, which is not yet available. The delegation
            is real and on-chain verifiable — the decrypt path is the current limitation.
          </p>
        </AlertDescription>
      </Alert>

      <SdkCodePanel code={`// Per-contract delegation creates natural access tiers
// Auditor: token access only
await treasury.manageObservers(
  [{ address: auditor, expirationTimestamp: expiry }],
  [tokenAddress], // token only
);

// Board Member: token + validator access
await treasury.manageObservers(
  [{ address: boardMember, expirationTimestamp: expiry }],
  [tokenAddress, validatorAddress], // both contracts
);`} />
    </div>
  );
}
