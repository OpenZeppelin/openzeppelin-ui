export interface JsonCommandResult<TAction extends string> {
  ok: boolean;
  action: TAction;
}

export interface JsonTaskStateSummary {
  id: string;
  phase: string;
  phaseDetail?: string;
  type: string;
  statusBefore: string;
  statusAfter: string;
}
