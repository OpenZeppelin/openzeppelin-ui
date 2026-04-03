import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { ArrowRight, Lock } from 'lucide-react';
import PageShell from '../PageShell';

const DOCS_URL = 'https://placeholder.example.com/docs';

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
    <span className="inline-flex items-center gap-1.5 text-sm text-foreground px-2 py-0.5 rounded">
      <span className="font-mono">{children}</span>
    </span>
  );
}

const TABLE_DATA = [
  {
    tier: 'No access',
    example: 'public',
    balance: null,
    transfers: null,
    signers: null,
    threshold: null,
    highlight: false,
  },
  {
    tier: 'Financial',
    example: 'auditor',
    balance: '$24.8M',
    transfers: 'visible',
    signers: null,
    threshold: null,
    highlight: false,
  },
  {
    tier: 'Governance',
    example: 'compliance',
    balance: null,
    transfers: null,
    signers: 'A, B, C',
    threshold: '2 of 3',
    highlight: false,
  },
  {
    tier: 'Full access',
    example: 'signatory',
    balance: '$24.8M',
    transfers: 'visible',
    signers: 'A, B, C',
    threshold: '2 of 3',
    highlight: true,
  },
] as const;

export default function MultisigLearn() {
  const navigate = useNavigate();

  return (
    <PageShell
      breadcrumbs={[
        { label: 'Home', to: '/' },
        { label: 'Use cases', to: '/learn' },
        { label: 'Confidential Onchain Treasury' },
      ]}
    >
      <div className="space-y-12">
        {/* 1. Eyebrow + H1 + Body */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">
            Confidential Onchain Treasury
          </h1>
          <h2 className="text-2xl font-bold tracking-tight">
            The reason institutions don't put treasuries onchain.
          </h2>
          <div className="space-y-3 text-muted-foreground leading-relaxed">
            <p>
              A standard multisig on a public blockchain exposes everything.
            </p>
            <p>
              Who controls the treasury. How many signatures move funds. What the balance is. All
              of it visible to anyone watching the chain, in real time.
            </p>
            <p className="font-medium text-foreground">
              FHE changes that. The treasury is onchain. The structure is encrypted.
            </p>
          </div>
        </div>

        {/* 3. Side-by-side comparison cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Standard multisig */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground font-medium">
                Standard multisig today
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between items-center py-1.5 border-b border-muted/50">
                  <span className="text-sm text-muted-foreground">Signers</span>
                  <div className="text-right space-y-0.5">
                    <VisibleValue>0x7a3f...b2c1</VisibleValue><br />
                    <VisibleValue>0x4e2d...a8f3</VisibleValue><br />
                    <VisibleValue>0x9c1b...d4e7</VisibleValue>
                  </div>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-muted/50">
                  <span className="text-sm text-muted-foreground">Threshold</span>
                  <VisibleValue>2 of 3</VisibleValue>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-sm text-muted-foreground">Balance</span>
                  <VisibleValue>$24,800,000</VisibleValue>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Confidential multisig */}
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-primary font-medium">
                Confidential multisig
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between items-center py-1.5 border-b border-muted/50">
                  <span className="text-sm text-muted-foreground">Signers</span>
                  <div className="text-right space-y-0.5">
                    <EncryptedValue text="0x7a3f...b2c1" /><br />
                    <EncryptedValue text="0x4e2d...a8f3" /><br />
                    <EncryptedValue text="0x9c1b...d4e7" />
                  </div>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-muted/50">
                  <span className="text-sm text-muted-foreground">Threshold</span>
                  <EncryptedValue text="2 of 3" />
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-sm text-muted-foreground">Balance</span>
                  <EncryptedValue text="$24,800,000" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 4. H2 + Explainer */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold tracking-tight">
            Privacy by default. Disclosure by design.
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Encryption doesn't mean inaccessible. When compliance requires it, access can be
            granted to the right party, limited to what their role requires.
          </p>
        </div>

        {/* 5. Access table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4" rowSpan={2} />
                <th
                  className="text-center py-1.5 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground"
                  colSpan={2}
                >
                  Financial
                </th>
                <th
                  className="text-center py-1.5 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground border-l border-border"
                  colSpan={2}
                >
                  Governance
                </th>
              </tr>
              <tr className="border-b">
                <th className="text-center py-2 px-2 font-medium text-muted-foreground text-xs">
                  Balance
                </th>
                <th className="text-center py-2 px-2 font-medium text-muted-foreground text-xs">
                  Transfers
                </th>
                <th className="text-center py-2 px-2 font-medium text-muted-foreground text-xs border-l border-border">
                  Signers
                </th>
                <th className="text-center py-2 px-2 font-medium text-muted-foreground text-xs">
                  Threshold
                </th>
              </tr>
            </thead>
            <tbody>
              {TABLE_DATA.map((row) => (
                <tr
                  key={row.tier}
                  className={`border-b border-muted/50 last:border-0 ${row.highlight ? 'bg-secondary' : ''}`}
                >
                  <td className="py-3 pr-4">
                    <span className="font-medium text-sm">{row.tier}</span>
                    <span className="text-sm text-muted-foreground"> ({row.example})</span>
                  </td>
                  <td className="py-3 px-2 text-center">
                    {row.balance ? (
                      <VisibleValue>{row.balance}</VisibleValue>
                    ) : (
                      <EncryptedValue text="0xe4a1..." />
                    )}
                  </td>
                  <td className="py-3 px-2 text-center">
                    {row.transfers ? (
                      <VisibleValue>{row.transfers}</VisibleValue>
                    ) : (
                      <EncryptedValue text="0x8b2f..." />
                    )}
                  </td>
                  <td className="py-3 px-2 text-center border-l border-border">
                    {row.signers ? (
                      <VisibleValue>{row.signers}</VisibleValue>
                    ) : (
                      <EncryptedValue text="0x3d7c..." />
                    )}
                  </td>
                  <td className="py-3 px-2 text-center">
                    {row.threshold ? (
                      <VisibleValue>{row.threshold}</VisibleValue>
                    ) : (
                      <EncryptedValue text="0xf19a..." />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>


        {/* 7. Weighted multisig note */}
        <p className="text-sm text-muted-foreground">
          Also available: weighted multisig, where each signatory holds a different share of
          influence and approval requires a combined points threshold rather than a headcount. Same
          privacy guarantees, same access model.
        </p>

        {/* 7. Three numbered insights */}
        <div className="space-y-4">
          <div className="flex gap-3">
            <span className="text-sm font-bold text-muted-foreground shrink-0">1.</span>
            <p className="text-sm">
              <strong>The default is private.</strong> No access exists unless it is explicitly granted.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="text-sm font-bold text-muted-foreground shrink-0">2.</span>
            <p className="text-sm">
              <strong>Compliance doesn't require exposure.</strong> The auditor sees balances. The compliance officer sees the control structure. Neither sees the other.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="text-sm font-bold text-muted-foreground shrink-0">3.</span>
            <p className="text-sm">
              <strong>The chain records the transaction, not the contents.</strong> Verifiable without being visible, enforced by FHE math, not policy or trust.
            </p>
          </div>
        </div>

        {/* Callout */}
        <blockquote className="border-l-2 border-primary pl-4 text-sm text-muted-foreground italic">
          Confidential access control by the team behind the most trusted access control library.
        </blockquote>

        {/* CTAs */}
        <div className="flex gap-3">
          <Button onClick={() => navigate('/demo/multisig')}>
            Run it on Sepolia <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open(DOCS_URL, '_blank', 'noopener,noreferrer')}
          >
            Read the docs
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
