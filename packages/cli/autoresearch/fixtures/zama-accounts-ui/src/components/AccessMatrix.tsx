import { useState, useEffect } from 'react';
import { type Address } from 'viem';
import type { AgentWallet } from '@zama-accounts/sdk';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import {
  Shield, Eye, EyeOff, Lock, Loader2, CheckCircle2, XCircle, Users,
} from 'lucide-react';
import type { BoardMember } from '../hooks/useMultisigWallet';
import TxHashLink from './TxHashLink';

type AccessTier = 'public' | 'auditor' | 'governance' | 'board';

interface SignerAccess {
  address: Address;
  label: string;
  balanceAccess: boolean | null; // null = loading
  governanceAccess: boolean | null;
  tier: AccessTier;
}

const TIER_INFO: Record<AccessTier, { label: string; description: string; color: string }> = {
  public: {
    label: 'Public',
    description: 'Account address only',
    color: 'text-gray-500',
  },
  auditor: {
    label: 'Auditor',
    description: 'Token delegation only — can view balances',
    color: 'text-blue-600',
  },
  governance: {
    label: 'Governance Observer',
    description: 'Validator delegation only — delegation status verifiable on-chain',
    color: 'text-purple-600',
  },
  board: {
    label: 'Board Member',
    description: 'Both delegations — balance decryptable, governance delegation verifiable',
    color: 'text-green-600',
  },
};

function computeTier(balanceAccess: boolean | null, governanceAccess: boolean | null): AccessTier {
  if (balanceAccess === null || governanceAccess === null) return 'public';
  if (balanceAccess && governanceAccess) return 'board';
  if (balanceAccess) return 'auditor';
  if (governanceAccess) return 'governance';
  return 'public';
}

function AccessIcon({ access }: { access: boolean | null }) {
  if (access === null) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (access) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  return <XCircle className="h-4 w-4 text-muted-foreground/40" />;
}

interface AccessMatrixProps {
  boardMembers: BoardMember[];
  treasuryWallet: AgentWallet;
  tokenAddress: Address;
  validatorAddress: Address;
  /** Whether governance delegation has been performed */
  governanceDelegated?: boolean;
}

export default function AccessMatrix({
  boardMembers,
  treasuryWallet,
  tokenAddress,
  validatorAddress,
  governanceDelegated,
}: AccessMatrixProps) {
  const [signerAccess, setSignerAccess] = useState<SignerAccess[]>([]);
  const [loading, setLoading] = useState(false);

  // Check delegation status for all signers
  const checkDelegations = async () => {
    setLoading(true);
    try {
      const results: SignerAccess[] = await Promise.all(
        boardMembers.map(async (member, i) => {
          const label = `Signer ${String.fromCharCode(65 + i)}`;
          try {
            const [tokenStatus, validatorStatus] = await Promise.all([
              treasuryWallet.getObserverStatus(member.address, tokenAddress),
              treasuryWallet.getObserverStatus(member.address, validatorAddress),
            ]);
            const balanceAccess = tokenStatus.status === 'active';
            const govAccess = validatorStatus.status === 'active';
            return {
              address: member.address,
              label,
              balanceAccess,
              governanceAccess: govAccess,
              tier: computeTier(balanceAccess, govAccess),
            };
          } catch {
            return {
              address: member.address,
              label,
              balanceAccess: false,
              governanceAccess: false,
              tier: 'public' as AccessTier,
            };
          }
        }),
      );
      setSignerAccess(results);
    } finally {
      setLoading(false);
    }
  };

  // Re-check when governance delegation changes
  useEffect(() => {
    if (treasuryWallet && boardMembers.length > 0) {
      checkDelegations();
    }
  }, [treasuryWallet, boardMembers.length, governanceDelegated]);

  if (signerAccess.length === 0 && !loading) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Access Matrix</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={checkDelegations}
            disabled={loading}
            className="text-xs"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Matrix table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Signer</th>
                <th className="text-center py-2 px-3 font-medium text-muted-foreground">
                  <div className="flex items-center justify-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    Balances
                  </div>
                </th>
                <th className="text-center py-2 px-3 font-medium text-muted-foreground">
                  <div className="flex items-center justify-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    Governance
                  </div>
                </th>
                <th className="text-left py-2 pl-4 font-medium text-muted-foreground">Tier</th>
              </tr>
            </thead>
            <tbody>
              {signerAccess.map((signer) => {
                const tierInfo = TIER_INFO[signer.tier];
                return (
                  <tr key={signer.address} className="border-b border-muted/50">
                    <td className="py-2.5 pr-4">
                      <div>
                        <span className="font-medium text-sm">{signer.label}</span>
                        <span className="text-xs text-muted-foreground ml-2 font-mono">
                          {signer.address.slice(0, 8)}...{signer.address.slice(-6)}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex justify-center">
                        <AccessIcon access={signer.balanceAccess} />
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex justify-center">
                        <AccessIcon access={signer.governanceAccess} />
                      </div>
                    </td>
                    <td className="py-2.5 pl-4">
                      <span className={`text-xs font-medium ${tierInfo.color}`}>
                        {tierInfo.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Tier legend */}
        <div className="rounded-lg border bg-background p-3 space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground mb-2">Access Tiers</div>
          {(Object.entries(TIER_INFO) as [AccessTier, typeof TIER_INFO[AccessTier]][]).map(([key, info]) => (
            <div key={key} className="flex items-center gap-2 text-xs">
              <span className={`font-medium w-32 ${info.color}`}>{info.label}</span>
              <span className="text-muted-foreground">{info.description}</span>
            </div>
          ))}
        </div>

        {/* Callout */}
        <Alert className="border-primary/20 bg-primary/5">
          <Lock className="h-4 w-4 text-primary" />
          <AlertDescription className="text-xs">
            Same treasury. Four delegation tiers. Delegation is <strong>per-contract</strong> — token
            delegation enables balance decryption, governance delegation is verifiable on-chain.
            Both are independently grantable.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
