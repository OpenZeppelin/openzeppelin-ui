/**
 * Shows existing sessions of the current demo type and lets the user
 * resume one or start fresh. Rendered as the first screen when entering a demo.
 * If no existing sessions, calls onStartFresh immediately.
 */
import { useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { useDemoSession, type DemoType, type DemoSession } from '../hooks/useDemoSession';
import { useAccount } from 'wagmi';
import { ArrowRight, Trash2, Plus } from 'lucide-react';

const DEMO_TITLES: Record<DemoType, string> = {
  'fhe-basics': 'FHE Basics',
  'session-keys': 'Session Keys',
  'multisig': 'Confidential Multisig',
  'weighted-multisig': 'Weighted Multisig',
};

export default function DemoSessionPicker({ demoType, currentInstanceId, onResume, onStartFresh }: {
  demoType: DemoType;
  currentInstanceId: string;
  onResume: (sessionId: string) => void;
  onStartFresh: () => void;
}) {
  const { sessions, deleteSession } = useDemoSession();
  const { address } = useAccount();
  const connectedEOA = address?.toLowerCase() ?? '';

  // Existing sessions of this type (with deployed accounts, belonging to this wallet)
  const existingSessions = sessions.filter((s) =>
    s.id !== currentInstanceId &&
    s.type === demoType &&
    s.accountAddress &&
    (!s.ownerEOA || s.ownerEOA === connectedEOA),
  );

  // If no existing sessions, skip this screen entirely
  const skippedRef = useRef(false);
  useEffect(() => {
    if (existingSessions.length === 0 && !skippedRef.current) {
      skippedRef.current = true;
      onStartFresh();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps — onStartFresh is intentionally excluded (unstable inline callback)
  }, [existingSessions.length]);

  if (existingSessions.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{DEMO_TITLES[demoType]}</CardTitle>
        <CardDescription>You have existing sessions. Resume one or start fresh.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {existingSessions
          .sort((a, b) => b.createdAt - a.createdAt)
          .map((s) => (
            <div key={s.id} className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
              s.status === 'completed' ? 'border-green-200 bg-green-50/50' : 'hover:border-primary/30'
            } transition-colors`}>
              <div className="min-w-0">
                <div className="text-sm font-medium">{s.label}</div>
                <div className="text-xs text-muted-foreground">
                  <span className="font-mono">{s.accountAddress!.slice(0, 8)}...{s.accountAddress!.slice(-6)}</span>
                  {' \u00b7 '}
                  {s.status === 'completed' ? 'Completed' : s.stepHint ?? 'In progress'}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => onResume(s.id)}>
                  <ArrowRight className="h-3 w-3 mr-1" /> {s.status === 'completed' ? 'Review' : 'Resume'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteSession(s.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        <Button variant="outline" className="w-full" onClick={onStartFresh}>
          <Plus className="h-4 w-4 mr-2" /> Start Fresh
        </Button>
      </CardContent>
    </Card>
  );
}
