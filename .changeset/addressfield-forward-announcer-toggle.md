---
'@openzeppelin/ui-components': minor
---

Add `showForwardResolutionSuccessAnnouncer` to `AddressField` (default `true`).

When set to `false`, suppresses the mechanism-neutral **"Resolved to `0x…`"** success announcer while still rendering loading copy, typed error messages, and chain-scope mismatch alerts. Use when a sibling `AddressDisplay` already presents the resolved address (e.g. a rich ENS preview card below the field). Pairs with the existing `showCrossNetworkFallbackDisclaimer` prop, which only controls the amber cross-network note under the success template.
