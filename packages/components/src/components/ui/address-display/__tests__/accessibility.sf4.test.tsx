/**
 * @vitest-environment jsdom
 *
 * SF-4 · Accessibility (Category 6, narrow scope) — INV-67, INV-68.
 * artifacts/001-ens-uikit-support/sf-4-address-display/03-invariants.md (Rev 2)
 *
 * jest-axe is not a dependency of this package; the invariants' a11y
 * properties are asserted structurally (explicit alt, single announcement,
 * preserved aria-labels, focusability) — recorded in 05-tests.md Test Notes.
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AddressDisplay } from '../address-display';
import { AddressLabelProvider } from '../address-label-context';
import { CHECKSUM_ADDRESS, TRUNCATED_CHECKSUM, verifiedRecord } from './helpers';

describe('INV-67: the avatar <img> carries an explicit, non-redundant alt — never an unlabeled image', () => {
  it('renders the avatar with an explicit alt attribute set to "" (locked decorative convention)', () => {
    const { container } = render(
      <AddressDisplay address={CHECKSUM_ADDRESS} resolvedName={verifiedRecord()} />
    );
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    // The attribute must EXIST (hasAttribute) and be the decorative empty string.
    expect(img?.hasAttribute('alt')).toBe(true);
    expect(img?.getAttribute('alt')).toBe('');
  });

  it('announces the name exactly once — the visible label text, not duplicated by the avatar alt', () => {
    const { container, getAllByText } = render(
      <AddressDisplay address={CHECKSUM_ADDRESS} resolvedName={verifiedRecord()} />
    );
    expect(getAllByText('alice.eth')).toHaveLength(1);
    expect(container.querySelector('img')?.getAttribute('alt')).not.toContain('alice.eth');
  });
});

describe('INV-68: folding the ENS name into effectiveLabel preserves the base a11y surface — hex stays reachable', () => {
  it('keeps the copy button, explorer link, and edit pencil accessible names on the ENS-labeled render', () => {
    const { getByLabelText } = render(
      <AddressLabelProvider resolveLabel={() => undefined} onEditLabel={() => {}}>
        <AddressDisplay
          address={CHECKSUM_ADDRESS}
          showCopyButton
          explorerUrl="https://etherscan.test/address/0xd8dA"
          resolvedName={verifiedRecord()}
        />
      </AddressLabelProvider>
    );
    expect(getByLabelText('Copy address')).toBeTruthy();
    expect(getByLabelText('View in explorer')).toBeTruthy();
    // The context-bound edit pencil survives the ENS path (disableLabel not set).
    expect(getByLabelText('Edit label')).toBeTruthy();
  });

  it('keeps the raw address reachable: the labeled branch renders the mono secondary hex line', () => {
    const { container, getByText } = render(
      <AddressDisplay address={CHECKSUM_ADDRESS} showCopyButton resolvedName={verifiedRecord()} />
    );
    expect(getByText('alice.eth')).toBeTruthy();
    expect(container.textContent).toContain(TRUNCATED_CHECKSUM);
  });

  it('keeps the FULL raw address visible when untruncated — the name is an enhancement, not a substitute', () => {
    const { container } = render(
      <AddressDisplay address={CHECKSUM_ADDRESS} truncate={false} resolvedName={verifiedRecord()} />
    );
    expect(container.textContent).toContain(CHECKSUM_ADDRESS);
  });

  it('the decorative avatar is not focusable; interactive controls remain the only tab stops', () => {
    const { container, getByLabelText } = render(
      <AddressDisplay address={CHECKSUM_ADDRESS} showCopyButton resolvedName={verifiedRecord()} />
    );
    const img = container.querySelector('img');
    expect(img?.hasAttribute('tabindex')).toBe(false);
    // Copy button remains a native, focusable button.
    const copy = getByLabelText('Copy address');
    expect(copy.tagName).toBe('BUTTON');
    expect((copy as HTMLButtonElement).disabled).toBe(false);
  });
});
