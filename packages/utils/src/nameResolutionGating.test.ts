/**
 * SF-6 · Chain-scope gating helpers — Prop/State + Async message contract tests.
 *
 * Verifies:
 *   - INV-133 — `isChainScopeMismatch` strict equality + gate-off without active id
 *   - INV-138 — `nameResolutionChainScopeMismatchMessage` interpolation + generic fallback
 *   - INV-146 — chain-scope copy is utils-only, not routed through `nameResolutionMessageForCode`
 */
import { describe, expect, it } from 'vitest';

import {
  isChainScopeMismatch,
  nameResolutionChainScopeMismatchMessage,
} from './nameResolutionGating';
import { nameResolutionMessageForCode } from './nameResolutionMessages';

const FORBIDDEN_MECHANISM_TOKENS = ['CCIP', 'gateway', 'v2', 'off-chain', 'coinType'] as const;

describe('INV-133: isChainScopeMismatch — strict equality, gate disabled without active network id', () => {
  it.each([
    { scoped: undefined, active: 'eip155:1', expected: false, label: 'absent scoped id' },
    { scoped: '', active: 'eip155:1', expected: false, label: 'empty scoped id' },
    { scoped: 'eip155:8453', active: null, expected: false, label: 'null active id' },
    { scoped: 'eip155:8453', active: undefined, expected: false, label: 'undefined active id' },
    { scoped: 'eip155:8453', active: '', expected: false, label: 'empty active id' },
    { scoped: 'eip155:8453', active: 'eip155:8453', expected: false, label: 'matching ids' },
    { scoped: 'eip155:8453', active: 'eip155:10', expected: true, label: 'mismatching ids' },
    {
      scoped: 'eip155:8453',
      active: 'EIP155:8453',
      expected: true,
      label: 'case-sensitive mismatch (no normalization)',
    },
  ])('$label → $expected', ({ scoped, active, expected }) => {
    expect(isChainScopeMismatch({ scopedToNetworkId: scoped }, active)).toBe(expected);
  });
});

describe('INV-138: nameResolutionChainScopeMismatchMessage — interpolation and generic fallback', () => {
  it('interpolates both network names when supplied', () => {
    const msg = nameResolutionChainScopeMismatchMessage({
      scopedNetworkName: 'Base',
      activeNetworkName: 'Optimism',
    });
    expect(msg).toBe('This name resolves to an address on Base, not Optimism.');
    expect(msg).toContain('Base');
    expect(msg).toContain('Optimism');
  });

  it('uses generic fallback when either name is absent', () => {
    expect(nameResolutionChainScopeMismatchMessage()).toBe(
      'This name resolves to an address for a different network.'
    );
    expect(
      nameResolutionChainScopeMismatchMessage({ scopedNetworkName: 'Base', activeNetworkName: '' })
    ).toBe('This name resolves to an address for a different network.');
    expect(
      nameResolutionChainScopeMismatchMessage({
        scopedNetworkName: '  ',
        activeNetworkName: 'Base',
      })
    ).toBe('This name resolves to an address for a different network.');
  });

  it.each(FORBIDDEN_MECHANISM_TOKENS)('contains no mechanism token %s in any variant', (token) => {
    const interpolated = nameResolutionChainScopeMismatchMessage({
      scopedNetworkName: 'Base',
      activeNetworkName: 'Optimism',
    });
    const generic = nameResolutionChainScopeMismatchMessage();
    expect(interpolated.toLowerCase()).not.toContain(token.toLowerCase());
    expect(generic.toLowerCase()).not.toContain(token.toLowerCase());
  });
});

describe('INV-146: chain-scope copy is outside the SF-1 seven-code mapper', () => {
  it('nameResolutionMessageForCode never emits chain-scope strings', () => {
    const chainScope = nameResolutionChainScopeMismatchMessage({
      scopedNetworkName: 'Base',
      activeNetworkName: 'Optimism',
    });
    const codes = [
      'NAME_NOT_FOUND',
      'ADDRESS_NOT_FOUND',
      'UNSUPPORTED_NETWORK',
      'UNSUPPORTED_NAME',
      'RESOLUTION_TIMEOUT',
      'EXTERNAL_GATEWAY_ERROR',
      'ADAPTER_ERROR',
    ] as const;

    for (const code of codes) {
      expect(nameResolutionMessageForCode(code)).not.toBe(chainScope);
      expect(nameResolutionMessageForCode(code)).not.toContain('different network');
    }
  });
});
