import { CheckCircle2, Loader2, Ban } from 'lucide-react';

export type StepStatus = 'pending' | 'active' | 'done' | 'error';
export type StepTag = 'no gas' | 'gas';

export interface SubStep {
  label: string;
  detail?: string;
  tag?: StepTag;
  status: StepStatus;
}

const TAG_STYLES: Record<StepTag, string> = {
  'no gas': 'bg-gray-100 text-gray-600',
  'gas': 'bg-amber-100 text-amber-700',
};

const TAG_LABELS: Record<StepTag, string> = {
  'no gas': 'no gas',
  'gas': 'gas',
};

/**
 * Vertical checklist showing all sub-steps upfront with status icons.
 * Used in multi-step flows so the user knows how many operations to expect.
 *
 * Pattern: define steps array with labels, track an activeIdx,
 * then map: i < activeIdx → done, i === activeIdx → active, else pending.
 */
export default function StepProgress({ steps }: { steps: SubStep[] }) {
  return (
    <div className="space-y-1.5 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
      {steps.map((s, i) => (
        <div key={i} className="flex items-start gap-2.5">
          <div className="mt-0.5 shrink-0">
            {s.status === 'done' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            {s.status === 'active' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            {s.status === 'pending' && <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />}
            {s.status === 'error' && <Ban className="h-4 w-4 text-destructive" />}
          </div>
          <div>
            <span className={`text-sm ${s.status === 'active' ? 'font-medium' : s.status === 'pending' ? 'text-muted-foreground' : ''}`}>
              {s.label}
              {s.tag && (
                <span className={`ml-1.5 inline-flex items-center rounded px-1 py-0.5 text-[10px] font-medium leading-none ${TAG_STYLES[s.tag]}`}>
                  {TAG_LABELS[s.tag]}
                </span>
              )}
            </span>
            {s.detail && s.status === 'active' && (
              <div className="text-xs text-muted-foreground">{s.detail}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Helper: given step definitions and current active index, produce SubStep[] with statuses */
export function mapStepStatus(
  defs: Array<{ label: string; detail?: string; tag?: StepTag }>,
  activeIdx: number,
): SubStep[] {
  return defs.map((s, i) => ({
    ...s,
    status: i < activeIdx ? 'done' as const : i === activeIdx ? 'active' as const : 'pending' as const,
  }));
}
