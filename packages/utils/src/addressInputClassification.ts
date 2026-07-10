/**
 * Address-input classification (SF-3).
 *
 * A pure, framework-free, chain-neutral classifier that decides — synchronously,
 * with no I/O — what the user typed into an address field. It drives the
 * `AddressField` name-resolution branch: `'hex'` → passthrough, `'name-candidate'` →
 * resolve inline, `'empty'` / `'malformed'` → standard sync validation.
 *
 * Predicates are injected so the classifier depends on no capability, no chain,
 * and no React — the addressing capability supplies `isValidAddress`, the
 * name-resolution capability supplies `isValidName`. Both are optional so the
 * classifier stays usable on a degraded network (no capability), where a
 * conservative built-in heuristic still distinguishes "typed a name" from "typed
 * garbage" for messaging.
 *
 * @see INV-73 (total, deterministic, first-match ordered)
 * @see INV-74 (conservative `looksLikeName` — never mis-routes hex-shaped input)
 */

/**
 * Coarse classification of an address-field input, computed synchronously.
 *
 * - `'empty'`          — trimmed-empty input.
 * - `'hex'`            — a valid hex address (passthrough; behaves as the legacy field).
 * - `'name-candidate'` — a name to resolve inline (e.g. `alice.eth`).
 * - `'malformed'`      — neither a valid hex nor a name (legacy "invalid format").
 */
export type AddressInputClassification = 'empty' | 'hex' | 'name-candidate' | 'malformed';

/**
 * Injected synchronous predicates. Both optional so the classifier degrades
 * gracefully when a capability is absent.
 */
export interface AddressInputPredicates {
  /** The addressing capability's synchronous hex check (authoritative for `'hex'`). */
  readonly isValidAddress?: (value: string) => boolean;
  /**
   * The name-resolution capability's synchronous `isValidName` (authoritative for
   * `'name-candidate'` when present). When absent, the built-in {@link looksLikeName}
   * heuristic is used purely for messaging — it never drives real resolution.
   */
  readonly isValidName?: (value: string) => boolean;
}

/**
 * Conservative, built-in "does this look like a name?" heuristic — used **only**
 * as the no-capability fallback (step 4 of {@link classifyAddressInput}).
 *
 * Returns `true` only for a string that, after trimming, contains a dot, has a
 * non-empty letters-only final label, has no empty labels, and is **not**
 * hex-shaped (no `0x` prefix). Its sole purpose is to let a no-capability network
 * distinguish a typed name (→ surface `UNSUPPORTED_NETWORK`) from genuine garbage
 * (→ `'malformed'`); it must never mis-route a truncated/typo'd hex as a name.
 *
 * @see INV-74 — pinned acceptance vectors:
 *   `0xdead`→false, `0xDEADBEEF`→false, `alice.eth`→true, `alice`→false,
 *   `a.b.eth`→true, `1.2`→false, `.eth`→false.
 */
export function looksLikeName(value: string): boolean {
  const trimmed = value.trim();

  // Hex-shaped input is never a name candidate (guards `0xdead`, `0x`, any `0x…`).
  if (/^0x/i.test(trimmed)) return false;

  // Must contain at least one dot and split into non-empty labels.
  const labels = trimmed.split('.');
  if (labels.length < 2) return false;
  if (labels.some((label) => label.length === 0)) return false;

  // The final label must be letters-only (rejects numeric suffixes like `1.2`).
  const finalLabel = labels[labels.length - 1];
  return /^[a-z]+$/i.test(finalLabel);
}

/**
 * Classify a raw address-field input synchronously.
 *
 * Order of checks (first match wins — INV-73):
 *  1. trimmed-empty                    → `'empty'`
 *  2. `isValidAddress?.(value)===true` → `'hex'` (checked before names, so a value
 *                                        that is both hex-valid and name-shaped is `'hex'`)
 *  3. `isValidName` present:
 *       `isValidName(value)`           → `'name-candidate'` else `'malformed'`
 *  4. `isValidName` absent:
 *       `looksLikeName(value)`         → `'name-candidate'` else `'malformed'`
 *
 * Pure and deterministic: same inputs → same output, no I/O.
 *
 * @param value      - The raw input string.
 * @param predicates - Optional injected `isValidAddress` / `isValidName`.
 * @returns Exactly one {@link AddressInputClassification}.
 */
export function classifyAddressInput(
  value: string,
  predicates?: AddressInputPredicates
): AddressInputClassification {
  if (value.trim() === '') return 'empty';

  if (predicates?.isValidAddress?.(value) === true) return 'hex';

  if (predicates?.isValidName) {
    return predicates.isValidName(value) ? 'name-candidate' : 'malformed';
  }

  return looksLikeName(value) ? 'name-candidate' : 'malformed';
}
