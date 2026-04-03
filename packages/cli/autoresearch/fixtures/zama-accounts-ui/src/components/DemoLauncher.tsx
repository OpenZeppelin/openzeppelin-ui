import { useNavigate } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Lock, Zap, Vote, Scale, Trash2, ArrowRight, CheckCircle2, Wallet } from 'lucide-react';
import { useDemoSession, type DemoType, type DemoSession } from '../hooks/useDemoSession';
import PageShell from './PageShell';

const DEMOS: Array<{
  type: DemoType;
  icon: typeof Lock;
  title: string;
  description: string;
  audited: boolean;
}> = [
  {
    type: 'fhe-basics',
    icon: Lock,
    title: 'FHE Basics',
    description: 'Encrypted transfers and observer delegation.',
    audited: true,
  },
  {
    type: 'session-keys',
    icon: Zap,
    title: 'Session Keys',
    description: 'Session key with encrypted spending limits.',
    audited: false,
  },
  {
    type: 'multisig',
    icon: Vote,
    title: 'Multisig',
    description: 'Multisig with encrypted signers, signer threshold, and balances.',
    audited: true,
  },
  {
    type: 'weighted-multisig',
    icon: Scale,
    title: 'Multisig Weighted',
    description: 'Multisig variation using encrypted weights instead of signer thresholds.',
    audited: true,
  },
];

function SessionCard({ session, onResume, onDelete }: {
  session: DemoSession;
  onResume: () => void;
  onDelete: () => void;
}) {
  const demo = DEMOS.find((d) => d.type === session.type);
  const isCompleted = session.status === 'completed';

  return (
    <div className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
      isCompleted ? 'border-green-200 bg-green-50/50' : 'hover:border-primary/30'
    }`}>
      <div className="flex items-center gap-3 min-w-0">
        {isCompleted ? (
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
        ) : (
          demo && <demo.icon className="h-4 w-4 text-primary shrink-0" />
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{session.label}</span>
            {isCompleted && (
              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                Completed
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {session.accountAddress
              ? <span className="font-mono">{session.accountAddress.slice(0, 8)}...{session.accountAddress.slice(-6)}</span>
              : 'Not yet deployed'}
            {' \u00b7 '}
            {isCompleted && session.completedAt
              ? `Completed ${new Date(session.completedAt).toLocaleDateString()}`
              : session.stepHint ?? new Date(session.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" variant="outline" onClick={onResume}>
          <ArrowRight className="h-3 w-3 mr-1" /> {isCompleted ? 'Review' : 'Resume'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

const DEMO_ROUTES: Record<DemoType, string> = {
  'fhe-basics': '/demo/fhebasics',
  'session-keys': '/demo/sessionkeys',
  'multisig': '/demo/multisig',
  'weighted-multisig': '/demo/weightedmultisig',
};

function DemoCard({ demo, completedCount, lastCompleted, isConnected }: {
  demo: typeof DEMOS[number];
  completedCount: number;
  lastCompleted?: number;
  isConnected: boolean;
}) {
  const navigate = useNavigate();
  const { openConnectModal } = useConnectModal();

  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <demo.icon className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{demo.title}</CardTitle>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            demo.audited ? 'bg-green-100 text-green-700' : 'text-muted-foreground'
          }`}>
            {demo.audited ? 'Audited' : 'Alpha Testing'}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <CardDescription>{demo.description}</CardDescription>
        {isConnected ? (
          <Button className="w-full" onClick={() => navigate(DEMO_ROUTES[demo.type])}>
            Start Demo
          </Button>
        ) : (
          <Button className="w-full" variant="outline" onClick={() => openConnectModal?.()}>
            <Wallet className="h-4 w-4 mr-2" />
            Connect Wallet to Start
          </Button>
        )}
        {completedCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-green-600">
            <CheckCircle2 className="h-3 w-3" />
            <span>
              {completedCount} completed
              {lastCompleted && ` \u00b7 Last: ${new Date(lastCompleted).toLocaleDateString()}`}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DemoLauncher() {
  const navigate = useNavigate();
  const { sessions, resumeDemo, deleteSession } = useDemoSession();
  const { address: connectedAddress, isConnected } = useAccount();
  const connectedEOA = connectedAddress?.toLowerCase() ?? '';

  // Only show sessions that have a deployed account and belong to the connected wallet.
  // Sessions without accountAddress never got past creation — don't clutter the list.
  const mySessions = sessions.filter((s) =>
    s.accountAddress &&
    (!s.ownerEOA || s.ownerEOA === connectedEOA),
  );

  return (
    <PageShell
      breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Demos' }]}
      actions={<ConnectButton showBalance={false} accountStatus="address" />}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-8">
        {/* Hero */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">What can you build?</h1>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            Each demo walks you through a complete flow.
          </p>
          <p className="text-sm text-muted-foreground">
            Built on{' '}
            <span className="font-medium text-foreground">Zama FHE</span>
            {' '}&times;{' '}
            <span className="font-medium text-foreground">OpenZeppelin Accounts</span>
          </p>
        </div>

        {/* Demo Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DEMOS.map((demo) => {
            const completedSessions = mySessions.filter((s) => s.type === demo.type && s.status === 'completed');
            const lastCompleted = completedSessions.length > 0
              ? Math.max(...completedSessions.map((s) => s.completedAt ?? s.createdAt))
              : undefined;
            return (
              <DemoCard
                key={demo.type}
                demo={demo}
                completedCount={completedSessions.length}
                lastCompleted={lastCompleted}
                isConnected={isConnected}
              />
            );
          })}
        </div>

        {/* Previous Sessions */}
        {isConnected && mySessions.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">Previous Sessions</h2>
            <div className="space-y-2">
              {mySessions
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onResume={() => {
                      resumeDemo(session.id);
                      navigate(DEMO_ROUTES[session.type]);
                    }}
                    onDelete={() => deleteSession(session.id)}
                  />
                ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Runs on Sepolia testnet. You'll need ~0.1 SepoliaETH to complete a demo.{' '}
          <a
            href="https://sepolia-faucet.pk910.de/#/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            Get SepoliaETH &rarr;
          </a>
        </p>
      </div>
    </PageShell>
  );
}
