import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Lock, Shield, Eye, Users, ChevronDown, ChevronUp } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VantagePointsProps {
  treasuryAddress: string;
  balance: bigint | null;
  signerNames: Array<{ role: string; address: string; weight?: number }>;
  signerHandles: string[]; // encrypted ciphertext handles (bytes32 hex)
  onComplete?: () => void;
  /** When true, shows as a preview with mock data and "Begin →" button */
  preview?: boolean;
  /** When true, shows a Weights row under Governance */
  weighted?: boolean;
  /** Threshold value (e.g. "2 of 3" for regular, "7" for weighted) */
  thresholdLabel?: string;
}

type Role = 'public' | 'auditor' | 'compliance' | 'cfo';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TOKEN_DECIMALS = 6;

function formatBalance(value: bigint): string {
  const str = value.toString().padStart(TOKEN_DECIMALS + 1, '0');
  const whole = str.slice(0, str.length - TOKEN_DECIMALS);
  const frac = str.slice(str.length - TOKEN_DECIMALS).replace(/0+$/, '') || '0';
  return `${whole}.${frac}`;
}

function shortenAddress(addr: string): string {
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function truncateHandle(handle: string): string {
  if (handle.length < 14) return handle;
  return `${handle.slice(0, 10)}...`;
}

// ---------------------------------------------------------------------------
// Inline visual components
// ---------------------------------------------------------------------------

function EncryptedValue({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground/60 bg-muted/50 px-2 py-0.5 rounded">
      <Lock className="h-3 w-3" />
      <span className="font-mono blur-[3px] select-none">{text}</span>
    </span>
  );
}

function VisibleValue({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-foreground bg-green-50 px-2 py-0.5 rounded border border-green-200">
      <span className="font-mono">{children}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Role metadata
// ---------------------------------------------------------------------------

const ROLES: Record<Role, { label: string; icon: React.ReactNode; description: string; callout: string }> = {
  public: {
    label: 'Public',
    icon: <Eye className="h-4 w-4" />,
    description: 'No delegation. What anyone sees on a block explorer.',
    callout:
      'This is what any block explorer shows. Transactions happened. A smart account exists. No balance. No signatories. No threshold.',
  },
  auditor: {
    label: 'Auditor',
    icon: <Shield className="h-4 w-4" />,
    description: 'Delegated for the token contract. Can verify financial position. Cannot see who controls the treasury.',
    callout:
      'The auditor was delegated for the token contract only. The balance decrypts. Signatory identities and threshold stay encrypted \u2014 no visibility into who controls this treasury.',
  },
  compliance: {
    label: 'Compliance Officer',
    icon: <Users className="h-4 w-4" />,
    description: 'Delegated for the validator contract. Can verify governance structure. Cannot see the balance.',
    callout:
      'The compliance officer was delegated for the validator contract. The governance structure is verifiable \u2014 who the signing authorities are, what threshold is required. The balance stays encrypted.',
  },
  cfo: {
    label: 'Admin',
    icon: <Shield className="h-4 w-4" />,
    description: 'Delegated for both contracts. Full access to financial position and governance.',
    callout:
      'Full access. The admin is delegated for both contracts \u2014 balance and governance are both readable. Not because they\u2019re a signing authority. Because access was explicitly granted for both contracts.',
  },
};

// ---------------------------------------------------------------------------
// Visibility matrix
// ---------------------------------------------------------------------------

interface FieldVisibility {
  balance: boolean;
  transfers: boolean;
  signerCount: boolean;
  signerIdentities: boolean;
  threshold: boolean;
  weights: boolean;
}

const VISIBILITY: Record<Role, FieldVisibility> = {
  public: { balance: false, transfers: false, signerCount: false, signerIdentities: false, threshold: false, weights: false },
  auditor: { balance: true, transfers: true, signerCount: false, signerIdentities: false, threshold: false, weights: false },
  compliance: { balance: false, transfers: false, signerCount: true, signerIdentities: true, threshold: true, weights: true },
  cfo: { balance: true, transfers: true, signerCount: true, signerIdentities: true, threshold: true, weights: true },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VantagePoints({
  preview = false,
  treasuryAddress,
  balance,
  signerNames,
  signerHandles,
  onComplete,
  weighted = false,
  thresholdLabel,
}: VantagePointsProps) {
  const [activeRole, setActiveRole] = useState<Role>('public');
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  const vis = VISIBILITY[activeRole];
  const role = ROLES[activeRole];

  return (
    <div className="space-y-6">
      {/* ---- Intro / tone-setter ---- */}
      {preview && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            Three signing authorities. An encrypted threshold. A company treasury where the balance,
            the signatories, and the governance structure are private by default.
          </p>
          <p className="text-sm text-muted-foreground">
            Readable only by the roles you explicitly authorize. This demo builds that treasury,
            then proves what it enforces.
          </p>
        </div>
      )}

      {/* ---- Title card ---- */}
      <Card>
        <CardHeader>
          <CardTitle>Four Vantage Points</CardTitle>
          <p className="text-sm text-muted-foreground">
            {preview
              ? 'Same treasury. Four roles. Each sees exactly what their function requires — and nothing more.'
              : 'Switch between organizational roles to see what each can and cannot decrypt on the treasury.'}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* ---- Role selector ---- */}
          <div className="flex flex-wrap gap-2">
            {(Object.keys(ROLES) as Role[]).map((r) => (
              <Button
                key={r}
                variant={activeRole === r ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveRole(r)}
                className="gap-1.5"
              >
                {ROLES[r].icon}
                {ROLES[r].label}
              </Button>
            ))}
          </div>

          {/* ---- Role description ---- */}
          <p className="text-sm text-muted-foreground">{role.description}</p>

          {/* ---- Treasury data table ---- */}
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Field</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Value</th>
                </tr>
              </thead>
              <tbody>
                {/* Address — always visible */}
                <tr className="border-b">
                  <td className="px-4 py-2 font-medium">Address</td>
                  <td className="px-4 py-2">
                    <VisibleValue>{!preview && treasuryAddress ? shortenAddress(treasuryAddress) : 'visible'}</VisibleValue>
                  </td>
                </tr>

                {/* Financial group header */}
                <tr className="border-b bg-muted/30">
                  <td colSpan={2} className="px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Financial</td>
                </tr>

                {/* Balance */}
                <tr className="border-b">
                  <td className="px-4 py-2 font-medium">Balance</td>
                  <td className="px-4 py-2">
                    {vis.balance ? (
                      <VisibleValue>{!preview && balance !== null ? `${formatBalance(balance)} cTEST` : 'visible'}</VisibleValue>
                    ) : (
                      <EncryptedValue text="0xe4a1..." />
                    )}
                  </td>
                </tr>

                {/* Transfers */}
                <tr className="border-b">
                  <td className="px-4 py-2 font-medium">Transfers</td>
                  <td className="px-4 py-2">
                    {vis.transfers ? (
                      <VisibleValue>visible</VisibleValue>
                    ) : (
                      <EncryptedValue text="0xd3f8..." />
                    )}
                  </td>
                </tr>

                {/* Governance group header */}
                <tr className="border-b bg-muted/30">
                  <td colSpan={2} className="px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">Governance</td>
                </tr>

                {/* Signatory count */}
                <tr className="border-b">
                  <td className="px-4 py-2 font-medium">Signatory Count</td>
                  <td className="px-4 py-2">
                    {vis.signerCount ? (
                      <VisibleValue>{!preview ? String(signerNames.length || 3) : 'visible'}</VisibleValue>
                    ) : (
                      <EncryptedValue text="0xc1a9..." />
                    )}
                  </td>
                </tr>

                {/* Signatory identities */}
                <tr className="border-b">
                  <td className="px-4 py-2 font-medium">Signatory Identities</td>
                  <td className="px-4 py-2">
                    {vis.signerIdentities ? (
                      preview ? (
                        <VisibleValue>visible</VisibleValue>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {signerNames.map((s, i) => (
                            <VisibleValue key={i}>
                              {s.role} ({shortenAddress(s.address)})
                            </VisibleValue>
                          ))}
                        </div>
                      )
                    ) : (
                      <div className="flex flex-col gap-1">
                        {!preview && signerHandles.length > 0
                          ? signerHandles.map((h, i) => (
                              <EncryptedValue key={i} text={truncateHandle(h)} />
                            ))
                          : <EncryptedValue text="0xa7f3..." />}
                      </div>
                    )}
                  </td>
                </tr>

                {/* Threshold */}
                <tr className={weighted ? 'border-b' : ''}>
                  <td className="px-4 py-2 font-medium">Threshold</td>
                  <td className="px-4 py-2">
                    {vis.threshold ? (
                      <VisibleValue>{!preview ? (thresholdLabel ?? '2 of 3') : 'visible'}</VisibleValue>
                    ) : (
                      <EncryptedValue text="0xb9c2..." />
                    )}
                  </td>
                </tr>

                {/* Weights — only for weighted multisig */}
                {weighted && (
                  <tr>
                    <td className="px-4 py-2 font-medium">Weights</td>
                    <td className="px-4 py-2">
                      {vis.weights ? (
                        preview ? (
                          <VisibleValue>visible</VisibleValue>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {signerNames.map((s, i) => (
                              <VisibleValue key={i}>
                                {s.role}: {s.weight ?? '?'}
                              </VisibleValue>
                            ))}
                          </div>
                        )
                      ) : (
                        <EncryptedValue text="0xf7e1..." />
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ---- Role callout ---- */}
          <Alert>
            <AlertDescription className="text-sm">{role.callout}</AlertDescription>
          </Alert>

          {/* ---- How this works ---- */}
          <div className="rounded-md border">
            <button
              type="button"
              onClick={() => setHowItWorksOpen(!howItWorksOpen)}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <span>How this works</span>
              {howItWorksOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {howItWorksOpen && (
              <div className="border-t px-4 py-3 space-y-3 text-sm text-muted-foreground">
                <p>
                  FHE delegation is scoped per contract. Delegating for the token contract grants the ability to
                  decrypt balances. Delegating for the validator contract grants the ability to verify governance.
                  Neither implies the other.
                </p>
                <p className="text-xs text-muted-foreground/70 italic">
                  Signatory identity and threshold decryption requires Zama relayer support for validator-scoped
                  handles. The delegation is live and verifiable on-chain. Full governance field decryption is
                  available as Zama relayer coverage expands.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ---- Bottom action ---- */}
      {preview ? (
        <div className="space-y-4">
          {onComplete && (
            <Button onClick={onComplete} className="w-full">
              Begin →
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-green-200 bg-green-50/50 p-6 space-y-4">
          <div className="text-lg font-semibold text-green-800">
            Privacy by default. Disclosure by design. Enforced by math.
          </div>
          <p className="text-sm text-green-700">
            You built a company treasury where the governance structure is encrypted by default. You watched it
            authorize a valid transfer and block an invalid one &mdash; both without revealing the threshold, the
            signing authorities, or the governance structure behind either decision. You viewed it from four
            organizational roles, each seeing exactly what their function requires and nothing more.
          </p>
          {onComplete && (
            <Button
              onClick={onComplete}
              className="w-full border-green-300 text-green-700 hover:bg-green-100"
              variant="outline"
            >
              Mark Demo Complete
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
