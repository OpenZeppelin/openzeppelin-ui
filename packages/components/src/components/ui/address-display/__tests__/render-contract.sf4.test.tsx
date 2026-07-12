/**
 * @vitest-environment jsdom
 *
 * SF-4 · Render Contract (Category 1) — INV-51..INV-55.
 * artifacts/001-ens-uikit-support/sf-4-address-display/03-invariants.md (Rev 2)
 *
 * The heart of SF-4: binary render outcome, the LOCKED suppress-to-hex gate,
 * original-address authority, the LOCKED zero-injection byte-identity, and
 * avatar hide-on-error/absent behavior.
 */
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AddressDisplay } from '../address-display';
import { AddressNameProvider } from '../address-name-context';
import {
  CHECKSUM_ADDRESS,
  LOWERCASE_ECHO,
  mismatchRecord,
  plainHTML,
  stubClipboard,
  TRUNCATED_CHECKSUM,
  verifiedRecord,
} from './helpers';

describe('INV-51: binary render — verified name+avatar, or exactly the plain AddressDisplay (never a third state)', () => {
  it('renders byte-identical to plain when resolvedName is undefined (upstream idle/loading/error collapse)', () => {
    const baseline = plainHTML({ showCopyButton: true });
    const { container } = render(
      <AddressDisplay address={CHECKSUM_ADDRESS} showCopyButton resolvedName={undefined} />
    );
    expect(container.innerHTML).toBe(baseline);
    // No third visual state: no skeleton, spinner, or pending placeholder.
    expect(container.querySelector('[role="progressbar"]')).toBeNull();
    expect(container.textContent).not.toMatch(/loading|pending/i);
  });

  it('renders byte-identical to plain when a context resolver returns undefined', () => {
    const baseline = plainHTML({ showCopyButton: true });
    const { container } = render(
      <AddressNameProvider resolveAddressName={() => undefined}>
        <AddressDisplay address={CHECKSUM_ADDRESS} showCopyButton />
      </AddressNameProvider>
    );
    expect(container.innerHTML).toBe(baseline);
  });

  it('renders byte-identical to plain for a forwardVerified:false record via the prop', () => {
    const baseline = plainHTML({ showCopyButton: true });
    const { container } = render(
      <AddressDisplay address={CHECKSUM_ADDRESS} showCopyButton resolvedName={mismatchRecord()} />
    );
    expect(container.innerHTML).toBe(baseline);
  });

  it('renders byte-identical to plain for a forwardVerified:false record via the context', () => {
    const baseline = plainHTML({ showCopyButton: true });
    const { container } = render(
      <AddressNameProvider resolveAddressName={() => mismatchRecord()}>
        <AddressDisplay address={CHECKSUM_ADDRESS} showCopyButton />
      </AddressNameProvider>
    );
    expect(container.innerHTML).toBe(baseline);
  });

  it('renders the labeled branch with name + avatar only for a forwardVerified:true record', () => {
    const { container, getByText } = render(
      <AddressDisplay address={CHECKSUM_ADDRESS} resolvedName={verifiedRecord()} />
    );
    expect(getByText('alice.eth')).toBeTruthy();
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('https://avatars.test/alice.png');
    // The labeled branch still carries the truncated original hex.
    expect(container.textContent).toContain(TRUNCATED_CHECKSUM);
  });
});

describe('INV-52 (LOCKED): name eligibility SOLELY from forwardVerified === true — mismatch suppresses to hex', () => {
  it('suppresses a forward-mismatched name injected via the prop — absent from every text node and attribute', () => {
    const { container } = render(
      <AddressDisplay address={CHECKSUM_ADDRESS} resolvedName={mismatchRecord()} />
    );
    // Hex renders; the attacker name appears NOWHERE — not as text, not in
    // title/alt/aria attributes (outerHTML covers all of them).
    expect(container.textContent).toContain(TRUNCATED_CHECKSUM);
    expect(container.innerHTML).not.toContain('attacker.eth');
    // No name+warning variant either: no warning glyph or alert role.
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.textContent).not.toMatch(/[⚠!]/u);
  });

  it('suppresses a forward-mismatched name injected via the context identically', () => {
    const { container } = render(
      <AddressNameProvider resolveAddressName={() => mismatchRecord()}>
        <AddressDisplay address={CHECKSUM_ADDRESS} />
      </AddressNameProvider>
    );
    expect(container.textContent).toContain(TRUNCATED_CHECKSUM);
    expect(container.innerHTML).not.toContain('attacker.eth');
  });

  it('renders the name when forwardVerified is true (control case)', () => {
    const { getByText } = render(
      <AddressDisplay address={CHECKSUM_ADDRESS} resolvedName={verifiedRecord()} />
    );
    expect(getByText('alice.eth')).toBeTruthy();
  });
});

describe('INV-53: displayed and copied address is the caller’s original prop — never the record’s lowercased echo', () => {
  it('displays the checksummed truncation, and the lowercased echo appears nowhere in the DOM', () => {
    const { container } = render(
      <AddressDisplay address={CHECKSUM_ADDRESS} resolvedName={verifiedRecord()} />
    );
    expect(container.textContent).toContain(TRUNCATED_CHECKSUM);
    // The lowercased echo differs in case ('0xd8da...') — neither its
    // truncated nor its full form may leak into the render.
    expect(container.innerHTML).not.toContain('0xd8da...6045');
    expect(container.innerHTML).not.toContain(LOWERCASE_ECHO);
  });

  it('shows the FULL original checksummed address when untruncated, even with a verified name', () => {
    const { container } = render(
      <AddressDisplay address={CHECKSUM_ADDRESS} truncate={false} resolvedName={verifiedRecord()} />
    );
    expect(container.textContent).toContain(CHECKSUM_ADDRESS);
    expect(container.textContent).not.toContain(LOWERCASE_ECHO);
  });

  it('copies the original checksummed address, character-for-character', () => {
    const writeText = stubClipboard();
    const { getByLabelText } = render(
      <AddressDisplay address={CHECKSUM_ADDRESS} showCopyButton resolvedName={verifiedRecord()} />
    );
    fireEvent.click(getByLabelText('Copy address'));
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(CHECKSUM_ADDRESS);
  });
});

describe('INV-54 (LOCKED): zero-injection byte-identical — a mounted provider returning undefined is inert', () => {
  // The pre-existing address-display.test.tsx suite (11 tests, untouched) is
  // the primary regression net for the no-prop/no-provider state; these tests
  // add the mounted-but-undefined-returning-provider equivalence the
  // invariants doc pins.
  it('unlabeled branch: provider returning undefined renders byte-identical to no provider', () => {
    const baseline = plainHTML({ showCopyButton: true, showTooltip: true });
    const { container } = render(
      <AddressNameProvider resolveAddressName={() => undefined}>
        <AddressDisplay address={CHECKSUM_ADDRESS} showCopyButton showTooltip />
      </AddressNameProvider>
    );
    expect(container.innerHTML).toBe(baseline);
  });

  it('labeled branch: provider returning undefined renders byte-identical to no provider', () => {
    const baseline = plainHTML({ label: 'Alice', showCopyButton: true });
    const { container } = render(
      <AddressNameProvider resolveAddressName={() => undefined}>
        <AddressDisplay address={CHECKSUM_ADDRESS} label="Alice" showCopyButton />
      </AddressNameProvider>
    );
    expect(container.innerHTML).toBe(baseline);
  });
});

describe('INV-55: AddressAvatar hides on load error and on absent URL — never a broken image, never a placeholder box', () => {
  it('removes the <img> when the image errors; the name still renders', () => {
    const { container, getByText } = render(
      <AddressDisplay address={CHECKSUM_ADDRESS} resolvedName={verifiedRecord()} />
    );
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    fireEvent.error(img as HTMLImageElement);
    expect(container.querySelector('img')).toBeNull();
    expect(getByText('alice.eth')).toBeTruthy();
  });

  it('leaves no fixed-size empty box after the image errors', () => {
    const { container } = render(
      <AddressDisplay address={CHECKSUM_ADDRESS} resolvedName={verifiedRecord()} />
    );
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    // The avatar's own h-4/w-4 sizing must be gone with it.
    expect(container.querySelector('.h-4.w-4')).toBeNull();
  });

  it('builds no <img> and no leading slot at all when the verified record has no avatarUrl', () => {
    const { container, getByText } = render(
      <AddressDisplay
        address={CHECKSUM_ADDRESS}
        resolvedName={verifiedRecord({ avatarUrl: undefined })}
      />
    );
    // A bare verified name is a first-class, complete render.
    expect(getByText('alice.eth')).toBeTruthy();
    expect(container.querySelector('img')).toBeNull();
    // No slot element: the labeled branch keeps its original flex-col shape.
    expect(container.querySelector('span.mr-1\\.5')).toBeNull();
    expect(container.firstElementChild?.className).toContain('flex-col');
  });
});
