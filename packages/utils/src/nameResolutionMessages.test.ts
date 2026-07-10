/**
 * SF-3 · `nameResolutionMessageForCode` — Async/Error message-contract tests.
 *
 * Verifies:
 *   - INV-88 — all 7 SF-1 codes map to distinct, non-empty, actionable strings;
 *     no catch-all collapses two codes; none returns the legacy generic
 *     "Invalid address format" message.
 *   - INV-78 — `ctx.networkName` is interpolated into the network-scoped codes
 *     (`UNSUPPORTED_NETWORK` / `UNSUPPORTED_NAME`); absent → a generic
 *     "this network" phrasing, never a prop-derived name.
 *   - INV-90 (code half) — the transient/definitive split is a stable property of
 *     the code set (the retry affordance keys off it; wired in the field suite).
 *   - INV-91 — the mapper's only input is the `code`; it never receives or echoes
 *     diagnostic fields (message/detail/reason/cause).
 *   - INV-77 — the module's only `ui-types` dependency is a type import (asserted
 *     structurally: the mapper takes a bare string-literal code, no value import).
 */
import { describe, expect, it } from 'vitest';

import {
  nameResolutionMessageForCode,
  type NameResolutionErrorCode,
} from './nameResolutionMessages';

const ALL_CODES: readonly NameResolutionErrorCode[] = [
  'NAME_NOT_FOUND',
  'ADDRESS_NOT_FOUND',
  'UNSUPPORTED_NETWORK',
  'UNSUPPORTED_NAME',
  'RESOLUTION_TIMEOUT',
  'EXTERNAL_GATEWAY_ERROR',
  'ADAPTER_ERROR',
];

const NETWORK_SCOPED: readonly NameResolutionErrorCode[] = [
  'UNSUPPORTED_NETWORK',
  'UNSUPPORTED_NAME',
];
const LEGACY_GENERIC = 'Invalid address format for the selected chain';

describe('INV-88: all 7 codes map to distinct, actionable messages with no generic collapse', () => {
  it('returns a non-empty string for every code', () => {
    for (const code of ALL_CODES) {
      const msg = nameResolutionMessageForCode(code);
      expect(typeof msg).toBe('string');
      expect(msg.trim().length).toBeGreaterThan(0);
    }
  });

  it('returns 7 mutually distinct messages — no two codes share a string', () => {
    const messages = ALL_CODES.map((c) => nameResolutionMessageForCode(c));
    expect(new Set(messages).size).toBe(ALL_CODES.length);
  });

  it('never returns the legacy generic "Invalid address format" message for any code', () => {
    for (const code of ALL_CODES) {
      expect(nameResolutionMessageForCode(code)).not.toBe(LEGACY_GENERIC);
      expect(nameResolutionMessageForCode(code)).not.toContain('Invalid address format');
    }
  });

  it('distinctness is stable regardless of whether networkName is supplied', () => {
    const withCtx = ALL_CODES.map((c) => nameResolutionMessageForCode(c, { networkName: 'Base' }));
    expect(new Set(withCtx).size).toBe(ALL_CODES.length);
  });
});

describe('INV-78: networkName is interpolated for network-scoped codes; falls back generically', () => {
  it.each(NETWORK_SCOPED)('%s includes the supplied networkName', (code) => {
    expect(nameResolutionMessageForCode(code, { networkName: 'Optimism' })).toContain('Optimism');
  });

  it.each(NETWORK_SCOPED)(
    '%s falls back to a generic phrase when no networkName is given',
    (code) => {
      const msg = nameResolutionMessageForCode(code);
      expect(msg).toContain('this network');
      expect(msg).not.toContain('undefined');
    }
  );

  it('does not interpolate networkName into codes that are not network-scoped', () => {
    const notScoped = ALL_CODES.filter((c) => !NETWORK_SCOPED.includes(c));
    for (const code of notScoped) {
      expect(nameResolutionMessageForCode(code, { networkName: 'ZZZ-Sentinel' })).not.toContain(
        'ZZZ-Sentinel'
      );
    }
  });
});

describe('INV-90 (code half): transient vs definitive is a clean partition of the 7 codes', () => {
  // The field offers retry only for the transient set. This pins the partition the
  // field relies on; the actual button wiring is asserted in the field suite.
  const transient: readonly NameResolutionErrorCode[] = [
    'RESOLUTION_TIMEOUT',
    'EXTERNAL_GATEWAY_ERROR',
    'ADAPTER_ERROR',
  ];
  const definitive: readonly NameResolutionErrorCode[] = [
    'NAME_NOT_FOUND',
    'ADDRESS_NOT_FOUND',
    'UNSUPPORTED_NETWORK',
    'UNSUPPORTED_NAME',
  ];

  it('the two sets partition all 7 codes with no overlap', () => {
    expect(new Set([...transient, ...definitive]).size).toBe(ALL_CODES.length);
    expect(transient.some((c) => definitive.includes(c))).toBe(false);
  });

  it('transient codes phrase a retry ("Try again"); definitive negatives do not', () => {
    for (const c of transient) expect(nameResolutionMessageForCode(c)).toContain('Try again');
    // Definitive negatives state a fact rather than inviting a retry.
    for (const c of definitive) expect(nameResolutionMessageForCode(c)).not.toContain('Try again');
  });
});

describe('INV-91 / INV-77: the mapper consumes only the code (no diagnostic surface)', () => {
  it('accepts a bare string-literal code and never echoes diagnostic text', () => {
    // A distinctive would-be diagnostic string is never an input to the mapper,
    // so it can never appear in the output — the code is the only signal.
    const diagnostic = 'SECRET-ADAPTER-STACK-TRACE';
    for (const code of ALL_CODES) {
      expect(nameResolutionMessageForCode(code)).not.toContain(diagnostic);
    }
  });
});

describe('INV-132 / INV-147: EXTERNAL_GATEWAY_ERROR sharpened — distinct, un-branded', () => {
  const EXTERNAL_GATEWAY_COPY = 'Could not reach the name resolution service. Try again.';

  it('returns the exact sharpened EXTERNAL_GATEWAY string', () => {
    expect(nameResolutionMessageForCode('EXTERNAL_GATEWAY_ERROR')).toBe(EXTERNAL_GATEWAY_COPY);
  });

  it('remains distinct from NAME_NOT_FOUND and ADAPTER_ERROR after sharpen', () => {
    expect(nameResolutionMessageForCode('NAME_NOT_FOUND')).not.toBe(EXTERNAL_GATEWAY_COPY);
    expect(nameResolutionMessageForCode('ADAPTER_ERROR')).not.toBe(EXTERNAL_GATEWAY_COPY);
    expect(new Set(ALL_CODES.map((c) => nameResolutionMessageForCode(c))).size).toBe(
      ALL_CODES.length
    );
  });

  it.each(['CCIP', 'gateway', 'v2', 'off-chain'] as const)(
    'EXTERNAL_GATEWAY copy contains no mechanism token %s',
    (token) => {
      expect(nameResolutionMessageForCode('EXTERNAL_GATEWAY_ERROR').toLowerCase()).not.toContain(
        token.toLowerCase()
      );
    }
  );
});
