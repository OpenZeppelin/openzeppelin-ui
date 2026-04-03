import { Card, CardContent } from '../ui/card';
import { Zap } from 'lucide-react';
import PageShell from '../PageShell';

export default function SessionsLearn() {
  return (
    <PageShell
      breadcrumbs={[
        { label: 'Home', to: '/' },
        { label: 'Use cases', to: '/learn' },
        { label: 'Session keys' },
      ]}
    >
      <div className="space-y-8">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Session keys + spending limits</h1>
          <p className="text-muted-foreground text-base">
            Delegate spending with encrypted caps enforced on-chain.
          </p>
        </div>

        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700 mb-3">
              Coming soon
            </div>
            <p className="text-sm">This use case walkthrough is under development.</p>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
