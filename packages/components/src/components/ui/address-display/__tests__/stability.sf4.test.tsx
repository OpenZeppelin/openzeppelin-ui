/**
 * @vitest-environment jsdom
 *
 * SF-4 · Performance, Scalability & Stability (Category 4) — INV-62, INV-63,
 * INV-64, plus the runtime arm of INV-121 (capability-free: renders with no
 * wallet/runtime/query provider). The import-boundary arm of INV-121 lives in
 * boundary.sf4.test.ts.
 * artifacts/001-ens-uikit-support/sf-4-address-display/03-invariants.md (Rev 2)
 */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ResolvedName } from '@openzeppelin/ui-types';

import { AddressDisplay } from '../address-display';
import { AddressNameProvider } from '../address-name-context';
import {
  CHECKSUM_ADDRESS,
  mismatchRecord,
  OTHER_ADDRESS,
  TRUNCATED_CHECKSUM,
  verifiedRecord,
} from './helpers';
import { TestErrorBoundary } from './test-error-boundary';

describe('INV-62: the component holds no resolution state and no cache — it re-reads the seam every render', () => {
  it('two instances of the same address under one provider render the same name from the shared source', () => {
    const resolveAddressName = vi.fn<
      (address: string, networkId?: string) => ResolvedName | undefined
    >(() => verifiedRecord());
    const { getAllByText } = render(
      <AddressNameProvider resolveAddressName={resolveAddressName}>
        <AddressDisplay address={CHECKSUM_ADDRESS} />
        <AddressDisplay address={CHECKSUM_ADDRESS} />
      </AddressNameProvider>
    );
    expect(getAllByText('alice.eth')).toHaveLength(2);
    // Each instance reads the seam; the raw prop address is the lookup key
    // (no per-instance normalization that would fragment an upstream cache).
    for (const call of resolveAddressName.mock.calls) {
      expect(call[0]).toBe(CHECKSUM_ADDRESS);
    }
  });

  it('both instances update together when the upstream value changes — no instance holds a stale copy', () => {
    const recordA = verifiedRecord({ name: 'alice.eth' });
    const recordB = verifiedRecord({ name: 'renamed.eth' });
    const { getAllByText, queryByText, rerender } = render(
      <AddressNameProvider resolveAddressName={() => recordA}>
        <AddressDisplay address={CHECKSUM_ADDRESS} />
        <AddressDisplay address={CHECKSUM_ADDRESS} />
      </AddressNameProvider>
    );
    expect(getAllByText('alice.eth')).toHaveLength(2);

    rerender(
      <AddressNameProvider resolveAddressName={() => recordB}>
        <AddressDisplay address={CHECKSUM_ADDRESS} />
        <AddressDisplay address={CHECKSUM_ADDRESS} />
      </AddressNameProvider>
    );
    expect(getAllByText('renamed.eth')).toHaveLength(2);
    expect(queryByText('alice.eth')).toBeNull();
  });
});

describe('INV-63: no enable/debounce/gating knobs — the component is a pure synchronous value sink', () => {
  it('N distinct-address rows each consult the resolver — the component adds no cap and no gate', () => {
    const addresses = Array.from({ length: 8 }, (_, i) => `0x${String(i).repeat(40)}`);
    const resolveAddressName = vi.fn<
      (address: string, networkId?: string) => ResolvedName | undefined
    >(() => undefined);
    render(
      <AddressNameProvider resolveAddressName={resolveAddressName}>
        {addresses.map((a) => (
          <AddressDisplay key={a} address={a} />
        ))}
      </AddressNameProvider>
    );
    const seen = new Set(resolveAddressName.mock.calls.map((c) => c[0]));
    for (const a of addresses) {
      expect(seen.has(a)).toBe(true);
    }
  });

  it('zero-config opt-out: no resolvedName and no provider renders plain hex with nothing resolved', () => {
    const { container } = render(<AddressDisplay address={CHECKSUM_ADDRESS} />);
    expect(container.textContent).toContain(TRUNCATED_CHECKSUM);
    expect(container.querySelector('img')).toBeNull();
  });
});

describe('INV-64: the ENS path never throws — every non-verified value degrades to hex, no error-boundary trip', () => {
  const seamValues: Array<[string, ResolvedName | undefined]> = [
    ['undefined record', undefined],
    ['forwardVerified:false record', mismatchRecord()],
    [
      'forwardVerified:false record WITH avatarUrl',
      mismatchRecord({ avatarUrl: 'https://x.test/a.png' }),
    ],
    ['verified record without avatarUrl', verifiedRecord({ avatarUrl: undefined })],
    ['verified record with avatarUrl', verifiedRecord()],
  ];

  it.each(seamValues)(
    'renders inside an error boundary without tripping it: %s',
    (_desc, record) => {
      const { queryByTestId, container } = render(
        <TestErrorBoundary>
          <AddressDisplay address={CHECKSUM_ADDRESS} resolvedName={record} />
        </TestErrorBoundary>
      );
      expect(queryByTestId('boundary-tripped')).toBeNull();
      // Something meaningful rendered: either the name or the hex.
      expect(container.textContent).toMatch(/alice\.eth|0xd8dA/);
    }
  );

  it('renders without throwing when no provider of any kind is mounted', () => {
    const { queryByTestId, container } = render(
      <TestErrorBoundary>
        <AddressDisplay address={OTHER_ADDRESS} />
      </TestErrorBoundary>
    );
    expect(queryByTestId('boundary-tripped')).toBeNull();
    expect(container.textContent).toContain('0xbbbb');
  });
});

describe('INV-121 (runtime arm): capability-free — a unit render needs no wallet/runtime/query provider', () => {
  it('renders hex and verified-name states with ONLY React mounted — no ambient providers of any kind', () => {
    // If the component (or AddressAvatar / the name context) imported any
    // runtime capability or async hook, these bare renders would throw.
    const hex = render(<AddressDisplay address={CHECKSUM_ADDRESS} />);
    expect(hex.container.textContent).toContain(TRUNCATED_CHECKSUM);

    const named = render(
      <AddressDisplay address={CHECKSUM_ADDRESS} resolvedName={verifiedRecord()} />
    );
    expect(named.container.textContent).toContain('alice.eth');
  });
});
