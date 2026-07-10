/**
 * @vitest-environment jsdom
 *
 * SF-6 · CoinType wrong-chain funds gate — INV-134..137, INV-148, INV-135/136 (extends INV-75/84).
 */
import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { nameResolutionChainScopeMismatchMessage } from '@openzeppelin/ui-utils';

import {
  controlledResolver,
  elapseDebounce,
  HEX_ALICE,
  okResult,
  renderAddressField,
  settle,
  typeValue,
} from './helpers';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

const SCOPED_BASE = 'eip155:8453';
const ACTIVE_OPTIMISM = 'eip155:10';

describe('INV-134 / INV-136: chain-scope mismatch blocks hex write — funds posture identical to unresolved', () => {
  it('never writes hex and keeps RHF at "" when scopedToNetworkId ≠ activeNetworkId', async () => {
    const r = controlledResolver();
    const h = renderAddressField({
      resolver: {
        resolveName: r.resolveName,
        activeNetworkId: ACTIVE_OPTIMISM,
        activeNetworkName: 'Optimism',
      },
      required: true,
    });

    typeValue('alice.eth');
    await elapseDebounce();
    await settle(
      r.deferreds[0],
      okResult('alice.eth', HEX_ALICE, { scopedToNetworkId: SCOPED_BASE })
    );

    expect(h.rhfValue()).toBe('');
    expect(h.rhfIsValid()).toBe(false);
    expect(h.input().value).toBe('alice.eth');
  });

  it('writes hex when scoped id matches active network (gate passes)', async () => {
    const r = controlledResolver();
    const h = renderAddressField({
      resolver: {
        resolveName: r.resolveName,
        activeNetworkId: SCOPED_BASE,
      },
    });

    typeValue('alice.eth');
    await elapseDebounce();
    await settle(
      r.deferreds[0],
      okResult('alice.eth', HEX_ALICE, { scopedToNetworkId: SCOPED_BASE })
    );

    expect(h.rhfValue()).toBe(HEX_ALICE);
    expect(h.rhfIsValid()).toBe(true);
  });

  it('gate off without activeNetworkId — mismatch fixture still writes hex (INV-133)', async () => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName } });

    typeValue('alice.eth');
    await elapseDebounce();
    await settle(
      r.deferreds[0],
      okResult('alice.eth', HEX_ALICE, { scopedToNetworkId: SCOPED_BASE })
    );

    expect(h.rhfValue()).toBe(HEX_ALICE);
  });
});

describe('INV-135: chain-scope mismatch extends the pending name gate (INV-84)', () => {
  it('optional field stays invalid when resolved but scope-blocked', async () => {
    const r = controlledResolver();
    const h = renderAddressField({
      resolver: {
        resolveName: r.resolveName,
        activeNetworkId: ACTIVE_OPTIMISM,
      },
      required: false,
    });

    typeValue('alice.eth');
    await elapseDebounce();
    await settle(
      r.deferreds[0],
      okResult('alice.eth', HEX_ALICE, { scopedToNetworkId: SCOPED_BASE })
    );

    expect(h.rhfIsValid()).toBe(false);
  });
});

describe('INV-137 / INV-148: chain-scope mismatch announcer — alert, utils message, no retry', () => {
  it('renders role=alert with utils-only message and no success copy or retry', async () => {
    const r = controlledResolver();
    const h = renderAddressField({
      resolver: {
        resolveName: r.resolveName,
        activeNetworkId: ACTIVE_OPTIMISM,
        activeNetworkName: 'Optimism',
      },
    });

    typeValue('alice.eth');
    await elapseDebounce();
    await settle(
      r.deferreds[0],
      okResult('alice.eth', HEX_ALICE, { scopedToNetworkId: SCOPED_BASE })
    );

    const alert = h.region()?.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert?.textContent).toContain(
      nameResolutionChainScopeMismatchMessage({ activeNetworkName: 'Optimism' })
    );
    expect(h.region()?.textContent).not.toContain('Resolved to');
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });
});

describe('INV-91: raw scopedToNetworkId and adapter labels never reach the DOM on mismatch', () => {
  it('excludes scoped id and provenance.label from user-visible text', async () => {
    const r = controlledResolver();
    renderAddressField({
      resolver: {
        resolveName: r.resolveName,
        activeNetworkId: ACTIVE_OPTIMISM,
      },
    });

    typeValue('alice.eth');
    await elapseDebounce();
    await settle(
      r.deferreds[0],
      okResult('alice.eth', HEX_ALICE, {
        label: 'ENS via external gateway',
        external: true,
        scopedToNetworkId: SCOPED_BASE,
      })
    );

    expect(document.body.textContent).not.toContain(SCOPED_BASE);
    expect(document.body.textContent).not.toContain('ENS via external gateway');
  });
});
