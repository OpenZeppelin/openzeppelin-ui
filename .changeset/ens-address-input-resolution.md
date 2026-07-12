---
"@openzeppelin/ui-utils": minor
"@openzeppelin/ui-components": minor
"@openzeppelin/ui-renderer": minor
---

Add ENS-aware address input validation and inline resolution (SF-3, Rev-2/3).

`@openzeppelin/ui-components` gains a headless name-resolution seam: `NameResolverProvider`, `useNameResolver`, and `useInjectedNameResolution` let `AddressField` resolve typed names inline when a forward resolver is injected — submitting the **resolved hex**, never the name, never a silently-coerced hex. The correctness spine is a shadow-state model: the React Hook Form value is the resolved hex, the typed name lives only in local display state, and `field.onChange(hex)` fires at exactly one site, only when resolution succeeds *and* the resolved name still matches what the user typed. In every other state the value is `''`, so submit is gated by `formState.isValid` with no async validator. Pasted hex addresses pass through and validate exactly as before. Each resolution failure surfaces a distinct, per-code message in a dedicated `aria-live` region, with a retry affordance for transient errors only. The headless `useAddressSuggestionField` hook and presentational `AddressSuggestionList` component are extracted from `AddressField`'s inline dropdown logic so suggestion behavior is shared with zero regression.

`@openzeppelin/ui-utils` gains two pure, framework-free helpers: `classifyAddressInput` (a dependency-injected, chain-neutral classifier — `empty` / `hex` / `name-candidate` / `malformed`) and `nameResolutionMessageForCode` (a per-code message mapper covering all seven resolution error codes with no generic catch-all — the single i18n seam).

`@openzeppelin/ui-renderer` keeps the `blockchain-address` field registry mapped to the base `AddressField` (the Rev-1 `ResolvingAddressField` fork is retired). `TransactionForm` mounts `NameResolverProvider` ambiently via `useRuntimeNameResolver` from `@openzeppelin/ui-react`, so dynamic-form address fields gain inline ENS resolution with no integrator registry swap and no `WalletStateProvider` requirement at the field layer.
