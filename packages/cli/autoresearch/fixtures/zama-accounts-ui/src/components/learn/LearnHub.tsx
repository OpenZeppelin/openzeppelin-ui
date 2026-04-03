import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ArrowRight, Vote, Zap } from 'lucide-react';
import PageShell from '../PageShell';

const USE_CASES = [
  {
    title: 'Confidential Onchain Treasury',
    subtitle: 'Confidential Multisig',
    timeTag: 'Audited',
    description:
      'Onchain treasury management where the signers, threshold, and balances are encrypted by default, visible only to the roles you explicitly authorize.',
    tags: ['Enterprise'],
    icon: Vote,
    to: '/learn/multisig',
    comingSoon: false,
  },
  {
    title: 'Confidential Payroll Agent',
    subtitle: 'Confidential Spending Limits \u00b7 Session Keys',
    timeTag: 'Alpha Testing',
    description:
      'Delegate spending to an agent with a confidential hard cap enforced onchain, visible only to the roles you explicitly authorize.',
    tags: ['Enterprise', 'AI Agent'],
    icon: Zap,
    to: '/learn/sessions',
    comingSoon: true,
  },
] as const;

export default function LearnHub() {
  const navigate = useNavigate();

  return (
    <PageShell breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Use cases' }]}>
      <div className="space-y-8">
        {/* Hero */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">
            What can you build?
          </h1>
          <p className="text-muted-foreground text-base max-w-lg mx-auto">
            Learn what's possible when sensitive information stays encrypted onchain.
          </p>
        </div>

        {/* Use case cards */}
        <div className="space-y-4">
          {USE_CASES.map((uc) => (
            <Card
              key={uc.title}
              className="cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => navigate(uc.to)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <uc.icon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{uc.title}</CardTitle>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      uc.comingSoon
                        ? 'text-muted-foreground'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {uc.timeTag}
                  </span>
                </div>
                <CardDescription className="text-sm text-muted-foreground">
                  {uc.subtitle}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {uc.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {uc.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
