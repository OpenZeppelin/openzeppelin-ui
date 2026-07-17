/**
 * Name Resolver Context (SF-3)
 *
 * Provides a React context for forward name resolution (name → address).
 * When a `NameResolverProvider` is mounted, every `AddressField` in the
 * subtree resolves typed names inline through the injected `resolveName`
 * and submits the resolved hex — never the name (SC-004).
 *
 * The provider is deliberately **dumb** (INV-118): it memoizes the injected
 * functions into the context value and nothing else — no hook state, no
 * capability, no chain dependency. The smart runtime wiring lives upstream in
 * `@openzeppelin/ui-react` (`useRuntimeNameResolver`), which an app or the
 * renderer mounts ambiently:
 *
 * @example
 * ```tsx
 * import { NameResolverProvider } from '@openzeppelin/ui-components';
 * import { useRuntimeNameResolver } from '@openzeppelin/ui-react';
 *
 * function FormRoot() {
 *   const resolver = useRuntimeNameResolver();
 *   return (
 *     <NameResolverProvider {...resolver}>
 *       <MyForm />
 *     </NameResolverProvider>
 *   );
 * }
 * ```
 */
import * as React from 'react';

import { NameResolverContext, type NameResolverContextValue } from './context';

/**
 * Props for `NameResolverProvider`.
 *
 * Accepts the same shape as `NameResolver` so the provider can be spread
 * directly from a resolver hook: `<NameResolverProvider {...resolver}>` —
 * the same idiom as `AddressSuggestionProvider` / `AddressLabelProvider`.
 */
export interface NameResolverProviderProps extends NameResolverContextValue {
  children: React.ReactNode;
}

/**
 * Provides forward name resolution to all `AddressField` instances in the
 * subtree (zero call-site wiring, SC-001). Both functions are optional: an
 * absent `resolveName` means forward resolution is unsupported and a typed
 * name surfaces `UNSUPPORTED_NETWORK` (INV-119 / SC-006).
 *
 * ## Stable resolver identity (integrator contract)
 *
 * The injected resolver **must be referentially stable across renders** —
 * memoize it (e.g. `useMemo`) or use `useRuntimeNameResolver` from
 * `@openzeppelin/ui-react`, which is stable by construction. A resolver whose
 * function identity changes on every render (e.g. a fresh inline function) is a
 * misconfiguration: the field keys inline resolution on that identity, so a
 * churning identity would otherwise re-dispatch on every render — an unbounded
 * RPC loop on a funds path.
 *
 * The base component **detects and withstands** this (it is not merely a caveat):
 * dispatch is bounded per resolution intent so a churning resolver can never drive
 * an unbounded loop (INV-123), a one-shot development-only warning names the
 * misconfiguration (INV-124), and the field degrades to a **safe gated state**
 * (empty value, submit blocked — never a wrong address, never a throw; INV-125)
 * until the resolver is memoized. A **genuine** resolver/network swap — a single
 * identity change for a given input — is still honored and re-resolves within
 * budget (INV-119). The bound is a backstop; the contract is a stable identity.
 *
 * @param props - Injected resolver functions and children
 */
export function NameResolverProvider({
  children,
  isValidName,
  resolveName,
  activeNetworkId,
  activeNetworkName,
  resolveNetworkLabel,
}: NameResolverProviderProps): React.ReactElement {
  // INV-118: memoize-and-provide only — no hook state, no capability call.
  const value = React.useMemo<NameResolverContextValue>(
    () => ({ isValidName, resolveName, activeNetworkId, activeNetworkName, resolveNetworkLabel }),
    [isValidName, resolveName, activeNetworkId, activeNetworkName, resolveNetworkLabel]
  );

  return <NameResolverContext.Provider value={value}>{children}</NameResolverContext.Provider>;
}
