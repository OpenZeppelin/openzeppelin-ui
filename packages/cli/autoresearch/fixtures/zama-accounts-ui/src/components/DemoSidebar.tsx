import { CheckCircle2, Lock, Eye, EyeOff, Loader2, Copy, ExternalLink, Trophy, Github } from 'lucide-react';
import { useState } from 'react';

export type SidebarStepStatus = 'locked' | 'pending' | 'active' | 'done';

export interface SidebarStep {
  id: string;
  label: string;
  subtitle?: string;
  status: SidebarStepStatus;
}

export interface StepGroup {
  id: string;
  label: string;
  steps: SidebarStep[];
  locked?: boolean;
}

interface AccountContext {
  address: string | null;
  balance: bigint | null;
  balanceLoading: boolean;
  balanceRevealed: boolean;
  retryStatus: string | null;
  onDecrypt: () => void;
  onToggleReveal: () => void;
  /** Optional status line shown below balance, e.g. "Admin: Active" */
  statusLabel?: string;
  statusValue?: string;
  statusColor?: string;
}

export interface DemoSidebarProps {
  account: AccountContext;
  groups: StepGroup[];
  activeGroupId: string;
  onGroupSelect: (groupId: string) => void;
  onStepSelect?: (stepId: string) => void;
  onMarkComplete?: () => void;
  isComplete?: boolean;
  repoUrl?: string;
}

function formatBalance(value: bigint): string {
  const TOKEN_DECIMALS = 6;
  const str = value.toString().padStart(TOKEN_DECIMALS + 1, '0');
  const whole = str.slice(0, str.length - TOKEN_DECIMALS);
  const frac = str.slice(str.length - TOKEN_DECIMALS).replace(/0+$/, '') || '0';
  return `${whole}.${frac}`;
}

function StepIcon({ status }: { status: SidebarStepStatus }) {
  if (status === 'done') {
    return (
      <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-green-100 border border-green-600">
        <CheckCircle2 className="h-3 w-3 text-green-700" />
      </div>
    );
  }
  if (status === 'active') {
    return (
      <div className="h-[18px] w-[18px] shrink-0 rounded-full border-2 border-primary bg-primary/20" />
    );
  }
  if (status === 'locked') {
    return (
      <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-muted-foreground/20">
        <Lock className="h-2.5 w-2.5 text-muted-foreground/30" />
      </div>
    );
  }
  // pending
  return (
    <div className="h-[18px] w-[18px] shrink-0 rounded-full border-2 border-muted-foreground/30" />
  );
}

export default function DemoSidebar({ account, groups, activeGroupId, onGroupSelect, onStepSelect, onMarkComplete, isComplete, repoUrl }: DemoSidebarProps) {
  const [copied, setCopied] = useState(false);
  const shortAddress = account.address
    ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}`
    : null;

  const handleCopy = () => {
    if (!account.address) return;
    navigator.clipboard.writeText(account.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-56 shrink-0 sticky top-16 self-start border-r border-border bg-muted/30 rounded-lg overflow-hidden text-[13px]">
      {/* Repo link */}
      {repoUrl && (
        <div className="border-b border-border px-3 py-3">
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <Github className="h-3.5 w-3.5" />
            View Source on GitHub
          </a>
        </div>
      )}

      {/* Account context card */}
      <div className="border-b border-border px-3 py-3">
        {shortAddress ? (
          <>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="font-medium font-mono text-xs">{shortAddress}</span>
              <button
                onClick={handleCopy}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title={copied ? 'Copied!' : 'Copy address'}
              >
                <Copy className="h-3 w-3" />
              </button>
              <a
                href={`https://sepolia.etherscan.io/address/${account.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="View on Etherscan"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* Balance with decrypt button — matches app pattern */}
            {account.balance !== null && account.balanceRevealed ? (
              <div className="flex items-center gap-2 rounded border border-green-200 bg-green-50 px-2.5 py-1.5">
                <span className="font-mono text-xs font-medium text-green-800">
                  {formatBalance(account.balance)} cTEST
                </span>
                <button
                  onClick={account.onToggleReveal}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <EyeOff className="h-3 w-3" />
                </button>
              </div>
            ) : account.balance !== null && !account.balanceRevealed ? (
              <div className="flex items-center gap-2 rounded border px-2.5 py-1.5">
                <span className="font-mono text-xs text-muted-foreground">••••••</span>
                <button
                  onClick={account.onToggleReveal}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  <Eye className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={account.onDecrypt}
                disabled={account.balanceLoading}
                className="flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-xs hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-50 w-full"
              >
                {account.balanceLoading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    <span className="text-muted-foreground">Decrypting...</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3 text-muted-foreground" />
                    <span>Decrypt Balance</span>
                  </>
                )}
              </button>
            )}

            {account.retryStatus && (
              <p className="text-[10px] text-amber-600 mt-1">{account.retryStatus}</p>
            )}

            {account.statusLabel && (
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                <span className="text-[10px] text-muted-foreground">{account.statusLabel}</span>
                <span className={`text-[10px] font-medium ${account.statusColor ?? 'text-foreground'}`}>{account.statusValue}</span>
              </div>
            )}
          </>
        ) : (
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Smart Account</span>
            <div className="mt-1">Not deployed</div>
          </div>
        )}
      </div>

      {/* Step groups */}
      <div className="py-2">
        {groups.map((group, groupIdx) => (
          <div key={group.id}>
            {groupIdx > 0 && <hr className="mx-3 my-2 border-border" />}

            <button
              onClick={() => !group.locked && onGroupSelect(group.id)}
              className={`w-full text-left px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                group.locked
                  ? 'text-muted-foreground/40 cursor-not-allowed'
                  : group.id === activeGroupId
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground cursor-pointer'
              }`}
            >
              <span className="flex items-center gap-1.5">
                {group.label}
                {group.locked && <Lock className="h-2.5 w-2.5" />}
              </span>
            </button>

            <div className="space-y-0.5">
              {group.steps.map((step) => {
                const clickable = (step.status === 'done' || step.status === 'active') && onStepSelect;
                return (
                  <div
                    key={step.id}
                    onClick={clickable ? () => onStepSelect(step.id) : undefined}
                    className={`flex items-start gap-2 px-3 py-1.5 border-l-2 transition-colors ${
                      step.status === 'active'
                        ? 'border-l-primary bg-background'
                        : step.status === 'done'
                          ? 'border-l-transparent opacity-60'
                          : step.status === 'locked'
                            ? 'border-l-transparent opacity-25'
                            : 'border-l-transparent'
                    }${clickable ? ' cursor-pointer hover:opacity-80' : ''}`}
                  >
                    <StepIcon status={step.status} />
                    <div className="min-w-0">
                      <div className={`text-[11px] font-medium leading-tight ${
                        step.status === 'active' ? 'text-primary' : ''
                      }`}>
                        {step.label}
                      </div>
                      {step.subtitle && (
                        <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                          {step.subtitle}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Mark complete */}
      {onMarkComplete && (
        <div className="border-t border-border px-3 py-3">
          {isComplete ? (
            <div className="flex items-center gap-1.5 text-xs text-green-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="font-medium">Demo Complete</span>
            </div>
          ) : (
            <button
              onClick={onMarkComplete}
              className="flex items-center gap-1.5 w-full rounded border border-green-300 px-2.5 py-1.5 text-xs text-green-700 hover:bg-green-50 transition-colors"
            >
              <Trophy className="h-3 w-3" />
              Mark Demo Complete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
