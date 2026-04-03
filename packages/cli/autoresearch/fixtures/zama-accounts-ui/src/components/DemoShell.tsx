import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Lock, Zap, Vote, Scale, Copy, ExternalLink } from 'lucide-react';
import { useDemoSession, type DemoType } from '../hooks/useDemoSession';
import Breadcrumb from './Breadcrumb';
import CliBanner from './CliBanner';

const DEMO_META: Record<DemoType, { icon: typeof Lock; title: string }> = {
  'fhe-basics': { icon: Lock, title: 'FHE Basics' },
  'session-keys': { icon: Zap, title: 'Session Keys' },
  'multisig': { icon: Vote, title: 'Multisig' },
  'weighted-multisig': { icon: Scale, title: 'Multisig Weighted' },
};

function AccountPill({ address }: { address: string }) {
  const short = `${address.slice(0, 6)}...${address.slice(-4)}`;
  return (
    <div className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-mono bg-muted/50">
      <span>{short}</span>
      <button
        onClick={() => navigator.clipboard.writeText(address)}
        className="text-muted-foreground hover:text-foreground transition-colors"
        title="Copy address"
      >
        <Copy className="h-3 w-3" />
      </button>
      <a
        href={`https://sepolia.etherscan.io/address/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground hover:text-foreground transition-colors"
        title="View on Etherscan"
      >
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}

export default function DemoShell({ children }: { children: React.ReactNode }) {
  const { activeDemoId, activeDemoType, sessions, exitDemo } = useDemoSession();

  if (!activeDemoId || !activeDemoType) return null;

  const session = sessions.find((s) => s.id === activeDemoId);
  const meta = DEMO_META[activeDemoType];

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-2">
          <Breadcrumb
            segments={[
              { label: 'Home', to: '/' },
              { label: 'Demos', to: '/demo' },
              { label: meta.title },
            ]}
            onNavigate={(to) => {
              if (to === '/demo') exitDemo();
            }}
          />
          <div className="flex items-center gap-3">
            {session?.accountAddress && <AccountPill address={session.accountAddress} />}
            <ConnectButton showBalance={false} accountStatus="avatar" />
          </div>
        </div>
      </div>

      {/* Demo content */}
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        <CliBanner demoType={activeDemoType} />
        {children}
      </div>
    </div>
  );
}
