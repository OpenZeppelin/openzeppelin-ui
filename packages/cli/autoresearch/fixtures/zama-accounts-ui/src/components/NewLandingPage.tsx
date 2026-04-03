import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Lock, BookOpen, Wrench, Globe, ArrowRight } from 'lucide-react';

const MAINNET_APP_URL = 'https://placeholder.example.com';

const CARDS = [
  {
    label: 'Learn',
    title: 'Privacy by default. Disclosure by design.',
    description:
      'An onchain treasury with encrypted structure.\nA payroll agent with encrypted spending limits enforced on chain.',
    cta: 'Explore the use cases',
    icon: BookOpen,
    to: '/learn',
  },
  {
    label: 'Explore',
    title: 'Learn the concepts. See what\u2019s possible.',
    description:
      'Interactive demos that let you deploy, configure, and test.\nWalk through each capability, no code required.',
    cta: 'Try on Sepolia',
    icon: Wrench,
    to: '/demo',
  },
  {
    label: 'Build',
    title: 'Add to your stack. Try hosted version.',
    description:
      'Use hosted version to send confidential tokens with a smart account.\nInstall the modules and add to any 7579 smart account.',
    cta: 'Use it live',
    secondaryCta: 'View on GitHub',
    icon: Globe,
    href: 'https://openzeppelin-accounts-ui.netlify.app/',
    secondaryHref: 'https://github.com/OpenZeppelin/openzeppelin-accounts',
  },
] as const;

export default function NewLandingPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Hero */}
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Confidential Accounts
          </h1>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto">
            Private balances
            <br />
            Encrypted governance
            <br />
            Confidential onchain spending limits
          </p>
          <p className="text-sm text-muted-foreground">
            Built on{' '}
            <span className="font-medium text-foreground">Zama FHE</span>
            {' '}&times;{' '}
            <span className="font-medium text-foreground">OpenZeppelin Accounts</span>
          </p>
        </div>

        {/* Cards */}
        <div className="space-y-3">
          {CARDS.map((card) => (
            <Card
              key={card.label}
              className="cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => {
                if ('href' in card && card.href) {
                  window.open(card.href, '_blank', 'noopener,noreferrer');
                } else if ('to' in card) {
                  navigate(card.to);
                }
              }}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {card.label}
                    </span>
                  </div>
                  <card.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-lg">{card.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <CardDescription className="text-sm leading-relaxed whitespace-pre-line">
                  {card.description}
                </CardDescription>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-sm font-medium text-primary">
                    {card.cta} <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                  {'secondaryCta' in card && card.secondaryCta && (
                    <div
                      className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        if ('secondaryHref' in card && card.secondaryHref) {
                          window.open(card.secondaryHref, '_blank', 'noopener,noreferrer');
                        }
                      }}
                    >
                      {card.secondaryCta} <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
