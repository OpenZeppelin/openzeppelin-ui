/**
 * @vitest-environment jsdom
 *
 * SF-3 Rev-2 · Async / loading / error / empty states of the enhanced base
 * `AddressField` (INV-69 / INV-70 / INV-71 / INV-78 / INV-87 / INV-88 /
 * INV-89 / INV-90 / INV-91) plus the INV-119 field half (absent `resolveName`
 * → `UNSUPPORTED_NETWORK` with zero calls).
 *
 * Statuses are driven through the injected seam only — never by poking
 * component internals — so every assertion is on user-observable rendering.
 */
import { fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { NameResolutionError } from '@openzeppelin/ui-types';
import { nameResolutionMessageForCode } from '@openzeppelin/ui-utils';

import {
  controlledResolver,
  elapseDebounce,
  errResult,
  flush,
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

const LEGACY_INVALID_FORMAT = 'Invalid address format for the selected chain';

describe('INV-70 / INV-89: exactly one designed outcome per resolution status', () => {
  it('idle (hex input, resolver present): the region renders no resolution chrome', async () => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName } });
    typeValue(HEX_ALICE);
    await flush();
    expect(h.region()).not.toBeNull();
    expect(h.region()?.textContent).toBe('');
  });

  it('debouncing → a visible "Resolving…" indicator (no blank gap while pending)', async () => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName } });
    typeValue('alice.eth');
    await flush();
    expect(h.region()?.textContent).toContain('Resolving…');
  });

  it('loading → "Resolving…" persists; no resolved panel, no error', async () => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName } });
    typeValue('alice.eth');
    await elapseDebounce();
    expect(h.region()?.textContent).toContain('Resolving…');
    expect(h.region()?.textContent).not.toContain('Resolved to');
    expect(h.region()?.querySelector('[role="alert"]')).toBeNull();
  });

  it('resolved → the panel replaces the indicator; loading and error absent', async () => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName } });
    typeValue('alice.eth');
    await elapseDebounce();
    await settle(r.deferreds[0], okResult('alice.eth', HEX_ALICE));
    expect(h.region()?.textContent).toContain('Resolved to');
    expect(h.region()?.textContent).toContain(HEX_ALICE);
    expect(h.region()?.textContent).not.toContain('Resolving…');
    expect(h.region()?.querySelector('[role="alert"]')).toBeNull();
  });

  it('error → the per-code message replaces everything; no stuck spinner, no resolved panel', async () => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName } });
    typeValue('alice.eth');
    await elapseDebounce();
    await settle(r.deferreds[0], errResult({ code: 'NAME_NOT_FOUND', name: 'alice.eth' }));
    expect(h.region()?.querySelector('[role="alert"]')?.textContent).toContain(
      nameResolutionMessageForCode('NAME_NOT_FOUND')
    );
    expect(h.region()?.textContent).not.toContain('Resolving…');
    expect(h.region()?.textContent).not.toContain('Resolved to');
  });

  it('cleared input → the resolution chrome empties again (no implicit-default state)', async () => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName } });
    typeValue('alice.eth');
    await elapseDebounce();
    await settle(r.deferreds[0], okResult('alice.eth', HEX_ALICE));
    typeValue('');
    await flush();
    expect(h.region()?.textContent).toBe('');
  });
});

describe('INV-69: the input always shows the typed string; the hex lives only in the region', () => {
  it('after resolving, input.value === the typed name and the hex renders as a distinct element', async () => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName } });
    typeValue('alice.eth');
    await elapseDebounce();
    await settle(r.deferreds[0], okResult('alice.eth', HEX_ALICE));

    expect(h.input().value).toBe('alice.eth');
    const code = h.region()?.querySelector('code');
    expect(code?.textContent).toBe(HEX_ALICE);
  });
});

describe('INV-126 / INV-128: mechanism-neutral success display — no provenance label suffix', () => {
  it('renders byte-identical success copy regardless of external/label/scopedToNetworkId provenance', async () => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName } });
    typeValue('alice.eth');
    await elapseDebounce();
    await settle(
      r.deferreds[0],
      okResult('alice.eth', HEX_ALICE, {
        label: 'ENS via external gateway',
        external: true,
        scopedToNetworkId: 'base-mainnet',
      })
    );

    const region = h.region();
    expect(region?.textContent).toContain('Resolved to');
    expect(region?.textContent).toContain(HEX_ALICE);
    expect(region?.textContent).not.toContain('ENS via external gateway');
    expect(region?.textContent).not.toContain('ENS');
    expect(region?.querySelector('img')).toBeNull();
    expect(region?.querySelector('svg')).toBeNull();
    // scoped id is internal gating metadata only — never success chrome (INV-140).
    expect(region?.textContent).not.toContain('base-mainnet');
    // Gate off without activeNetworkId — RHF write proceeds (INV-133).
    expect(h.rhfValue()).toBe(HEX_ALICE);
  });
});

describe('INV-88 / INV-78: per-code messages, never the legacy generic; networkName from the injected result', () => {
  const cases: { error: NameResolutionError; ctx?: { networkName?: string } }[] = [
    { error: { code: 'NAME_NOT_FOUND', name: 'alice.eth' } },
    {
      error: { code: 'UNSUPPORTED_NETWORK', networkId: 'polygon-mainnet' },
      ctx: { networkName: 'polygon-mainnet' },
    },
    { error: { code: 'UNSUPPORTED_NAME', name: 'alice.eth', reason: 'bad tld' } },
    { error: { code: 'RESOLUTION_TIMEOUT', elapsedMs: 5000 } },
    { error: { code: 'EXTERNAL_GATEWAY_ERROR', detail: 'gateway 503' } },
    { error: { code: 'ADAPTER_ERROR', message: 'rpc dead' } },
  ];

  it.each(cases)('renders the exact mapper output for $error.code', async ({ error, ctx }) => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName } });
    typeValue('alice.eth');
    await elapseDebounce();
    await settle(r.deferreds[0], errResult(error));

    const alert = h.region()?.querySelector('[role="alert"]');
    const expected = nameResolutionMessageForCode(error.code, ctx);
    expect(alert?.textContent).toContain(expected);
    expect(alert?.textContent).not.toContain(LEGACY_INVALID_FORMAT);
  });

  it('INV-78: the UNSUPPORTED_NETWORK message names the network from the error payload itself', async () => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName } });
    typeValue('alice.eth');
    await elapseDebounce();
    await settle(
      r.deferreds[0],
      errResult({ code: 'UNSUPPORTED_NETWORK', networkId: 'polygon-mainnet' })
    );
    expect(h.region()?.textContent).toContain('polygon-mainnet');
  });
});

describe('INV-90: retry affordance only for transient codes', () => {
  const transient: NameResolutionError[] = [
    { code: 'RESOLUTION_TIMEOUT', elapsedMs: 5000 },
    { code: 'EXTERNAL_GATEWAY_ERROR', detail: 'gateway 503' },
    { code: 'ADAPTER_ERROR', message: 'rpc dead' },
  ];
  const definitive: NameResolutionError[] = [
    { code: 'NAME_NOT_FOUND', name: 'alice.eth' },
    { code: 'UNSUPPORTED_NAME', name: 'alice.eth', reason: 'bad tld' },
    { code: 'UNSUPPORTED_NETWORK', networkId: 'devnet' },
  ];

  it.each(transient)('offers Retry for transient $code', async (error) => {
    const r = controlledResolver();
    renderAddressField({ resolver: { resolveName: r.resolveName } });
    typeValue('alice.eth');
    await elapseDebounce();
    await settle(r.deferreds[0], errResult(error));
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });

  it.each(definitive)('offers NO retry for definitive $code', async (error) => {
    const r = controlledResolver();
    renderAddressField({ resolver: { resolveName: r.resolveName } });
    typeValue('alice.eth');
    await elapseDebounce();
    await settle(r.deferreds[0], errResult(error));
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });

  it('clicking Retry re-dispatches and shows the loading indicator again', async () => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName } });
    typeValue('alice.eth');
    await elapseDebounce();
    await settle(r.deferreds[0], errResult({ code: 'RESOLUTION_TIMEOUT', elapsedMs: 5000 }));

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await flush();
    expect(r.calls).toEqual(['alice.eth', 'alice.eth']);
    expect(h.region()?.textContent).toContain('Resolving…');

    await settle(r.deferreds[1], okResult('alice.eth', HEX_ALICE));
    expect(h.rhfValue()).toBe(HEX_ALICE);
  });
});

describe('INV-91: diagnostic error fields are never rendered', () => {
  it.each([
    {
      label: 'ADAPTER_ERROR message/cause',
      error: {
        code: 'ADAPTER_ERROR',
        message: 'SECRET-DIAGNOSTIC-TRACE-XYZ',
        cause: new Error('SECRET-CAUSE-ABC'),
      } as NameResolutionError,
      leaks: ['SECRET-DIAGNOSTIC-TRACE-XYZ', 'SECRET-CAUSE-ABC'],
    },
    {
      label: 'EXTERNAL_GATEWAY_ERROR detail',
      error: {
        code: 'EXTERNAL_GATEWAY_ERROR',
        detail: 'https://gateway.internal/SECRET',
      } as NameResolutionError,
      leaks: ['https://gateway.internal/SECRET'],
    },
    {
      label: 'UNSUPPORTED_NAME reason',
      error: {
        code: 'UNSUPPORTED_NAME',
        name: 'alice.eth',
        reason: 'SECRET-REASON-999',
      } as NameResolutionError,
      leaks: ['SECRET-REASON-999'],
    },
  ])('$label never reaches the DOM', async ({ error, leaks }) => {
    const r = controlledResolver();
    renderAddressField({ resolver: { resolveName: r.resolveName } });
    typeValue('alice.eth');
    await elapseDebounce();
    await settle(r.deferreds[0], errResult(error));

    for (const leak of leaks) {
      expect(document.body.textContent).not.toContain(leak);
    }
  });
});

describe('INV-119 (field half) / INV-87: absent resolveName → UNSUPPORTED_NETWORK, zero calls, no throw', () => {
  it('provider without resolveName: a typed name surfaces the UNSUPPORTED_NETWORK message with no retry and gated submit', async () => {
    const h = renderAddressField({
      resolver: { isValidName: (name: string): boolean => name.endsWith('.eth') },
      required: false,
    });

    typeValue('alice.eth');
    await elapseDebounce();

    const alert = h.region()?.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain(nameResolutionMessageForCode('UNSUPPORTED_NETWORK'));
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull(); // definitive negative
    expect(h.rhfValue()).toBe('');
    expect(h.rhfIsValid()).toBe(false); // INV-84 gate applies on the unsupported path too
  });

  it('the unsupported surface renders without a resolveName to call — nothing throws (SC-006)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderAddressField({ resolver: {} });
    typeValue('alice.eth'); // built-in looksLikeName routes it (INV-74 fallback)
    await elapseDebounce();
    expect(document.body.textContent).toContain(
      nameResolutionMessageForCode('UNSUPPORTED_NETWORK')
    );
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('unmount mid-resolution: the late settle is dropped with no error (INV-87 lifecycle)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName } });
    typeValue('alice.eth');
    await elapseDebounce();
    expect(r.calls).toEqual(['alice.eth']);

    h.unmount();
    await settle(r.deferreds[0], okResult('alice.eth', HEX_ALICE));
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
