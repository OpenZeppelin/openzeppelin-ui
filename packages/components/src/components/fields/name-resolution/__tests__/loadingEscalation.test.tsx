/**
 * @vitest-environment jsdom
 *
 * SF-6 · Field-integrated loading escalation — INV-129 / INV-130 / INV-150.
 */
import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RESOLVING_ANNOUNCER_ESCALATE_AFTER_MS } from '../useResolvingAnnouncerCopy';
import { controlledResolver, elapseDebounce, renderAddressField, typeValue } from './helpers';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

async function advanceEscalation(): Promise<void> {
  await act(async () => {
    vi.advanceTimersByTime(RESOLVING_ANNOUNCER_ESCALATE_AFTER_MS);
  });
}

describe('INV-129 / INV-130: two-phase loading copy in AddressField announcer', () => {
  it('shows "Resolving…" then "Still resolving…" during a long pending resolve', async () => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName } });

    typeValue('alice.eth');
    await elapseDebounce();

    expect(h.region()?.textContent).toContain('Resolving…');
    expect(h.region()?.textContent).not.toContain('Still resolving…');

    await advanceEscalation();
    expect(h.region()?.textContent).toContain('Still resolving…');
    expect(h.region()?.textContent).not.toMatch(/CCIP|gateway|v2|off-chain/i);
  });
});

describe('INV-150: loading escalation updates the aria-live region', () => {
  it('live region text transitions from phase 1 to phase 2 without focus steal', async () => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName } });

    h.input().focus();
    typeValue('alice.eth');
    await elapseDebounce();

    const region = h.region();
    expect(region?.getAttribute('aria-live')).toBe('polite');
    expect(document.activeElement).toBe(h.input());

    await advanceEscalation();
    expect(region?.textContent).toContain('Still resolving…');
    expect(document.activeElement).toBe(h.input());
  });
});
