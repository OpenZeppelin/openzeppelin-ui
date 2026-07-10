/**
 * Name-resolution error messages (SF-3).
 *
 * A pure, per-code mapper from the SF-1 {@link NameResolutionError} taxonomy to a
 * distinct, actionable, user-facing string. This is the single i18n seam for
 * resolution errors (plain English today; no i18n infrastructure exists in the UI
 * packages). Callers render this string only — never the raw diagnostic fields
 * (`error.message` / `.detail` / `.reason` / `.cause`), which SF-1 marks log-only.
 *
 * The import is **types-only** (`import type`), so the existing `ui-utils → ui-types`
 * dependency edge stays erasable and acyclic — no runtime value crosses it.
 *
 * @see INV-88 (all 7 codes → distinct messages; no generic fallback collapses the taxonomy)
 * @see INV-91 (no diagnostic field is rendered — only the code-derived message)
 * @see INV-78 (`networkName` interpolation, sourced by the caller from the resolving runtime)
 * @see INV-77 (types-only `ui-utils → ui-types` edge)
 */
import type { NameResolutionError } from '@openzeppelin/ui-types';

/** Optional interpolation context for messages that name the active network. */
export interface NameResolutionMessageContext {
  /**
   * Human-readable active-network name, interpolated into `UNSUPPORTED_NETWORK` /
   * `UNSUPPORTED_NAME`. Sourced by the caller from the resolving runtime
   * (`useWalletState().activeNetworkConfig?.name`), falling back to the error's
   * own `networkId`. When absent, the message names "this network" generically.
   */
  readonly networkName?: string;
}

/** The closed set of codes this mapper covers (all 7 from SF-1's union). */
export type NameResolutionErrorCode = NameResolutionError['code'];

/**
 * Compile-time exhaustiveness guard. If a code is added to SF-1's union, the
 * `switch` below stops being exhaustive and this call fails to type-check —
 * forcing a new, distinct message rather than a silent collapse (INV-88). It is
 * unreachable at runtime for any valid code.
 */
function assertNever(code: never): never {
  throw new Error(`unhandled name-resolution error code: ${String(code)}`);
}

/**
 * Map a {@link NameResolutionErrorCode} to a distinct, actionable, user-facing
 * message. Every one of SF-1's 7 codes has its own message — there is no
 * catch-all that merges codes (INV-88).
 *
 * @param code - The error `code` from a {@link NameResolutionError}.
 * @param ctx  - Optional context; `ctx.networkName` names the network in
 *   `UNSUPPORTED_NETWORK` / `UNSUPPORTED_NAME`.
 * @returns The display string. Callers must not render raw diagnostic fields.
 */
export function nameResolutionMessageForCode(
  code: NameResolutionErrorCode,
  ctx?: NameResolutionMessageContext
): string {
  const on = ctx?.networkName ? ` on ${ctx.networkName}` : ' on this network';

  switch (code) {
    case 'NAME_NOT_FOUND':
      return 'No address is registered for this name.';
    case 'ADDRESS_NOT_FOUND':
      // Reverse-only code — unreachable on the forward input path, mapped for completeness.
      return 'No name is registered for this address.';
    case 'UNSUPPORTED_NETWORK':
      return `Name resolution is not supported${on}.`;
    case 'UNSUPPORTED_NAME':
      return `This is not a valid name${on}.`;
    case 'RESOLUTION_TIMEOUT':
      return 'Name resolution timed out. Try again.';
    case 'EXTERNAL_GATEWAY_ERROR':
      // INV-132: distinct from NAME_NOT_FOUND / ADAPTER_ERROR; no mechanism words.
      return 'Could not reach the name resolution service. Try again.';
    case 'ADAPTER_ERROR':
      return 'Could not resolve this name. Try again.';
    default:
      return assertNever(code);
  }
}
