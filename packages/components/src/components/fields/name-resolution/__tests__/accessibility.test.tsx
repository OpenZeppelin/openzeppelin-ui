/**
 * @vitest-environment jsdom
 *
 * SF-3 Rev-2 · Accessibility of the resolution chrome (INV-92 / INV-93).
 *
 * The dedicated announcer must be a real `aria-live="polite"` region distinct
 * from the RHF error region, additively joined into `aria-describedby`, and it
 * must never steal focus across any resolution transition.
 */
import { fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('INV-92: dedicated aria-live announcer, distinct from the RHF error region', () => {
  it('renders a polite live region with the dedicated id whenever a resolver is present', async () => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName } });
    const region = h.region();
    expect(region).not.toBeNull();
    expect(region?.getAttribute('aria-live')).toBe('polite');
    expect(region?.id).toBe('recipient-resolution');
  });

  it('is a different node from the RHF error region and leaves it functional', async () => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName }, required: true });

    // produce a REAL sync validation error (malformed input + touched)
    typeValue('not-an-address-but-touched');
    fireEvent.blur(h.input());
    await flush();

    const errorRegion = document.getElementById('recipient-error');
    expect(errorRegion).not.toBeNull();
    expect(errorRegion).not.toBe(h.region());
    expect(errorRegion?.textContent).toContain('Invalid address format for the selected chain');
    expect(h.region()?.textContent).toBe(''); // malformed → no resolution chrome
  });

  it('additively joins the announcer into aria-describedby without dropping description/error ids', async () => {
    const r = controlledResolver();
    const h = renderAddressField({
      resolver: { resolveName: r.resolveName },
      helperText: 'Recipient address or ENS name',
    });
    const describedBy = h.input().getAttribute('aria-describedby') ?? '';
    expect(describedBy.split(/\s+/)).toContain('recipient-description');
    expect(describedBy.split(/\s+/)).toContain('recipient-resolution');
  });

  it('announces the resolved outcome by updating the live region text', async () => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName } });
    typeValue('alice.eth');
    await elapseDebounce();
    expect(h.region()?.textContent).toContain('Resolving…');
    await settle(r.deferreds[0], okResult('alice.eth', HEX_ALICE));
    expect(h.region()?.textContent).toContain(HEX_ALICE);
  });

  it('conveys the error outcome with role="alert" inside the region', async () => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName } });
    typeValue('alice.eth');
    await elapseDebounce();
    await settle(r.deferreds[0], errResult({ code: 'NAME_NOT_FOUND', name: 'alice.eth' }));
    expect(h.region()?.querySelector('[role="alert"]')).not.toBeNull();
  });
});

describe('INV-93: the announcer never steals focus mid-typing', () => {
  it('focus stays in the input across debouncing → loading → resolved', async () => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName } });
    h.input().focus();
    expect(document.activeElement).toBe(h.input());

    typeValue('alice.eth'); // debouncing
    expect(document.activeElement).toBe(h.input());
    await elapseDebounce(); // loading
    expect(document.activeElement).toBe(h.input());
    await settle(r.deferreds[0], okResult('alice.eth', HEX_ALICE)); // resolved
    expect(document.activeElement).toBe(h.input());
  });

  it('focus stays in the input through an error transition (with its role="alert" render)', async () => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName } });
    h.input().focus();
    typeValue('alice.eth');
    await elapseDebounce();
    await settle(r.deferreds[0], errResult({ code: 'RESOLUTION_TIMEOUT', elapsedMs: 5000 }));
    expect(document.activeElement).toBe(h.input());
  });
});
