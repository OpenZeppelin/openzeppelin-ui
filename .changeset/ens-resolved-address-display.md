---
'@openzeppelin/ui-components': minor
'@openzeppelin/ui-renderer': minor
---

Add reverse-ENS address display (SF-4, Rev-2/3).

`@openzeppelin/ui-components` `<AddressDisplay>` gains an optional, purely presentational `avatar?: React.ReactNode` leading slot (rendered before the label/address block, vertically centered) and now exports its `AddressDisplayProps` type. The synchronous value seam `AddressNameProvider` / `useAddressName` lets descendants read a pre-resolved `ResolvedName` without importing capabilities — progressive enhancement: the correct hex renders immediately, and the name + avatar swap in only when the supplied record is forward-verified; every other state degrades to truncated hex. Both changes are additive: when `avatar` is omitted — its default, and the value at every existing call-site — the rendered DOM and layout are byte-for-byte identical to before, in both the labeled and unlabeled branches. The component stays chain-agnostic (the slot is a `ReactNode`, not a capability).

`@openzeppelin/ui-renderer` gains `AddressNameResolutionProvider` — an async→sync bridge that owns `useResolveAddress` (SF-2) and feeds descendant `<AddressDisplay>` instances through `AddressNameProvider`. Label precedence is explicit `label` > address-book alias > forward-verified ENS name > hex. `EoaConfigDetails` always wraps the base `<AddressDisplay>` in this provider; `AliasRow` mounts it only when `enableNameResolution` is on (flag off = byte-identical, no provider). The Rev-1 `ResolvedAddressDisplay` component is retired.
