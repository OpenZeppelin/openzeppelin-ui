import { useState, useCallback, useMemo } from 'react';
import { MultisigWalletProvider } from '../../hooks/useMultisigWallet';
import { DemoWalletProvider } from '../../hooks/useDemoWallet';
import { useDemoSession } from '../../hooks/useDemoSession';
import DemoSessionPicker from '../DemoSessionPicker';
import MultisigTab, { type MultisigMilestone } from '../MultisigTab';
import DemoLayout from '../DemoLayout';
import type { StepGroup } from '../DemoLayout';

const STEP_HINTS: Record<MultisigMilestone, string> = {
  'preview-seen': 'Name the Signatories',
  'authorities-named': 'Deploy & Fund',
  'treasury-deployed': 'Install Encrypted Governance',
  'governance-installed': 'Hand Over Control',
  'control-handed-over': 'Authorized Transfer',
  'transfer-approved': 'Blocked Transfer',
  'transfer-blocked': 'Four Vantage Points',
  'vantage-complete': 'Demo complete',
};

type TreasuryStepId = 'vantage-preview' | 'name-authorities' | 'deploy-fund' | 'install-governance' | 'hand-over-control' | 'authorized-transfer' | 'blocked-transfer' | 'vantage-live';

function getActiveStep(milestones: Set<MultisigMilestone>): TreasuryStepId {
  if (!milestones.has('preview-seen')) return 'vantage-preview';
  if (!milestones.has('authorities-named')) return 'name-authorities';
  if (!milestones.has('treasury-deployed')) return 'deploy-fund';
  if (!milestones.has('governance-installed')) return 'install-governance';
  if (!milestones.has('control-handed-over')) return 'hand-over-control';
  if (!milestones.has('transfer-approved')) return 'authorized-transfer';
  if (!milestones.has('transfer-blocked')) return 'blocked-transfer';
  if (!milestones.has('vantage-complete')) return 'vantage-live';
  return 'vantage-live';
}

function buildStepGroups(milestones: Set<MultisigMilestone>): StepGroup[] {
  const activeStep = getActiveStep(milestones);

  const steps = [
    { id: 'vantage-preview', label: 'Four Vantage Points' },
    { id: 'name-authorities', label: 'Name the Signatories' },
    { id: 'deploy-fund', label: 'Deploy & Fund' },
    { id: 'install-governance', label: 'Install Encrypted Governance' },
    { id: 'hand-over-control', label: 'Hand Over Control' },
    { id: 'authorized-transfer', label: 'Authorized Transfer' },
    { id: 'blocked-transfer', label: 'Blocked Transfer' },
    { id: 'vantage-live', label: 'Four Vantage Points (Live)' },
  ];

  const milestoneForStep: MultisigMilestone[] = [
    'preview-seen', 'authorities-named', 'treasury-deployed', 'governance-installed',
    'control-handed-over', 'transfer-approved', 'transfer-blocked', 'vantage-complete'
  ];

  return [{
    id: 'treasury',
    label: 'Confidential Treasury',
    steps: steps.map((step, i) => {
      const milestone = milestoneForStep[i];
      let status: 'done' | 'active' | 'pending';

      if (milestones.has(milestone)) {
        status = 'done';
      } else if (step.id === activeStep) {
        status = 'active';
      } else {
        status = 'pending';
      }

      return { ...step, status };
    }),
  }];
}

export default function MultisigDemo({ instanceId }: { instanceId: string }) {
  const { sessions, updateSession, resumeDemo } = useDemoSession();
  const session = sessions.find((s) => s.id === instanceId);
  const savedMilestones = session?.milestones as MultisigMilestone[] | undefined;
  const [milestones, setMilestones] = useState<Set<MultisigMilestone>>(
    () => new Set(savedMilestones ?? []),
  );
  const [pickerDone, setPickerDone] = useState(!!session?.accountAddress || (session?.milestones?.length ?? 0) > 0);
  const [stepOverride, setStepOverride] = useState<string | null>(null);

  const activeStep = useMemo(() => getActiveStep(milestones), [milestones]);

  const handleMilestone = useCallback((event: MultisigMilestone) => {
    setStepOverride((prev) => prev ?? activeStep);
    setMilestones((prev) => {
      if (prev.has(event)) return prev;
      const next = new Set(prev);
      next.add(event);
      return next;
    });
    const hint = STEP_HINTS[event];
    if (hint) {
      updateSession(instanceId, { stepHint: hint, milestones: [...(session?.milestones ?? []), event] });
    }
  }, [instanceId, updateSession, session?.milestones, activeStep]);

  const handleMarkComplete = () => {
    updateSession(instanceId, {
      status: 'completed',
      completedAt: Date.now(),
      stepHint: undefined,
      milestones: Array.from(milestones),
    });
  };

  if (!pickerDone) {
    return (
      <DemoSessionPicker
        demoType="multisig"
        currentInstanceId={instanceId}
        onResume={(id) => resumeDemo(id)}
        onStartFresh={() => setPickerDone(true)}
      />
    );
  }

  const isComplete = session?.status === 'completed';
  const groups = buildStepGroups(milestones);

  const effectiveStep = (stepOverride as TreasuryStepId) || activeStep;

  const adminRemoved = milestones.has('control-handed-over');
  const noop = () => {};
  const layoutProps = {
    account: {
      address: session?.accountAddress ?? null,
      balance: null as bigint | null,
      balanceLoading: false,
      balanceRevealed: false,
      retryStatus: null as string | null,
      onDecrypt: noop,
      onToggleReveal: noop,
      statusLabel: session?.accountAddress ? 'Admin' : undefined,
      statusValue: adminRemoved ? 'Removed' : 'Active',
      statusColor: adminRemoved ? 'text-green-600' : 'text-amber-600',
    },
    groups,
    activeGroupId: 'treasury',
    onGroupSelect: noop,
    onStepSelect: (id: string) => setStepOverride(id),
    onMarkComplete: handleMarkComplete,
    isComplete,
    repoUrl: 'https://github.com/OpenZeppelin/open-accounts-framework/blob/main/packages/contracts/src/modules/ERC7579MultisigConfidential.sol',
  };

  return (
    <DemoWalletProvider wallet={null}>
      <MultisigWalletProvider instanceId={instanceId}>
        <DemoLayout {...layoutProps}>
          <MultisigTab
            onMilestone={handleMilestone}
            completedMilestones={Array.from(milestones)}
            onTreasuryCreated={(address) => updateSession(instanceId, { accountAddress: address })}
            visibleStep={effectiveStep}
            onAdvance={() => setStepOverride(null)}
          />
        </DemoLayout>
      </MultisigWalletProvider>
    </DemoWalletProvider>
  );
}
