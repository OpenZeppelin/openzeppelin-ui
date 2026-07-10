/**
 * SF-3 · `classifyAddressInput` + `looksLikeName` — Prop/State Contract tests.
 *
 * Verifies:
 *   - INV-73 — total, deterministic, pure, first-match-ordered 4-member union.
 *   - INV-74 — conservative `looksLikeName`; never mis-routes hex-shaped input.
 *   - INV-83 (routing half) — a name candidate is the ONLY classification that
 *     drives resolution; hex/empty/malformed do not (the field keys `enabled` off
 *     this — the enablement itself is asserted in the field suite).
 *   - INV-82 (routing half) — hex/malformed/empty are the legacy-path classes.
 *
 * Pure module: no React, no capability, no I/O — predicates are injected.
 */
import { describe, expect, it, vi } from 'vitest';

import {
  classifyAddressInput,
  looksLikeName,
  type AddressInputClassification,
  type AddressInputPredicates,
} from './addressInputClassification';

/** A permissive hex predicate standing in for an addressing capability. */
const isValidAddress = (v: string): boolean => /^0x[0-9a-fA-F]{40}$/.test(v);
/** A `.eth`-suffix name predicate standing in for a resolution capability. */
const isValidName = (v: string): boolean => v.trim().toLowerCase().endsWith('.eth');

const VALID_HEX = `0x${'a'.repeat(40)}`;

describe('INV-73: classifyAddressInput is total, deterministic, pure, first-match ordered', () => {
  it('returns a member of the 4-value union for every input (totality)', () => {
    const members: readonly AddressInputClassification[] = [
      'empty',
      'hex',
      'name-candidate',
      'malformed',
    ];
    const samples = ['', '   ', VALID_HEX, 'alice.eth', 'garbage', '0xdead', '.eth', 'a.b.c.eth'];
    for (const s of samples) {
      const c = classifyAddressInput(s, { isValidAddress, isValidName });
      expect(members).toContain(c);
    }
  });

  it('is deterministic — same input yields the same output across repeated calls', () => {
    const preds: AddressInputPredicates = { isValidAddress, isValidName };
    for (const s of [VALID_HEX, 'alice.eth', 'garbage', '']) {
      const first = classifyAddressInput(s, preds);
      expect(classifyAddressInput(s, preds)).toBe(first);
      expect(classifyAddressInput(s, preds)).toBe(first);
    }
  });

  it('is pure — does not call predicates for the trimmed-empty short-circuit', () => {
    const addr = vi.fn(isValidAddress);
    const name = vi.fn(isValidName);
    expect(classifyAddressInput('   ', { isValidAddress: addr, isValidName: name })).toBe('empty');
    expect(addr).not.toHaveBeenCalled();
    expect(name).not.toHaveBeenCalled();
  });

  it('first-match order: empty > hex > name — a value that is both hex-valid AND name-shaped is hex', () => {
    // isValidAddress accepts the value AND isValidName would also accept it;
    // hex is checked first (step 2 before step 3), so the result is 'hex'.
    const bothAccept: AddressInputPredicates = {
      isValidAddress: () => true,
      isValidName: () => true,
    };
    expect(classifyAddressInput('ambiguous', bothAccept)).toBe('hex');
  });

  it('empty precedes hex — a whitespace-only string is empty even if a predicate would accept it', () => {
    expect(classifyAddressInput('   ', { isValidAddress: () => true })).toBe('empty');
  });

  it('routes each class deterministically with both predicates present (INV-82/83 routing)', () => {
    const preds = { isValidAddress, isValidName };
    expect(classifyAddressInput('', preds)).toBe('empty');
    expect(classifyAddressInput(VALID_HEX, preds)).toBe('hex');
    expect(classifyAddressInput('alice.eth', preds)).toBe('name-candidate');
    expect(classifyAddressInput('not-an-address', preds)).toBe('malformed');
  });

  it('uses injected isValidName when present (capability path), not the built-in heuristic', () => {
    // 'a.b.eth' passes looksLikeName, but an injected isValidName that rejects it wins.
    const rejectAll = { isValidAddress, isValidName: () => false };
    expect(classifyAddressInput('a.b.eth', rejectAll)).toBe('malformed');
    // And an injected isValidName that accepts a dot-free token overrides the heuristic too.
    const acceptBare = { isValidAddress, isValidName: () => true };
    expect(classifyAddressInput('vitalik', acceptBare)).toBe('name-candidate');
  });

  it('without isValidAddress, a hex-looking string is not classified hex (predicate is authoritative)', () => {
    // No addressing predicate → step 2 cannot match → falls through to the name path.
    expect(classifyAddressInput(VALID_HEX, { isValidName })).toBe('malformed');
  });
});

describe('INV-74: looksLikeName (no-capability fallback) is conservative — pinned acceptance vectors', () => {
  // The invariant's acceptance set, asserted verbatim through classifyAddressInput
  // with isValidName ABSENT (step 4 — the built-in heuristic path).
  const vectors: ReadonlyArray<readonly [string, AddressInputClassification]> = [
    ['0xdead', 'malformed'],
    ['0xDEADBEEF', 'malformed'],
    ['alice.eth', 'name-candidate'],
    ['alice', 'malformed'],
    ['a.b.eth', 'name-candidate'],
    ['1.2', 'malformed'],
    ['.eth', 'malformed'],
  ];

  it.each(vectors)('classifyAddressInput(%j) === %j (no isValidName)', (input, expected) => {
    expect(classifyAddressInput(input, { isValidAddress })).toBe(expected);
  });

  it.each(vectors)('looksLikeName(%j) matches the vector directly', (input, expected) => {
    expect(looksLikeName(input)).toBe(expected === 'name-candidate');
  });

  it('never mis-routes any 0x-prefixed value as a name (case-insensitive)', () => {
    for (const hexish of ['0x', '0X', '0xabc', '0Xdead', '0xdead.eth', '0x1234.eth']) {
      expect(looksLikeName(hexish)).toBe(false);
      expect(classifyAddressInput(hexish, { isValidAddress })).toBe('malformed');
    }
  });

  it('rejects dot-free tokens and empty-label / numeric-final-label names', () => {
    for (const notName of ['vitalik', 'localhost', 'a..b', 'a.', 'name.123', 'x.9']) {
      expect(looksLikeName(notName)).toBe(false);
    }
  });

  it('accepts multi-label names with a letters-only final label; trims surrounding whitespace', () => {
    for (const name of ['a.b.eth', 'foo.bar.baz', '  alice.eth  ']) {
      expect(looksLikeName(name)).toBe(true);
    }
  });
});
