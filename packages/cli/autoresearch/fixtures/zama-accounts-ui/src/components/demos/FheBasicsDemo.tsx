import { useState, useCallback, useMemo } from 'react';
import type { AgentWallet } from '@zama-accounts/sdk';
import { getAddress } from 'viem';
import { useDemoSession } from '../../hooks/useDemoSession';
import { DemoWalletProvider } from '../../hooks/useDemoWallet';
import DemoAccountSetup from '../DemoAccountSetup';
import DemoSessionPicker from '../DemoSessionPicker';
import ConfidentialTransfersTab from '../ConfidentialTransfersTab';
import ObserversTab from '../ObserversTab';
import DemoLayout from '../DemoLayout';
import type { StepGroup } from '../DemoLayout';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Lock } from 'lucide-react';
import { FAUCET_TOKEN_ADDRESS } from '../../config/constants';

type Milestone = 'minted' | 'transferred' | 'decrypted' | 'access-denied-proved' | 'observer-granted' | 'observers-listed' | 'observer-revoked';
const TRANSFERS_DONE: Milestone[] = ['minted', 'transferred', 'decrypted'];

const STEP_HINTS: Record<Milestone, string> = {
  minted: 'Confidential Transfer',
  transferred: 'Decrypt Balance',
  decrypted: 'Prove Access Denied',
  'access-denied-proved': 'Grant Access',
  'observer-granted': 'List Observers',
  'observers-listed': 'Revoke Access',
  'observer-revoked': 'Demo ready to complete',
};

function getActiveTransferStep(milestones: Set<Milestone>): 'mint' | 'transfer' | 'decrypt' {
  if (!milestones.has('minted')) return 'mint';
  if (!milestones.has('transferred')) return 'transfer';
  return 'decrypt';
}

function getActiveObserverStep(milestones: Set<Milestone>): 'prove-denied' | 'grant' | 'list' | 'revoke' {
  if (!milestones.has('access-denied-proved')) return 'prove-denied';
  if (!milestones.has('observer-granted')) return 'grant';
  if (!milestones.has('observers-listed')) return 'list';
  return 'revoke';
}

function buildStepGroups(milestones: Set<Milestone>, activeSection: 'transfers' | 'observers', hasWallet: boolean): StepGroup[] {
  const transfersDone = TRANSFERS_DONE.every((m) => milestones.has(m));

  function transferStepStatus(milestone: Milestone, prevMilestones: Milestone[]): 'done' | 'active' | 'pending' {
    if (milestones.has(milestone)) return 'done';
    if (prevMilestones.every((m) => milestones.has(m)) && activeSection === 'transfers') return 'active';
    return 'pending';
  }

  const createStatus = hasWallet ? 'done' as const : 'active' as const;

  const transferSteps = [
    { id: 'create', label: 'Create Account', status: createStatus },
    { id: 'mint', label: 'Mint Confidential Tokens', subtitle: 'ERC-7984', status: hasWallet ? transferStepStatus('minted', []) : 'pending' as const },
    { id: 'transfer', label: 'Confidential Transfer', status: hasWallet ? transferStepStatus('transferred', ['minted']) : 'pending' as const },
    { id: 'decrypt', label: 'Decrypt Balance', status: hasWallet ? transferStepStatus('decrypted', ['minted', 'transferred']) : 'pending' as const },
  ];

  function observerStepStatus(milestone: Milestone, prevMilestones: Milestone[]): 'done' | 'active' | 'pending' | 'locked' {
    if (!transfersDone) return 'locked';
    if (milestones.has(milestone)) return 'done';
    if (prevMilestones.every((m) => milestones.has(m)) && activeSection === 'observers') return 'active';
    return 'pending';
  }

  const observerSteps = [
    { id: 'prove-denied', label: 'Prove Access Denied', status: observerStepStatus('access-denied-proved', []) },
    { id: 'grant', label: 'Grant Access', status: observerStepStatus('observer-granted', ['access-denied-proved']) },
    { id: 'list', label: 'Decrypt Balance As Observer', status: observerStepStatus('observers-listed', ['access-denied-proved', 'observer-granted']) },
    { id: 'revoke', label: 'Revoke Access', status: observerStepStatus('observer-revoked', ['access-denied-proved', 'observer-granted', 'observers-listed']) },
  ];

  return [
    { id: 'transfers', label: 'Transfers', steps: transferSteps },
    { id: 'observers', label: 'Observers', steps: observerSteps, locked: !transfersDone },
  ];
}

export default function FheBasicsDemo({ instanceId }: { instanceId: string }) {
  const { sessions, updateSession, resumeDemo } = useDemoSession();
  const session = sessions.find((s) => s.id === instanceId);
  const savedMilestones = session?.milestones as Milestone[] | undefined;
  const [wallet, setWallet] = useState<AgentWallet | null>(null);
  const [milestones, setMilestones] = useState<Set<Milestone>>(
    () => new Set(savedMilestones ?? []),
  );
  const [pickerDone, setPickerDone] = useState(!!session?.accountAddress || (session?.milestones?.length ?? 0) > 0);

  const transfersDone = TRANSFERS_DONE.every((m) => milestones.has(m));
  const [section, setSection] = useState<'transfers' | 'observers'>(
    transfersDone ? 'observers' : 'transfers',
  );

  // Override: when user clicks a completed step in the sidebar, show that step
  const [stepOverride, setStepOverride] = useState<string | null>(null);

  // Sidebar balance state (independent of tab inline balances)
  const [sidebarBalance, setSidebarBalance] = useState<bigint | null>(null);
  const [sidebarBalanceLoading, setSidebarBalanceLoading] = useState(false);
  const [sidebarBalanceRevealed, setSidebarBalanceRevealed] = useState(false);
  const [sidebarRetryStatus, setSidebarRetryStatus] = useState<string | null>(null);

  const handleSidebarDecrypt = useCallback(async () => {
    if (!wallet || sidebarBalanceLoading) return;
    setSidebarBalanceLoading(true);
    setSidebarBalance(null);
    setSidebarBalanceRevealed(false);
    setSidebarRetryStatus(null);
    const MAX_RETRIES = 5;
    const RETRY_DELAY_MS = 20_000;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const bal = await wallet.getConfidentialBalance(getAddress(FAUCET_TOKEN_ADDRESS));
        setSidebarBalance(bal);
        setSidebarRetryStatus(null);
        setSidebarBalanceLoading(false);
        setSidebarBalanceRevealed(true);
        return;
      } catch (e) {
        console.error(`Sidebar balance check failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, e);
        if (attempt < MAX_RETRIES) {
          setSidebarRetryStatus(`Waiting for Zama relayer... (retry ${attempt + 1}/${MAX_RETRIES})`);
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        } else {
          setSidebarRetryStatus('Decrypt failed after retries. Try again later.');
        }
      }
    }
    setSidebarBalanceLoading(false);
  }, [wallet, sidebarBalanceLoading]);

  const handleAccountCreated = (w: AgentWallet) => {
    setWallet(w);
    updateSession(instanceId, { accountAddress: w.address, stepHint: 'Step 1: Mint Tokens' });
  };

  const handleMilestone = useCallback((event: string) => {
    const milestone = event as Milestone;
    // Hold view on current step — user clicks "Next Step" to advance
    if (!stepOverride) {
      const currentStep = section === 'transfers' ? activeTransferStep : activeObserverStep;
      setStepOverride(currentStep);
    }
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

  // Derive which step to show in the main area
  const activeTransferStep = useMemo(() => getActiveTransferStep(milestones), [milestones]);
  const activeObserverStep = useMemo(() => getActiveObserverStep(milestones), [milestones]);

  if (!pickerDone && !wallet) {
    return (
      <DemoSessionPicker
        demoType="fhe-basics"
        currentInstanceId={instanceId}
        onResume={(id) => resumeDemo(id)}
        onStartFresh={() => setPickerDone(true)}
      />
    );
  }

  const isComplete = session?.status === 'completed';
  const groups = buildStepGroups(milestones, section, !!wallet);

  const sidebarAccount = {
    address: wallet?.address ?? session?.accountAddress ?? null,
    balance: sidebarBalance,
    balanceLoading: sidebarBalanceLoading,
    balanceRevealed: sidebarBalanceRevealed,
    retryStatus: sidebarRetryStatus,
    onDecrypt: handleSidebarDecrypt,
    onToggleReveal: () => setSidebarBalanceRevealed((prev) => !prev),
  };

  const TRANSFER_STEP_IDS = ['create', 'mint', 'transfer', 'decrypt'];
  const OBSERVER_STEP_IDS = ['prove-denied', 'grant', 'list', 'revoke'];

  const handleStepSelect = (stepId: string) => {
    setStepOverride(stepId);
    if (TRANSFER_STEP_IDS.includes(stepId)) {
      setSection('transfers');
    } else if (OBSERVER_STEP_IDS.includes(stepId)) {
      if (transfersDone) setSection('observers');
    }
  };

  // Use override if set, otherwise use the milestone-derived active step
  const effectiveTransferStep = stepOverride && TRANSFER_STEP_IDS.includes(stepOverride)
    ? stepOverride as 'mint' | 'transfer' | 'decrypt'
    : activeTransferStep;
  const effectiveObserverStep = stepOverride && OBSERVER_STEP_IDS.includes(stepOverride)
    ? stepOverride as 'prove-denied' | 'grant' | 'list' | 'revoke'
    : activeObserverStep;

  const layoutProps = {
    account: sidebarAccount,
    groups,
    activeGroupId: section,
    onGroupSelect: (id: string) => {
      if (id === 'observers' && !transfersDone) return;
      setStepOverride(null);
      setSection(id as 'transfers' | 'observers');
    },
    onStepSelect: handleStepSelect,
    onMarkComplete: handleMarkComplete,
    isComplete,
    repoUrl: 'https://github.com/OpenZeppelin/open-accounts-framework/blob/main/packages/contracts/src/OpenAccount.sol',
  };

  if (!wallet) {
    return (
      <DemoLayout {...layoutProps}>
        <div className="space-y-6">
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertTitle>FHE Basics</AlertTitle>
            <AlertDescription>
              Encrypted transfers and observer delegation. This demo creates a smart account,
              mints confidential tokens, transfers them, then lets you delegate and revoke observer access.
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
        <div className="space-y-4">
          {section === 'transfers'
            ? <ConfidentialTransfersTab
                onMilestone={handleMilestone}
                transfersComplete={transfersDone}
                onContinue={() => setSection('observers')}
                visibleStep={effectiveTransferStep}
                onAdvance={() => setStepOverride(null)}
              />
            : <ObserversTab
                onMilestone={handleMilestone}
                visibleStep={effectiveObserverStep}
                onAdvance={() => setStepOverride(null)}
              />
          }
        </div>
      </DemoLayout>
    </DemoWalletProvider>
  );
}
