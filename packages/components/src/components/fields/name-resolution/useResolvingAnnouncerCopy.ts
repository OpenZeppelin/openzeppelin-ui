import { useEffect, useState } from 'react';

/** Default escalation threshold for long-latency resolves (INV-129/130). */
export const RESOLVING_ANNOUNCER_ESCALATE_AFTER_MS = 3000;

const PHASE_1_COPY = 'Resolving…';
const PHASE_2_COPY = 'Still resolving…';

/** Inputs to the loading-copy hook — no mechanism fields exposed. */
export interface UseResolvingAnnouncerCopyParams {
  /** True while the machine is in `debouncing` or `loading`. */
  readonly isPending: boolean;
  /** Escalation threshold (ms). Default 3000. */
  readonly escalateAfterMs?: number;
}

/**
 * Returns the announcer string for debouncing/loading arms.
 * Phase 1: "Resolving…" (SF-3 default, unchanged for first N ms).
 * Phase 2: "Still resolving…" after threshold — reduces frozen perception
 * during CCIP-scale latency without naming gateway/CCIP/v2.
 */
export function useResolvingAnnouncerCopy({
  isPending,
  escalateAfterMs = RESOLVING_ANNOUNCER_ESCALATE_AFTER_MS,
}: UseResolvingAnnouncerCopyParams): string {
  const [escalated, setEscalated] = useState(false);

  useEffect(() => {
    if (!isPending) {
      setEscalated(false);
      return;
    }

    // INV-131: new pending episode starts at phase 1.
    setEscalated(false);

    const timeoutId = window.setTimeout(() => {
      setEscalated(true);
    }, escalateAfterMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isPending, escalateAfterMs]);

  if (!isPending) {
    return PHASE_1_COPY;
  }

  return escalated ? PHASE_2_COPY : PHASE_1_COPY;
}
