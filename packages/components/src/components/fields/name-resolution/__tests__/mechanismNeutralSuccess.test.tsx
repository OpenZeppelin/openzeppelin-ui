/**
 * @vitest-environment jsdom
 *
 * SF-6 · Mechanism-neutral success display — INV-126 / INV-127 / INV-128 / INV-140.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ResolvedAddress } from '@openzeppelin/ui-types';

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

/** Success announcer outer HTML for byte-identity comparison (INV-128). */
function successAnnouncerHtml(region: HTMLElement | null): string {
  const span = region?.querySelector('span.text-sm');
  return span?.outerHTML ?? '';
}

const PROVENANCE_FIXTURES: {
  label: string;
  provenance: Partial<ResolvedAddress['provenance']>;
}[] = [
  { label: 'direct L1', provenance: { label: 'ENS', external: false } },
  {
    label: 'CCIP-Read external',
    provenance: { label: 'ENS via external gateway', external: true },
  },
  {
    label: 'coinType on active network',
    provenance: {
      label: 'ENS',
      external: false,
      scopedToNetworkId: 'eip155:1',
    },
  },
];

describe('INV-128: successful-resolution display is byte-identical across adapter mechanisms', () => {
  it.each(PROVENANCE_FIXTURES)(
    'fixture "$label" renders the frozen success template without provenance chrome',
    async ({ provenance }) => {
      const r = controlledResolver();
      const h = renderAddressField({
        resolver: {
          resolveName: r.resolveName,
          activeNetworkId: 'eip155:1',
        },
      });

      typeValue('alice.eth');
      await elapseDebounce();
      await settle(r.deferreds[0], okResult('alice.eth', HEX_ALICE, provenance));

      const region = h.region();
      expect(successAnnouncerHtml(region)).toBe(
        `<span class="text-sm">Resolved to <code class="font-mono">${HEX_ALICE}</code></span>`
      );
      expect(region?.textContent).not.toContain('ENS via external gateway');
      expect(region?.querySelector('img')).toBeNull();
      expect(region?.querySelector('svg')).toBeNull();
    }
  );

  it('byte-identical announcer HTML across v1, CCIP, and coinType fixtures when address matches', async () => {
    const htmlByFixture: string[] = [];

    for (const { provenance } of PROVENANCE_FIXTURES) {
      const r = controlledResolver();
      const h = renderAddressField({
        resolver: {
          resolveName: r.resolveName,
          activeNetworkId: 'eip155:1',
        },
      });

      typeValue('alice.eth');
      await elapseDebounce();
      await settle(r.deferreds[0], okResult('alice.eth', HEX_ALICE, provenance));
      htmlByFixture.push(successAnnouncerHtml(h.region()));
      h.unmount();
    }

    expect(new Set(htmlByFixture).size).toBe(1);
  });
});

describe('INV-126 / INV-127: success path never renders provenance.label or branches on external', () => {
  it('omits adapter label suffix even when external:true and label names a gateway', async () => {
    const r = controlledResolver();
    const h = renderAddressField({ resolver: { resolveName: r.resolveName } });

    typeValue('alice.eth');
    await elapseDebounce();
    await settle(
      r.deferreds[0],
      okResult('alice.eth', HEX_ALICE, {
        label: 'ENS via external gateway',
        external: true,
      })
    );

    const region = h.region();
    expect(region?.textContent).toContain('Resolved to');
    expect(region?.textContent).not.toContain('gateway');
    expect(region?.textContent).not.toContain('ENS via external gateway');
  });
});

describe('INV-140: scopedToNetworkId is not shown on the success path when scope matches', () => {
  it('matching scoped id writes hex but never surfaces the id in success copy', async () => {
    const r = controlledResolver();
    const h = renderAddressField({
      resolver: {
        resolveName: r.resolveName,
        activeNetworkId: 'eip155:8453',
      },
    });

    typeValue('alice.eth');
    await elapseDebounce();
    await settle(
      r.deferreds[0],
      okResult('alice.eth', HEX_ALICE, {
        label: 'ENS',
        external: true,
        scopedToNetworkId: 'eip155:8453',
      })
    );

    expect(h.region()?.textContent).toContain('Resolved to');
    expect(h.region()?.textContent).not.toContain('eip155:8453');
    expect(h.rhfValue()).toBe(HEX_ALICE);
  });
});
