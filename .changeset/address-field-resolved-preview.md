---
'@openzeppelin/ui-components': minor
---

Add `AddressFieldWithResolvedPreview` and `ResolvedAddressFieldPreview` — a reusable composition for ENS forward resolution in `AddressField` plus a rich reverse-resolved preview card below the field.

`AddressFieldWithResolvedPreview` always suppresses the forward "Resolved to `0x…`" success announcer and cross-network disclaimer (overridable), collapses the empty aria-live region, and accepts an optional `preview` slot for custom reverse-resolution bridges. `ResolvedAddressFieldPreview` is the presentational preview card; pass `resolvedName` for sync display or wrap with `AddressNameProvider` / `AddressNameResolutionProvider` for async reverse lookup.
