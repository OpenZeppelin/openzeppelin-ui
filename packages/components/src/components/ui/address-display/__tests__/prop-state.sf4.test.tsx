/**
 * @vitest-environment jsdom
 *
 * SF-4 · Prop / State Contract (Category 2) — INV-56, INV-58, INV-59,
 * INV-120, INV-122. (INV-57 deprecated — wrapper props type removed.)
 * artifacts/001-ens-uikit-support/sf-4-address-display/03-invariants.md (Rev 2)
 */
import { fireEvent, render, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import * as React from 'react';

import { AddressAvatar } from '../address-avatar';
import { AddressDisplay } from '../address-display';
import { AddressLabelProvider } from '../address-label-context';
import { AddressNameProvider } from '../address-name-context';
import { AddressNameContext } from '../context';
import { useAddressName } from '../use-address-name';
import { CHECKSUM_ADDRESS, mismatchRecord, TRUNCATED_CHECKSUM, verifiedRecord } from './helpers';

describe('INV-56: label precedence — explicit label > alias > verified name > hex', () => {
  it('(a) explicit label outranks alias and verified name', () => {
    const { container, getByText } = render(
      <AddressLabelProvider resolveLabel={() => 'Mom'}>
        <AddressDisplay
          address={CHECKSUM_ADDRESS}
          label="Treasury"
          resolvedName={verifiedRecord()}
        />
      </AddressLabelProvider>
    );
    expect(getByText('Treasury')).toBeTruthy();
    expect(container.textContent).not.toContain('Mom');
    expect(container.textContent).not.toContain('alice.eth');
  });

  it('(b) alias outranks the verified name', () => {
    const { container, getByText } = render(
      <AddressLabelProvider resolveLabel={() => 'Mom'}>
        <AddressDisplay address={CHECKSUM_ADDRESS} resolvedName={verifiedRecord()} />
      </AddressLabelProvider>
    );
    expect(getByText('Mom')).toBeTruthy();
    expect(container.textContent).not.toContain('alice.eth');
  });

  it('(c) verified name wins when no label and no alias', () => {
    const { getByText } = render(
      <AddressDisplay address={CHECKSUM_ADDRESS} resolvedName={verifiedRecord()} />
    );
    expect(getByText('alice.eth')).toBeTruthy();
  });

  it('(d) falls through to truncated hex when nothing applies', () => {
    const { container } = render(<AddressDisplay address={CHECKSUM_ADDRESS} />);
    expect(container.textContent).toContain(TRUNCATED_CHECKSUM);
  });

  it('(e) disableLabel renders FULLY RAW — suppresses the alias AND the injected name from both channels (dev-pinned 2026-07-06)', () => {
    const { container } = render(
      <AddressLabelProvider resolveLabel={() => 'Mom'}>
        <AddressNameProvider resolveAddressName={() => verifiedRecord()}>
          <AddressDisplay address={CHECKSUM_ADDRESS} disableLabel resolvedName={verifiedRecord()} />
        </AddressNameProvider>
      </AddressLabelProvider>
    );
    expect(container.textContent).toContain(TRUNCATED_CHECKSUM);
    expect(container.textContent).not.toContain('Mom');
    expect(container.textContent).not.toContain('alice.eth');
    expect(container.querySelector('img')).toBeNull();
  });
});

describe('INV-58: constructed avatar only alongside a WINNING verified name; explicit avatar prop always wins', () => {
  it('renders the record avatar when the verified name wins the precedence', () => {
    const { container } = render(
      <AddressDisplay address={CHECKSUM_ADDRESS} resolvedName={verifiedRecord()} />
    );
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'https://avatars.test/alice.png'
    );
  });

  it('builds NO avatar when an alias outranks the verified name — even though the record carries a URL', () => {
    const { container, getByText } = render(
      <AddressLabelProvider resolveLabel={() => 'Mom'}>
        <AddressDisplay address={CHECKSUM_ADDRESS} resolvedName={verifiedRecord()} />
      </AddressLabelProvider>
    );
    expect(getByText('Mom')).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
  });

  it('builds NO avatar when an explicit label outranks the verified name', () => {
    const { container } = render(
      <AddressDisplay address={CHECKSUM_ADDRESS} label="Treasury" resolvedName={verifiedRecord()} />
    );
    expect(container.querySelector('img')).toBeNull();
  });

  it('builds NO avatar (and no name) for a forwardVerified:false record with an avatarUrl', () => {
    const { container } = render(
      <AddressDisplay address={CHECKSUM_ADDRESS} resolvedName={mismatchRecord()} />
    );
    expect(container.querySelector('img')).toBeNull();
    expect(container.innerHTML).not.toContain('attacker.eth');
  });

  it('an explicit avatar prop wins over the record-constructed avatar', () => {
    const { container, getByTestId } = render(
      <AddressDisplay
        address={CHECKSUM_ADDRESS}
        avatar={<span data-testid="explicit-avatar" />}
        resolvedName={verifiedRecord()}
      />
    );
    expect(getByTestId('explicit-avatar')).toBeTruthy();
    // The record's AddressAvatar <img> must not also render.
    expect(container.querySelector('img')).toBeNull();
  });
});

describe('INV-59: AddressAvatar load-error state resets when src changes', () => {
  it('re-attempts rendering when src changes after a failure (direct)', () => {
    const { container, rerender } = render(<AddressAvatar src="https://avatars.test/dead.png" />);
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    expect(container.querySelector('img')).toBeNull();

    rerender(<AddressAvatar src="https://avatars.test/alive.png" />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'https://avatars.test/alive.png'
    );
  });

  it('a reused row shows the NEW record’s avatar after the previous URL failed (through AddressDisplay)', () => {
    const { container, rerender } = render(
      <AddressDisplay
        address={CHECKSUM_ADDRESS}
        resolvedName={verifiedRecord({ avatarUrl: 'https://avatars.test/dead.png' })}
      />
    );
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    expect(container.querySelector('img')).toBeNull();

    rerender(
      <AddressDisplay
        address={CHECKSUM_ADDRESS}
        resolvedName={verifiedRecord({ avatarUrl: 'https://avatars.test/alive.png' })}
      />
    );
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      'https://avatars.test/alive.png'
    );
  });
});

describe('INV-120: record source — resolvedName prop shadows the AddressNameContext resolver', () => {
  it('(a) the prop’s record wins over a context resolver returning a different verified record — context not consulted', () => {
    const resolveAddressName = vi.fn(() => verifiedRecord({ name: 'context.eth' }));
    const { getByText, container } = render(
      <AddressNameProvider resolveAddressName={resolveAddressName}>
        <AddressDisplay
          address={CHECKSUM_ADDRESS}
          resolvedName={verifiedRecord({ name: 'prop.eth' })}
        />
      </AddressNameProvider>
    );
    expect(getByText('prop.eth')).toBeTruthy();
    expect(container.textContent).not.toContain('context.eth');
    // `??` short-circuits: the context resolver is never invoked for the name.
    expect(resolveAddressName).not.toHaveBeenCalled();
  });

  it('(b) falls back to the context when the prop is undefined — resolver receives (address, networkId)', () => {
    const resolveAddressName = vi.fn(() => verifiedRecord({ name: 'context.eth' }));
    const { getByText } = render(
      <AddressNameProvider resolveAddressName={resolveAddressName}>
        <AddressDisplay address={CHECKSUM_ADDRESS} networkId="mainnet" />
      </AddressNameProvider>
    );
    expect(getByText('context.eth')).toBeTruthy();
    expect(resolveAddressName).toHaveBeenCalledWith(CHECKSUM_ADDRESS, 'mainnet');
  });

  it('(c) renders hex when neither prop nor provider exists', () => {
    const { container } = render(<AddressDisplay address={CHECKSUM_ADDRESS} />);
    expect(container.textContent).toContain(TRUNCATED_CHECKSUM);
  });

  it('(d) a mismatched PROP record suppresses to hex — the context is NOT consulted as a fallback', () => {
    const resolveAddressName = vi.fn(() => verifiedRecord({ name: 'context.eth' }));
    const { container } = render(
      <AddressNameProvider resolveAddressName={resolveAddressName}>
        <AddressDisplay address={CHECKSUM_ADDRESS} resolvedName={mismatchRecord()} />
      </AddressNameProvider>
    );
    expect(container.textContent).toContain(TRUNCATED_CHECKSUM);
    expect(container.textContent).not.toContain('context.eth');
    expect(container.innerHTML).not.toContain('attacker.eth');
    expect(resolveAddressName).not.toHaveBeenCalled();
  });
});

describe('INV-122: AddressNameProvider / useAddressName — synchronous, no-op-default mirror of the label channel', () => {
  it('useAddressName returns { record: undefined } with no provider mounted — never throws', () => {
    const { result } = renderHook(() => useAddressName(CHECKSUM_ADDRESS));
    expect(result.current).toEqual({ record: undefined });
  });

  it('useAddressName returns the resolver’s record synchronously on the FIRST render, forwarding (address, networkId)', () => {
    const record = verifiedRecord();
    const resolveAddressName = vi.fn(() => record);
    const wrapper = ({ children }: { children: React.ReactNode }): React.ReactElement => (
      <AddressNameProvider resolveAddressName={resolveAddressName}>{children}</AddressNameProvider>
    );
    const { result } = renderHook(() => useAddressName(CHECKSUM_ADDRESS, 'mainnet'), {
      wrapper,
    });
    expect(result.current.record).toBe(record);
    expect(resolveAddressName).toHaveBeenCalledWith(CHECKSUM_ADDRESS, 'mainnet');
  });

  it('the provider memoizes its context value — stable identity across rerenders with the same resolver', () => {
    const resolveAddressName = (): undefined => undefined;
    const seen: unknown[] = [];
    function Probe(): null {
      seen.push(React.useContext(AddressNameContext));
      return null;
    }
    const { rerender } = render(
      <AddressNameProvider resolveAddressName={resolveAddressName}>
        <Probe />
      </AddressNameProvider>
    );
    rerender(
      <AddressNameProvider resolveAddressName={resolveAddressName}>
        <Probe />
      </AddressNameProvider>
    );
    expect(seen).toHaveLength(2);
    expect(seen[0]).toBe(seen[1]);
  });
});
