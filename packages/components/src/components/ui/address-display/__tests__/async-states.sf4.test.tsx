/**
 * @vitest-environment jsdom
 *
 * SF-4 · Async / Loading / Error / Empty (Category 5) — INV-65, INV-66.
 * artifacts/001-ens-uikit-support/sf-4-address-display/03-invariants.md (Rev 2)
 *
 * The async lives upstream; the seam carries exactly `ResolvedName |
 * undefined`. These tests assert the exhaustive mapping of that value domain
 * onto the binary render, and that NO failure chrome exists on the read path.
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { ResolvedName } from '@openzeppelin/ui-types';

import { AddressDisplay } from '../address-display';
import { CHECKSUM_ADDRESS, mismatchRecord, TRUNCATED_CHECKSUM, verifiedRecord } from './helpers';

describe('INV-65: exhaustive value-domain mapping — undefined → hex; mismatch → hex; verified → name+avatar; no retry', () => {
  it('undefined (idle/loading/no-record/error collapsed upstream) → hex with no chrome and no retry affordance', () => {
    const { container } = render(
      <AddressDisplay address={CHECKSUM_ADDRESS} showCopyButton resolvedName={undefined} />
    );
    expect(container.textContent).toContain(TRUNCATED_CHECKSUM);
    // The ONLY button is the copy affordance — no retry control exists.
    const buttons = [...container.querySelectorAll('button')];
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual(['Copy address']);
    expect(container.textContent).not.toMatch(/retry|try again/i);
  });

  it('forwardVerified:false → hex; the record’s name absent', () => {
    const { container } = render(
      <AddressDisplay address={CHECKSUM_ADDRESS} resolvedName={mismatchRecord()} />
    );
    expect(container.textContent).toContain(TRUNCATED_CHECKSUM);
    expect(container.innerHTML).not.toContain('attacker.eth');
  });

  it('forwardVerified:true → name + avatar', () => {
    const { container, getByText } = render(
      <AddressDisplay address={CHECKSUM_ADDRESS} resolvedName={verifiedRecord()} />
    );
    expect(getByText('alice.eth')).toBeTruthy();
    expect(container.querySelector('img')).not.toBeNull();
  });

  it('no value in the domain yields a blank/unmapped render — the address is always present', () => {
    const domain: Array<ResolvedName | undefined> = [
      undefined,
      mismatchRecord(),
      verifiedRecord(),
      verifiedRecord({ avatarUrl: undefined }),
    ];
    for (const record of domain) {
      const { container, unmount } = render(
        <AddressDisplay address={CHECKSUM_ADDRESS} resolvedName={record} />
      );
      expect(container.textContent?.length).toBeGreaterThan(0);
      expect(container.textContent).toContain(TRUNCATED_CHECKSUM);
      unmount();
    }
  });
});

describe('INV-66: best-effort display — a miss is communicated ONLY by hex; no error message, warning, or retry UI', () => {
  it.each([
    ['undefined record', undefined],
    ['forwardVerified:false record', mismatchRecord()],
  ] as Array<[string, ResolvedName | undefined]>)(
    'renders no alert role, no warning text, no retry control for: %s',
    (_desc, record) => {
      const { container } = render(
        <AddressDisplay address={CHECKSUM_ADDRESS} resolvedName={record} />
      );
      expect(container.querySelector('[role="alert"]')).toBeNull();
      expect(container.querySelector('[role="status"]')).toBeNull();
      expect(container.textContent).not.toMatch(/error|warn|fail|retry/i);
      expect(container.textContent).toContain(TRUNCATED_CHECKSUM);
    }
  );
});
