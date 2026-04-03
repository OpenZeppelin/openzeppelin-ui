import { useState, useCallback, useMemo } from 'react';
import type { AgentWallet } from '@zama-accounts/sdk';
import { useDemoSession } from '../../hooks/useDemoSession';
import { DemoWalletProvider } from '../../hooks/useDemoWallet';
import DemoAccountSetup from '../DemoAccountSetup';
import DemoSessionPicker from '../DemoSessionPicker';
import SessionKeysTab from '../SessionKeysTab';
import DemoLayout from '../DemoLayout';
import type { StepGroup } from '../DemoLayout';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Zap } from 'lucide-react';

type Milestone = 'key-installed' | 'limit-set' | 'transfer-within-limit' | 'limit-enforced' | 'bypass-blocked';

const STEP_HINTS: Record<Milestone, string> = {
  'key-installed': 'Step 2: Set Spending Limit',
  'limit-set': 'Step 3: Transfer Within Limit',
  'transfer-within-limit': 'Step 4: Exceed Limit',
  'limit-enforced': 'Step 5: Bypass Attempt',
  'bypass-blocked': 'Demo ready to complete',
};

const ORDERED_MILESTONES: Milestone[] = ['key-installed', 'limit-set', 'transfer-within-limit', 'limit-enforced', 'bypass-blocked'];

function buildStepGroups(milestones: Set<Milestone>, hasWallet: boolean): StepGroup[] {
  const steps = [
    { id: 'create', label: 'Create Account' },
    { id: 'install-key', label: 'Install Session Key' },
    { id: 'set-limit', label: 'Set Spending Limit' },
    { id: 'transfer-within', label: 'Transfer Within Limit' },
    { id: 'exceed-limit', label: 'Exceed Limit' },
    { id: 'bypass', label: 'Bypass Attempt' },
  ];

  const milestoneForStep: (Milestone | null)[] = [null, 'key-installed', 'limit-set', 'transfer-within-limit', 'limit-enforced', 'bypass-blocked'];

  return [{
    id: 'session-keys',
    label: 'Session Keys',
    steps: steps.map((step, i) => {
      const milestone = milestoneForStep[i];
      let status: 'done' | 'active' | 'pending';

      if (i === 0) {
        status = hasWallet ? 'done' : 'active';
      } else if (milestone && milestones.has(milestone)) {
        status = 'done';
      } else {
        // Active if all previous milestones are done
        const prevMilestones = milestoneForStep.slice(1, i).filter(Boolean) as Milestone[];
        const allPrevDone = i === 1 ? hasWallet : (hasWallet && prevMilestones.every(m => milestones.has(m)));
        status = allPrevDone ? 'active' : 'pending';
      }

      return { ...step, status };
    }),
  }];
}

export default function SessionKeysDemo({ instanceId }: { instanceId: string }) {
  const { sessions, updateSession, resumeDemo } = useDemoSession();
  const session = sessions.find((s) => s.id === instanceId);
  const savedMilestones = session?.milestones as Milestone[] | undefined;
  const [wallet, setWallet] = useState<AgentWallet | null>(null);
  const [milestones, setMilestones] = useState<Set<Milestone>>(
    () => new Set(savedMilestones ?? []),
  );
  const [pickerDone, setPickerDone] = useState(!!session?.accountAddress || (session?.milestones?.length ?? 0) > 0);

  const handleAccountCreated = (w: AgentWallet) => {
    setWallet(w);
    updateSession(instanceId, { accountAddress: w.address, stepHint: 'Step 1: Install Session Key' });
  };

  const handleMilestone = useCallback((event: string) => {
    const milestone = event as Milestone;
    setMilestones((prev) => {
      if (prev.has(milestone)) return prev;
      const next = new Set(prev);
      next.add(milestone);
      return next;
    });
    const hint = STEP_HINTS[milestone];
    if (hint) {
      updateSession(instanceId, { stepHint: hint, milestones: [...(session?.milestones ?? []), milestone] });
    }
  }, [instanceId, updateSession, session?.milestones]);

  const handleMarkComplete = () => {
    updateSession(instanceId, {
      status: 'completed',
      completedAt: Date.now(),
      stepHint: undefined,
      milestones: Array.from(milestones),
    });
  };

  const activeStep = useMemo((): 'install-key' | 'set-limit' | 'transfer-within' | 'exceed-limit' | 'bypass' => {
    if (!milestones.has('key-installed')) return 'install-key';
    if (!milestones.has('limit-set')) return 'set-limit';
    if (!milestones.has('transfer-within-limit')) return 'transfer-within';
    if (!milestones.has('limit-enforced')) return 'exceed-limit';
    return 'bypass';
  }, [milestones]);

  if (!pickerDone && !wallet) {
    return (
      <DemoSessionPicker
        demoType="session-keys"
        currentInstanceId={instanceId}
        onResume={(id) => resumeDemo(id)}
        onStartFresh={() => setPickerDone(true)}
      />
    );
  }

  const isComplete = session?.status === 'completed';
  const groups = buildStepGroups(milestones, !!wallet);

  const noop = () => {};
  const layoutProps = {
    account: {
      address: wallet?.address ?? session?.accountAddress ?? null,
      balance: null as bigint | null,
      balanceLoading: false,
      balanceRevealed: false,
      retryStatus: null as string | null,
      onDecrypt: noop,
      onToggleReveal: noop,
    },
    groups,
    activeGroupId: 'session-keys',
    onGroupSelect: noop,
    onMarkComplete: handleMarkComplete,
    isComplete,
    repoUrl: 'https://github.com/OpenZeppelin/open-accounts-framework/blob/main/packages/contracts/src/modules/ERC7579SessionKeys.sol',
  };

  if (!wallet) {
    return (
      <DemoLayout {...layoutProps}>
        <div className="space-y-6">
          <Alert>
            <Zap className="h-4 w-4" />
            <AlertTitle>Session Keys</AlertTitle>
            <AlertDescription>
              Scoped agent keys with FHE-encrypted spending limits enforced on-chain.
              This demo installs a session key, sets a spending limit, then demonstrates
              enforcement (within limit, over limit, and bypass attempt).
            </AlertDescription>
          </Alert>
          <DemoAccountSetup
            onAccountCreated={handleAccountCreated}
            existingAddress={session?.accountAddress}
            showReusableAccounts
          />
        </div>
      </DemoLayout>
    );
  }

  return (
    <DemoWalletProvider wallet={wallet}>
      <DemoLayout {...layoutProps}>
        <SessionKeysTab onMilestone={handleMilestone} completedMilestones={Array.from(milestones)} instanceId={instanceId} visibleStep={activeStep} />
      </DemoLayout>
    </DemoWalletProvider>
  );
}
