import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Lock, Eye, Zap, Users } from 'lucide-react';

const FEATURES = [
  {
    icon: Lock,
    title: 'Encrypted Transfers',
    description: 'Send tokens with FHE-encrypted amounts. Nobody sees the value — not even validators.',
  },
  {
    icon: Eye,
    title: 'Observer Delegation',
    description: 'Grant third parties read access to your encrypted balance. Revoke anytime.',
  },
  {
    icon: Zap,
    title: 'Session Keys + Spending Limits',
    description: 'Delegate spending to agents with encrypted caps enforced on-chain by FHE.',
  },
  {
    icon: Users,
    title: 'Confidential Multisig',
    description: 'Multi-party governance with encrypted disclosure proofs. Coming soon.',
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Confidential Smart Accounts Playground
          </h1>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto">
            Explore encrypted transfers, private spending limits, observer delegation, and multisig governance
            — all powered by fully homomorphic encryption on EVM.
          </p>
          <p className="text-sm text-muted-foreground">
            Built on{' '}
            <span className="font-medium text-foreground">OpenZeppelin Open Accounts Framework</span>
            {' '}&times;{' '}
            <span className="font-medium text-foreground">Zama FHE</span>
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-2 gap-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="bg-card/50">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <feature.icon className="h-4 w-4 text-primary" />
                  <CardTitle className="text-sm">{feature.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Connect */}
        <Card>
          <CardContent className="flex justify-center py-6">
            <ConnectButton />
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Sepolia testnet only. You'll need SepoliaETH to deploy your smart account.
        </p>
      </div>
    </div>
  );
}
