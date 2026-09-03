# @openzeppelin/ui-components

## 3.9.0

### Minor Changes

- [#225](https://github.com/OpenZeppelin/openzeppelin-ui/pull/225) [`bc8c629`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/bc8c62994d6aa671493d1ba1e74c030d47b27928) Thanks [@pasevin](https://github.com/pasevin)! - Add preview-oriented layout primitives for generated-project UIs:
  - **`BottomSheet`** on the main entry — a non-modal bottom panel that keeps the page behind it interactive, with drag-resizable height and a labelled portalled region (not dialog semantics). An optional `header` prop renders content beside the close button, outside the scrolling body, for a title or status notice. An optional `layout` prop (`'overlay'` default, or `'inset'`) lets the host reserve space for the sheet: in `inset` mode the rendered height is published as `--bottom-sheet-inset` on `<html>` so viewport-height layouts can shrink instead of being covered, and stays published until the closing sheet finishes its exit transition so the host's layout does not spring back underneath it. `defaultBottomSheetHeight` accepts `{ ratio }` to seed a different share of the viewport than the 60% default.
  - **`@openzeppelin/ui-components/code-view`** — a read-only syntax-highlighted code pane with no character-size cutoff. An optional `decorateToken` callback lets you customize how individual highlighted tokens render; omit it for standard highlighting with no added decoration. An optional `reveal` prop (`startLine`, `endLine`, optional `id`) marks a 1-indexed inclusive line range in place and scrolls the first line of the range near the top of the visible area — two lines short of it, so the range does not sit flush against the edge with no sign the file continues above, while still getting essentially the whole pane. A range that fits is brought fully into view and a range taller than the pane starts near the top rather than in the middle; the gap is expressed in `lh` units, so it stays two lines of context at whatever font size the host sets. It is controlled, not imperative (no ref or handle), retriggers only when one of those three values changes (change `id` to re-reveal the same lines), treats any range that does not fit the current source as a silent no-op rather than clamping, does not itself turn on line numbers, and composes with `decorateToken` without altering the source text. An optional `showLineNumbers` prop renders a 1-indexed line-number column beside the code, off by default so an existing pane's DOM is unchanged: the numbers are CSS generated content, so they never appear in `textContent`, cannot be copied with a selection of the code, and are hidden from assistive technology; they count the same lines `reveal` addresses, so the two cannot disagree; and they are coloured through the `--code-view-line-number-color` custom property, which falls back to the kit's muted-foreground token. The column assumes the pane's own non-wrapping layout, which is the only mode it ships. Omit it for the same highlighted output as before. The subpath also exports `CODE_VIEW_LANGUAGES` and the `isCodeViewLanguage` type guard, so a host holding a language id that came from data rather than from a literal can narrow it to a grammar `CodeView` renders instead of casting and silently getting the plaintext fallback.
  - **`@openzeppelin/ui-components/file-tree`** — a file-tree pane for browsing a generated project. **`@pierre/trees` is an optional peer** — install and pin it in your app; the subpath surfaces the native resolver diagnostic if the peer is missing. This subpath is **ESM-only at runtime**: the CJS build resolves, but `@pierre/trees` publishes an `import` condition only, so `require('@openzeppelin/ui-components/file-tree')` fails under Node. Bundler consumers are unaffected. Every other entry point, including `./code-view`, honours both conditions.
  - **`AddressListField`** accepts an optional **`id`**. The field renders a control cluster, not a single element, so the id lands in two places: as `id` on the active entry control (the single-mode address input or the bulk-mode textarea — only one exists at a time), matching where every other kit field puts its `id`; and as `data-field-id` on the field's root, so the surrounding controls that carry no id of their own (Add, the entry-mode toggle, each row's remove button) still resolve to the field via `element.closest('[data-field-id]')`. A consumer reading `document.activeElement.id` therefore sees the id only while the entry control has focus — never while the field is `disabled` or at `maxItems`, since the entry control is disabled and unfocusable in both cases; resolving through `closest` covers the whole cluster in every state. Omit the prop and the rendered DOM is unchanged.

  `CodeView` memoizes its rendered output, so a host that re-renders on every pointer move (a drag-resizable container) no longer reconciles the whole file each frame. `FileTree` moves keyboard focus only when the controlled `selectedPath` changes, so an unrelated parent re-render no longer discards the row the user arrow-keyed to.

  Development-only diagnostics from `BottomSheet` and `FileTree` now go through the kit `logger` from `@openzeppelin/ui-utils` instead of `console`, so they carry the standard `[ERROR][BottomSheet]` / `[ERROR][FileTree]` prefix and honour logger configuration. Production builds still skip the checks entirely.

  `CodeView` also keys the React nodes it builds for a token run, so a `decorateToken` that returns an element (or a `reveal` mark) no longer triggers React's `Each child in a list should have a unique "key" prop` warning. Rendered output and source text are unchanged.

  All additions are additive. No existing exports changed.

## 3.8.3

### Patch Changes

- [#214](https://github.com/OpenZeppelin/openzeppelin-ui/pull/214) [`ddd681e`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/ddd681eaaeef9fc1e30645e84f1b0e471626979a) Thanks [@pasevin](https://github.com/pasevin)! - Ship the AGPL-3.0 licence text inside each published package.

  The repository has a root `LICENSE`, but npm does not walk up to the repository root
  when packing, and these packages declare narrow `files` arrays (`dist`,
  `README.md`). So every published tarball carried an AGPL-3.0 declaration in its
  `package.json` with no accompanying licence text — confirmed with
  `npm pack --dry-run`, which listed no `LICENSE` entry.

  Each published package now has its own copy, which npm includes automatically.

- Updated dependencies [[`ddd681e`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/ddd681eaaeef9fc1e30645e84f1b0e471626979a)]:
  - @openzeppelin/ui-types@3.5.2
  - @openzeppelin/ui-utils@4.0.1

## 3.8.2

### Patch Changes

- Updated dependencies [[`f7498bc`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/f7498bce0eb6952dd08c516b16147b08a28c05d8)]:
  - @openzeppelin/ui-utils@4.0.0
  - @openzeppelin/ui-types@3.5.1

## 3.8.1

### Patch Changes

- [#198](https://github.com/OpenZeppelin/openzeppelin-ui/pull/198) [`b9a7555`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/b9a7555fc3a5497c5d8194f685959032c0fad92e) Thanks [@pasevin](https://github.com/pasevin)! - fix(components): keep the AddressListField entry-mode toggle flush to the input in both single and bulk modes

  The toggle now sits as an attached tab on the input/textarea bottom-right corner (inset from the rounded corner) and no longer shifts when the resolution announcer or bulk preview text appears, nor overlaps the action button when the field is empty. Adds `announcerEndSlot` to `AddressField` and `helperEndSlot` to `TextAreaField` to pin trailing content beside the announcer/helper row, and lifts the input above the toggle so the focus ring is not covered.

## 3.8.0

### Minor Changes

- [#195](https://github.com/OpenZeppelin/openzeppelin-ui/pull/195) [`b56165d`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/b56165d7c3145faaf4b875df6d01339df544241d) Thanks [@pasevin](https://github.com/pasevin)! - Add `AddressFieldWithResolvedPreview` and `ResolvedAddressFieldPreview` — a reusable composition for ENS forward resolution in `AddressField` plus a rich reverse-resolved preview card below the field.

  `AddressFieldWithResolvedPreview` always suppresses the forward "Resolved to `0x…`" success announcer and cross-network disclaimer (overridable), collapses the empty aria-live region, and accepts an optional `preview` slot for custom reverse-resolution bridges. `ResolvedAddressFieldPreview` is the presentational preview card; pass `resolvedName` for sync display or wrap with `AddressNameProvider` / `AddressNameResolutionProvider` for async reverse lookup.

## 3.7.0

### Minor Changes

- [#193](https://github.com/OpenZeppelin/openzeppelin-ui/pull/193) [`3696502`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/36965021895ea1520e4e8c5845660ff203ee6adb) Thanks [@pasevin](https://github.com/pasevin)! - Add `AddressFieldWithResolvedPreview` and `ResolvedAddressFieldPreview` — a reusable composition for ENS forward resolution in `AddressField` plus a rich reverse-resolved preview card below the field.

  `AddressFieldWithResolvedPreview` always suppresses the forward "Resolved to `0x…`" success announcer and cross-network disclaimer (overridable), collapses the empty aria-live region, and accepts an optional `preview` slot for custom reverse-resolution bridges. `ResolvedAddressFieldPreview` is the presentational preview card; pass `resolvedName` for sync display or wrap with `AddressNameProvider` / `AddressNameResolutionProvider` for async reverse lookup.

## 3.6.0

### Minor Changes

- [#191](https://github.com/OpenZeppelin/openzeppelin-ui/pull/191) [`f656a45`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/f656a458bfbc370c61e84991fedbe662b0853c24) Thanks [@pasevin](https://github.com/pasevin)! - Add `showForwardResolutionSuccessAnnouncer` to `AddressField` (default `true`).

  When set to `false`, suppresses the mechanism-neutral **"Resolved to `0x…`"** success announcer while still rendering loading copy, typed error messages, and chain-scope mismatch alerts. Use when a sibling `AddressDisplay` already presents the resolved address (e.g. a rich ENS preview card below the field). Pairs with the existing `showCrossNetworkFallbackDisclaimer` prop, which only controls the amber cross-network note under the success template.

## 3.5.0

### Minor Changes

- [#188](https://github.com/OpenZeppelin/openzeppelin-ui/pull/188) [`b4eab15`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/b4eab1593a31035a54368ae9a845c359377613dc) Thanks [@pasevin](https://github.com/pasevin)! - Add cross-network fallback disclaimer display (initiative 003, SF-2 + SF-3).

  `@openzeppelin/ui-utils` adds pure classifiers `isCrossNetworkFallback` and `getFallbackNetworks` reading only base `ResolutionProvenance` fallback fields (Principle II — no ENS adapter imports), plus copy helpers `networkDisplayName`, `nameResolutionCrossNetworkFallbackMessage`, and `crossNetworkFallbackMessageNames` for mechanism-neutral disclaimer text.

  `@openzeppelin/ui-components` surfaces the disclaimer when the complete fallback triplet is present. **Reverse (`AddressDisplay`):** a small amber `TriangleAlert` icon inline immediately after the verified name; the locked copy appears in a tooltip on hover and keyboard focus via a focusable button whose `aria-label` is the full message. **Forward (`AddressField`):** a muted `role="note"` line under the resolved success template. Both components expose `showCrossNetworkFallbackDisclaimer?: boolean` (default `true`) to suppress presentation entirely. Classification uses SF-2 helpers only; `002` scope-gate behavior (`isChainScopeMismatch` / `scopedToNetworkId`) is unchanged — the disclaimer is additive copy, not a suppression gate. Optional `resolveNetworkLabel` threads through `AddressNameProvider`, `NameResolverProvider`, and related context types.

  `@openzeppelin/ui-renderer` forwards `resolveNetworkLabel` from `AddressNameResolutionProvider`; `TransactionForm` wires a reference resolver via `activeRuntime.networkCatalog`.

### Patch Changes

- Updated dependencies [[`b4eab15`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/b4eab1593a31035a54368ae9a845c359377613dc), [`b4eab15`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/b4eab1593a31035a54368ae9a845c359377613dc)]:
  - @openzeppelin/ui-utils@3.3.0
  - @openzeppelin/ui-types@3.3.0

## 3.4.0

### Minor Changes

- [#180](https://github.com/OpenZeppelin/openzeppelin-ui/pull/180) [`290dc8f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/290dc8f751247e3634e0ab9a6e580c2ef60a5d12) Thanks [@pasevin](https://github.com/pasevin)! - Add ENS-aware address input validation and inline resolution (SF-3, Rev-2/3).

  `@openzeppelin/ui-components` gains a headless name-resolution seam: `NameResolverProvider`, `useNameResolver`, and `useInjectedNameResolution` let `AddressField` resolve typed names inline when a forward resolver is injected — submitting the **resolved hex**, never the name, never a silently-coerced hex. The correctness spine is a shadow-state model: the React Hook Form value is the resolved hex, the typed name lives only in local display state, and `field.onChange(hex)` fires at exactly one site, only when resolution succeeds _and_ the resolved name still matches what the user typed. In every other state the value is `''`, so submit is gated by `formState.isValid` with no async validator. Pasted hex addresses pass through and validate exactly as before. Each resolution failure surfaces a distinct, per-code message in a dedicated `aria-live` region, with a retry affordance for transient errors only. The headless `useAddressSuggestionField` hook and presentational `AddressSuggestionList` component are extracted from `AddressField`'s inline dropdown logic so suggestion behavior is shared with zero regression.

  `@openzeppelin/ui-utils` gains two pure, framework-free helpers: `classifyAddressInput` (a dependency-injected, chain-neutral classifier — `empty` / `hex` / `name-candidate` / `malformed`) and `nameResolutionMessageForCode` (a per-code message mapper covering all seven resolution error codes with no generic catch-all — the single i18n seam).

  `@openzeppelin/ui-renderer` keeps the `blockchain-address` field registry mapped to the base `AddressField` (the Rev-1 `ResolvingAddressField` fork is retired). `TransactionForm` mounts `NameResolverProvider` ambiently via `useRuntimeNameResolver` from `@openzeppelin/ui-react`, so dynamic-form address fields gain inline ENS resolution with no integrator registry swap and no `WalletStateProvider` requirement at the field layer.

- [#180](https://github.com/OpenZeppelin/openzeppelin-ui/pull/180) [`290dc8f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/290dc8f751247e3634e0ab9a6e580c2ef60a5d12) Thanks [@pasevin](https://github.com/pasevin)! - Add reverse-ENS address display (SF-4, Rev-2/3).

  `@openzeppelin/ui-components` `<AddressDisplay>` gains an optional, purely presentational `avatar?: React.ReactNode` leading slot (rendered before the label/address block, vertically centered) and now exports its `AddressDisplayProps` type. The synchronous value seam `AddressNameProvider` / `useAddressName` lets descendants read a pre-resolved `ResolvedName` without importing capabilities — progressive enhancement: the correct hex renders immediately, and the name + avatar swap in only when the supplied record is forward-verified; every other state degrades to truncated hex. Both changes are additive: when `avatar` is omitted — its default, and the value at every existing call-site — the rendered DOM and layout are byte-for-byte identical to before, in both the labeled and unlabeled branches. The component stays chain-agnostic (the slot is a `ReactNode`, not a capability).

  `@openzeppelin/ui-renderer` gains `AddressNameResolutionProvider` — an async→sync bridge that owns `useResolveAddress` (SF-2) and feeds descendant `<AddressDisplay>` instances through `AddressNameProvider`. Label precedence is explicit `label` > address-book alias > forward-verified ENS name > hex. `EoaConfigDetails` always wraps the base `<AddressDisplay>` in this provider; `AliasRow` mounts it only when `enableNameResolution` is on (flag off = byte-identical, no provider). The Rev-1 `ResolvedAddressDisplay` component is retired.

### Patch Changes

- Updated dependencies [[`290dc8f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/290dc8f751247e3634e0ab9a6e580c2ef60a5d12), [`290dc8f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/290dc8f751247e3634e0ab9a6e580c2ef60a5d12)]:
  - @openzeppelin/ui-utils@3.2.0
  - @openzeppelin/ui-types@3.2.0

## 3.3.1

### Patch Changes

- [#171](https://github.com/OpenZeppelin/openzeppelin-ui/pull/171) [`0abe1fb`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/0abe1fb233d4f3ab1793fae873f79a9d4ec8a861) Thanks [@pasevin](https://github.com/pasevin)! - chore(deps): resolve Dependabot security alerts for transitive dependencies

  Update the workspace `pnpm` overrides so vulnerable transitive dependencies resolve to patched versions:
  - `protobufjs` &rarr; `^7.6.3` (was pinned to `^7.5.5`, still allowed `7.6.x` advisories)
  - `ws` &rarr; `^8.21.0` for the v8 line and `^7.5.11` for the v7 line (was `^8.20.1`)
  - `hono` &rarr; `^4.12.25`
  - `form-data` &rarr; `^4.0.6` (CRLF injection)
  - `ua-parser-js` &rarr; `^2.0.10` (ReDoS)
  - `js-yaml` (v4) &rarr; `^4.2.0` (quadratic-complexity DoS)
  - `uuid` &rarr; `^11.1.1` (missing buffer bounds check)
  - `esbuild` &rarr; `^0.28.1` (dev-server arbitrary file read)
  - `@babel/core` &rarr; `^7.29.6` (arbitrary file read via `sourceMappingURL`)

  `elliptic` (`<= 6.6.1`) has no published fix and remains; it is a low-severity advisory with no upstream patch available.

  These overrides only affect dependency resolution within this monorepo's lockfile and do not change the published packages' declared dependency ranges.

- Updated dependencies [[`0abe1fb`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/0abe1fb233d4f3ab1793fae873f79a9d4ec8a861)]:
  - @openzeppelin/ui-utils@3.1.1

## 3.3.0

### Minor Changes

- [#169](https://github.com/OpenZeppelin/openzeppelin-ui/pull/169) [`a94fc1b`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/a94fc1b29ac594fe780f74f959d487e4da8f283c) Thanks [@pasevin](https://github.com/pasevin)! - Add `Banner` `variant="neutral"` and `size="compact"` presets, and export `BannerProps`, `BannerVariant`, and `BannerSize`.

## 3.2.0

### Minor Changes

- [#167](https://github.com/OpenZeppelin/openzeppelin-ui/pull/167) [`951eb1b`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/951eb1bc44fcdc5225bcb7541e0ede4736bc7814) Thanks [@pasevin](https://github.com/pasevin)! - `AddressListField`: default to single-address entry with address-book support via `AddressField`, and add an inline toggle for bulk paste mode. Only one entry mode is active at a time.

  Adds two props:
  - `defaultEntryMode` (`'single' | 'bulk'`, default `'single'`) — chooses the view shown on mount.
  - `allowModeToggle` (`boolean`, default `true`) — set to `false` to hide the toggle and lock the field to `defaultEntryMode`.

## 3.1.0

### Minor Changes

- [#165](https://github.com/OpenZeppelin/openzeppelin-ui/pull/165) [`c3f393b`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/c3f393b8c50553fa0733060e19288211330014ae) Thanks [@pasevin](https://github.com/pasevin)! - Add `AddressListField` for bulk address paste workflows with delimiter parsing, live validation preview, and removable list rows. Export address-list parsing helpers from `@openzeppelin/ui-utils` and showcase the field in the basic-react-app examples gallery.

### Patch Changes

- Updated dependencies [[`c3f393b`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/c3f393b8c50553fa0733060e19288211330014ae)]:
  - @openzeppelin/ui-utils@3.1.0

## 3.0.1

### Patch Changes

- [#161](https://github.com/OpenZeppelin/openzeppelin-ui/pull/161) [`adb3d75`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/adb3d7543158ae4d94fe74cb9bd1e9ea4adefeaa) Thanks [@pasevin](https://github.com/pasevin)! - Add network availability policy for hosted deployments: disable mainnet networks via `mainnet_networks_disabled`, per-network blocklist via `disabledNetworkIds`, shared resolution helpers, disabled `NetworkSelector` items, and a self-host notice banner.

- Updated dependencies [[`adb3d75`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/adb3d7543158ae4d94fe74cb9bd1e9ea4adefeaa)]:
  - @openzeppelin/ui-types@3.1.1
  - @openzeppelin/ui-utils@3.0.1

## 3.0.0

### Major Changes

- [#113](https://github.com/OpenZeppelin/openzeppelin-ui/pull/113) [`6f09f66`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/6f09f66fe3e647ae234bb507795e0caa362b29aa) Thanks [@pasevin](https://github.com/pasevin)! - Migrate shared UI packages from monolithic adapter APIs to capability-based runtime APIs.

  BREAKING CHANGE: shared component props, helper types, and React context exports now use
  narrow capability interfaces and runtime-oriented names instead of `ContractAdapter` and
  `FullContractAdapter` surfaces.

### Patch Changes

- Updated dependencies [[`5fc43ce`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/5fc43cead09bff7a54951c2cd9911641158017b9), [`6f09f66`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/6f09f66fe3e647ae234bb507795e0caa362b29aa), [`f88f86b`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/f88f86bb9be61fdb42c58143164df7267671a027)]:
  - @openzeppelin/ui-types@3.0.0
  - @openzeppelin/ui-utils@3.0.0

## 2.3.1

### Patch Changes

- [#134](https://github.com/OpenZeppelin/openzeppelin-ui/pull/134) [`cf9c53b`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/cf9c53bf58b22515a6454148de03f16b429ebd59) Thanks [@pasevin](https://github.com/pasevin)! - Reset scroll position in paged `WizardLayout` (vertical and horizontal) when the active step changes, so the next step is shown from the top.

## 2.3.0

### Minor Changes

- [#129](https://github.com/OpenZeppelin/openzeppelin-ui/pull/129) [`f605c6f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/f605c6fc217ef4f0c65c5286f70a22ec7aaa725b) Thanks [@pasevin](https://github.com/pasevin)! - Add optional `truncateWhenLabeled` prop to `AddressDisplay`. When `truncate` is not set explicitly, the address truncates only when a label is present (explicit `label` or `AddressLabelContext`), so long raw addresses stay fully visible until an alias identifies the row.

## 2.2.0

### Minor Changes

- [#126](https://github.com/OpenZeppelin/openzeppelin-ui/pull/126) [`49b479a`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/49b479a4f04fed51d7708b38d4d95dd82da27b58) Thanks [@pasevin](https://github.com/pasevin)! - Add optional secondary CTA for the wizard footer: `lastStepSecondaryLabel` / `onLastStepSecondary` / `lastStepSecondaryDisabled` on paged layouts, and matching `scrollableSecondary*` props on the scrollable variant. The secondary button uses the outline style and sits to the left of the primary action.

## 2.1.0

### Minor Changes

- [#124](https://github.com/OpenZeppelin/openzeppelin-ui/pull/124) [`56e2cc8`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/56e2cc89561c062ec3821b3808d3d1abf41e31ea) Thanks [@pasevin](https://github.com/pasevin)! - Add optional wizard footer controls: custom `nextLabel` / `lastStepLabel`, `hideLastStepPrimary`, `onLastStepPrimary` (paged last step) with `onComplete` fallback, `showLastStepPrimary` on `WizardNavigation`, and scrollable layout `scrollableCompleteLabel` / `hideScrollableCompleteButton`.

## 2.0.1

### Patch Changes

- [#120](https://github.com/OpenZeppelin/openzeppelin-ui/pull/120) [`d4b53ba`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/d4b53bab26eef50276b4bac0e9d059b5aee532c0) Thanks [@pasevin](https://github.com/pasevin)! - Promote `--primary` to the OpenZeppelin brand blue

  The `--primary` token was previously set to shadcn's stock near-black
  (`oklch(0.205 0 0)` in light, `oklch(0.985 0 0)` in dark), which never matched
  the OpenZeppelin brand. This changeset promotes `--primary` to the brand blue
  that already backs `--selected`:
  - Light: `oklch(55.43% 0.238 273.87)` (aka `hsl(238, 94%, 65%)`)
  - Dark: `oklch(0.72 0.18 273.87)` — same hue, lifted lightness / reduced chroma
    for readability on dark surfaces

  As a result, every call site that was already semantically "brand action" —
  primary `Button` variants, `ExternalLink`, `Progress` bar fill, brand emphasis
  text, brand pills, icon tiles, the app-wide focus ring — now correctly renders
  in the brand blue. This is the change shadcn's `--primary` was designed to hold
  in the first place (the brand's primary action color); the stock value was
  simply never overridden.

  `--selected` / `--selected-foreground` are kept as distinct, first-class tokens
  but are now declared as CSS variable aliases of `--primary` /
  `--primary-foreground`. This preserves the semantic difference at the call site
  (`selected` communicates "this indicates user selection", `primary`
  communicates "this is the main action / brand surface") while guaranteeing the
  two palettes can never drift visually. Consumers already migrated to
  `bg-selected` / `text-selected` / etc. in prior changesets keep working with no
  code change.

  A small audit was done on every `-primary` call site in the component library
  to catch non-action surfaces that were relying on `--primary` as a cheap
  near-black:
  - `TooltipContent` previously used `bg-primary text-primary-foreground` as an
    inverted "dark pill" pattern (shadcn's convention). That semantic is
    "inverted high-contrast surface", not "brand action", so it is repointed to
    `bg-foreground text-background` and remains a near-black pill in light mode,
    near-white in dark mode, regardless of brand hue.
  - `Header`'s mobile menu toggle had `text-primary` on a decorative hamburger
    icon. That was a neutral icon color, not a brand accent, so it is repointed
    to `text-foreground`. The button's focus ring stays on `ring-primary` —
    brand-blue focus rings are a deliberate design upgrade.

  Every other `-primary` usage (primary `Button`, `Progress`, `ExternalLink`,
  demo icon tiles / hero emphasis / CTA buttons in `basic-react-app`, etc.) is
  semantically a brand-action surface and is kept as-is, now correctly rendering
  in OZ blue. No public API changes.

- [#120](https://github.com/OpenZeppelin/openzeppelin-ui/pull/120) [`d4b53ba`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/d4b53bab26eef50276b4bac0e9d059b5aee532c0) Thanks [@pasevin](https://github.com/pasevin)! - Introduce `--selected` / `--selected-foreground` semantic color tokens for UI selection state

  Adds a new pair of design tokens that express the new designer guideline: "selected" surfaces
  (current wizard step, selected cards, selected rows, selected radio options, active drop zones,
  highlighted autocomplete suggestions, etc.) should use a consistent blue across the product. The
  base value is the OpenZeppelin brand blue `hsl(238, 94%, 65%)`, stored as
  `oklch(55.43% 0.238 273.87)` for consistency with the rest of the palette; the dark-mode variant
  preserves the brand hue (`h = 273.87`) but lifts lightness to `L = 0.72` and trims chroma to
  `C = 0.18` so it stays readable on dark surfaces while remaining recognisably the brand color.
  The tokens are bridged through `@theme inline` so they are consumable from Tailwind as
  `bg-selected`, `text-selected`, `text-selected-foreground`, `border-selected/40`,
  `bg-selected/5`, `ring-selected/30`, etc.

  The following components are refactored to consume the new tokens in place of hard-coded color
  literals or mis-applied semantic tokens:
  - `WizardStepper` — replaces hard-coded `blue-*`, `zinc-*`, `red-*`, `bg-white`, `text-white`
    literals with `selected`, `border`, `muted`, `muted-foreground`, `destructive`, and `card`
    tokens, so the stepper renders correctly in dark mode for the first time.
  - `SidebarButton` — selected state now uses `bg-selected/10 text-selected` instead of the
    hard-coded `bg-neutral-100 text-[#111928]` (which was not theme-aware). Neutral states were also
    migrated from `text-gray-*` literals to `text-muted-foreground` / `text-foreground`.
  - `FileUploadField` — drag-over state and default-hover affordance on the drop zone now use
    `selected` instead of `primary`, matching the "target of a pending selection" semantics.
  - `RadioField` — selected option background, radio circle, inner dot, and focus ring now use
    `selected` instead of `primary`.
  - `AddressField` — keyboard-highlighted and hovered autocomplete suggestions now use
    `bg-selected/10` instead of `bg-accent`, matching the "this is the item you are about to pick"
    semantics of the rest of the design system.

  No public API changes. Purely visual/internal refactor on the components side; the styles package
  gains two new tokens, which is a minor bump.

- [#120](https://github.com/OpenZeppelin/openzeppelin-ui/pull/120) [`d4b53ba`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/d4b53bab26eef50276b4bac0e9d059b5aee532c0) Thanks [@pasevin](https://github.com/pasevin)! - Adopt `--selected` token in form primitives and selection surfaces

  Follow-up to the `--selected` / `--selected-foreground` token introduction. Migrates the remaining
  components whose selection/active semantics were expressed via `primary`, `accent`, or hard-coded
  Tailwind palette literals onto the new `selected` token, so every selection cue in the library
  now shares a single upstream source of truth.
  - `Checkbox`: the `data-[state=checked]` box (background, foreground, and border) switches from
    `primary` to `selected`. Focus-visible ring is left on the existing `ring` token since it is a
    focus affordance, not a selection affordance.
  - `RadioGroup` (primitive): the indicator's `text-primary` — which colors the filled `Circle` via
    `text-current` — switches to `text-selected`.
  - `Tabs`: the active `TabsTrigger`'s label color switches from `text-foreground` to
    `text-selected`, giving the raised pill a subtle selection accent while preserving the existing
    Shadcn pill design.
  - `Calendar`: the selected day, the range-middle bar, and the `day` wrapper cell's
    `[&:has([aria-selected])]` backgrounds switch from `bg-accent`/`bg-zinc-200`/`bg-zinc-700`
    literals to `bg-selected` (solid for the selected day) and `bg-selected/15` /
    `bg-selected/10` (for the range-middle fill and the aria-selected-outside-day fill). The
    `today` highlight is intentionally left on `bg-accent text-accent-foreground` because today is
    a distinct semantic from selection.
  - `DateRangePicker`: inherits all of its day styling from `Calendar`, so the migration flows
    through without any direct change.
  - `NetworkSelector`: the multi-select row's tick box previously rendered an identical
    `border border-primary` square whether checked or not (relying solely on the presence of the
    `Check` glyph as a cue). It now mirrors the updated `Checkbox` primitive:
    `border-selected bg-selected text-selected-foreground` when selected,
    `border-input bg-background` otherwise. The single-select row's trailing `Check` glyph is
    tinted `text-selected` so the selection cue is consistent across the selector.

  No public API changes; purely visual.

## 2.0.0

### Major Changes

- [#113](https://github.com/OpenZeppelin/openzeppelin-ui/pull/113) [`52f2823`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/52f2823734d1a123b607f1ce8804b0f6d57cf728) Thanks [@pasevin](https://github.com/pasevin)! - Migrate shared UI packages from monolithic adapter APIs to capability-based runtime APIs.

  BREAKING CHANGE: shared component props, helper types, and React context exports now use
  narrow capability interfaces and runtime-oriented names instead of `ContractAdapter` and
  `FullContractAdapter` surfaces.

### Patch Changes

- Updated dependencies [[`52f2823`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/52f2823734d1a123b607f1ce8804b0f6d57cf728), [`52f2823`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/52f2823734d1a123b607f1ce8804b0f6d57cf728), [`52f2823`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/52f2823734d1a123b607f1ce8804b0f6d57cf728)]:
  - @openzeppelin/ui-types@2.0.0
  - @openzeppelin/ui-utils@2.0.0

## 1.7.0

### Minor Changes

- [#96](https://github.com/OpenZeppelin/openzeppelin-ui/pull/96) [`b7f6eb5`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/b7f6eb5d8c1c0a0090f8cc22370c1c397435d71a) Thanks [@pasevin](https://github.com/pasevin)! - Add VERSION export to all public packages for runtime peer compatibility validation. Each package now exports a `VERSION` constant that reflects the package version at build time, enabling consuming libraries (such as adapters) to verify compatible versions are installed and throw actionable errors on mismatch.

### Patch Changes

- Updated dependencies [[`b7f6eb5`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/b7f6eb5d8c1c0a0090f8cc22370c1c397435d71a)]:
  - @openzeppelin/ui-types@1.12.0
  - @openzeppelin/ui-utils@1.4.0

## 1.6.0

### Minor Changes

- [#95](https://github.com/OpenZeppelin/openzeppelin-ui/pull/95) [`71a64bd`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/71a64bd439073fa814299e466d38f3ce42c05412) Thanks [@pasevin](https://github.com/pasevin)! - Add `showTooltip`, `variant`, and `untruncateOnHover` props to AddressDisplay
  - `showTooltip` shows the full address in a tooltip on hover when truncated.
  - `variant` accepts `"chip"` (default) or `"inline"` for use inside existing
    styled containers like wallet bars.
  - `untruncateOnHover` reveals the full address inline on hover (desktop) or
    tap (touch devices).
  - Fix TooltipContent to render inside a Portal, preventing layout shifts.

## 1.5.0

### Minor Changes

- [#89](https://github.com/OpenZeppelin/openzeppelin-ui/pull/89) [`120474f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/120474f4e1c262db8246d0d4ac16ad91b6649a3a) Thanks [@pasevin](https://github.com/pasevin)! - Add Wizard components (WizardStepper, WizardNavigation, WizardLayout) with vertical, horizontal, and scrollable layout variants

### Patch Changes

- [#88](https://github.com/OpenZeppelin/openzeppelin-ui/pull/88) [`bedb0f0`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/bedb0f0b7eaf93ee2d7b1a77f9c8ef39dd5edf65) Thanks [@pasevin](https://github.com/pasevin)! - SidebarButton: badge now wraps gracefully to a new line when it doesn't fit alongside the label. Fixed height replaced with min-height so the button grows naturally.

## 1.4.0

### Minor Changes

- [#76](https://github.com/OpenZeppelin/openzeppelin-ui/pull/76) [`0c32886`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/0c328867950dc15282e31ed59c9fb0e1ad886ff9) Thanks [@pasevin](https://github.com/pasevin)! - Enhance `AddressDisplay` label rendering to use a two-line stacked layout when a label is present. The label renders prominently on the first line with the address in a smaller font below, keeping the component compact while improving information hierarchy.

- [#76](https://github.com/OpenZeppelin/openzeppelin-ui/pull/76) [`0c32886`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/0c328867950dc15282e31ed59c9fb0e1ad886ff9) Thanks [@pasevin](https://github.com/pasevin)! - Add `AddressLabelContext`, `AddressLabelProvider`, and `useAddressLabel` for context-based address label resolution. Enhance `AddressDisplay` with optional `label` and `onLabelEdit` props that fall back to the context when not provided. When a provider is mounted, all `AddressDisplay` instances in the subtree automatically resolve and render labels with zero call-site changes.

- [#76](https://github.com/OpenZeppelin/openzeppelin-ui/pull/76) [`4a2ba22`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/4a2ba22b7df523c6ef7de52786ae0c1656da4746) Thanks [@pasevin](https://github.com/pasevin)! - Add `AddressSuggestionProvider`, `useAddressSuggestions`, and `AddressSuggestionContext` for context-based address autocomplete. Enhance `AddressField` with built-in suggestion dropdown that reads from context by default, with optional `suggestions` prop override and `suggestions={false}` opt-out. Includes debouncing, keyboard navigation, and ARIA listbox semantics.

- [#76](https://github.com/OpenZeppelin/openzeppelin-ui/pull/76) [`58a7136`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/58a7136dfee6f7b0a3d201a4b4c216ef08c2d7f0) Thanks [@pasevin](https://github.com/pasevin)! - Add multi-select mode to `NetworkSelector` via discriminated union props. When `multiple={true}`, the dropdown renders checkboxes, stays open on selection, and supports a `renderTrigger` prop for custom trigger elements. Existing single-select usage is unchanged.

- [#76](https://github.com/OpenZeppelin/openzeppelin-ui/pull/76) [`58a7136`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/58a7136dfee6f7b0a3d201a4b4c216ef08c2d7f0) Thanks [@pasevin](https://github.com/pasevin)! - Add `OverflowMenu` component — a reusable compact "..." dropdown for secondary actions. Accepts typed `OverflowMenuItem[]` with support for icons, destructive styling, and disabled state.

### Patch Changes

- Updated dependencies [[`c3cc7d1`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/c3cc7d1f5fa2a2c1663f0c54449f51f321d78919), [`c3cc7d1`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/c3cc7d1f5fa2a2c1663f0c54449f51f321d78919), [`c3cc7d1`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/c3cc7d1f5fa2a2c1663f0c54449f51f321d78919)]:
  - @openzeppelin/ui-types@1.11.0

## 1.3.0

### Minor Changes

- [#70](https://github.com/OpenZeppelin/openzeppelin-ui/pull/70) [`fb078c4`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fb078c4e213d903249c91bcd4918f26b6b91d3cf) Thanks [@pasevin](https://github.com/pasevin)! - Add EcosystemDropdown and EcosystemIcon components
  - `EcosystemDropdown`: reusable dropdown for ecosystem selection with icon render prop
  - `EcosystemIcon`: renders adapter-provided icon component with fallback

### Patch Changes

- Updated dependencies [[`fb781d4`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/fb781d4df95365b2ef184c893d6b39b38a2bc20e)]:
  - @openzeppelin/ui-types@1.9.0

## 1.2.1

### Patch Changes

- [#57](https://github.com/OpenZeppelin/openzeppelin-ui/pull/57) [`b62aab7`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/b62aab793843d25797717feba6b9a0630df9ebac) Thanks [@pasevin](https://github.com/pasevin)! - Add exactBytes validation for fixed-size bytes types (bytes32, bytes4, etc.) to properly validate exact byte length requirements

- Updated dependencies [[`b62aab7`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/b62aab793843d25797717feba6b9a0630df9ebac)]:
  - @openzeppelin/ui-utils@1.2.1

## 1.2.0

### Minor Changes

- [#48](https://github.com/OpenZeppelin/openzeppelin-ui/pull/48) [`0cb85e7`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/0cb85e720dbd8bbac660227d1213acad4247ff92) Thanks [@pasevin](https://github.com/pasevin)! - Added NetworkServiceErrorBanner component for displaying network service connection errors with a call-to-action to configure alternative endpoints

### Patch Changes

- Updated dependencies [[`0cb85e7`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/0cb85e720dbd8bbac660227d1213acad4247ff92), [`0cb85e7`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/0cb85e720dbd8bbac660227d1213acad4247ff92)]:
  - @openzeppelin/ui-types@1.5.0
  - @openzeppelin/ui-utils@1.2.0

## 1.1.0

### Minor Changes

- [#35](https://github.com/OpenZeppelin/openzeppelin-ui/pull/35) [`5bed777`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/5bed77773ee815c9e7efc47005a2f091f2033b23) Thanks [@pasevin](https://github.com/pasevin)! - Add `SidebarGroup` component for collapsible navigation groups in sidebars. This new component uses `@radix-ui/react-collapsible` under the hood and supports both controlled and uncontrolled modes via `open`/`defaultOpen` props.

## 1.0.4

### Patch Changes

- [#17](https://github.com/OpenZeppelin/openzeppelin-ui/pull/17) [`c6fc89e`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/c6fc89e7254f48b6f27e4b7d1f897022251c9e9d) Thanks [@pasevin](https://github.com/pasevin)! - fix(Card, Accordion): remove default shadows and improve section spacing

  Card changes:
  - Remove default `shadow-sm` from Card, matching actual usage patterns where `shadow-none` was consistently applied
  - Move vertical padding from Card container to individual sections for better flexibility:
    - CardHeader: `pt-6` (provides top padding for the card)
    - CardContent: `pt-4 pb-6` (gap from header + bottom padding)
    - CardFooter: `pt-4 pb-6` (gap from content + bottom padding)
  - This allows consumers to override Card's styling without breaking internal spacing

  Accordion changes:
  - Remove default `shadow-sm` from Accordion card variant for visual consistency

  Consumers who want a shadow can add `shadow-sm` via className. Spacing can be overridden with `pt-0`, `pb-0`, or custom padding classes.

## 1.0.3

### Patch Changes

- [#15](https://github.com/OpenZeppelin/openzeppelin-ui/pull/15) [`f5769f4`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/f5769f40b77d2ac68da9a52a84f1eb52b7ea8f9e) Thanks [@pasevin](https://github.com/pasevin)! - fix(Card): remove default shadow and add section spacing
  - Remove default `shadow-sm` from Card, matching actual usage patterns where `shadow-none` was consistently applied
  - Add default `pt-4` spacing to CardContent (space between header and content)
  - Add default `pt-4` spacing to CardFooter (space between content and footer)

  Consumers who want a shadow can add `shadow-sm` via className. Spacing can be overridden with `pt-0` or custom padding classes.

## 1.0.2

### Patch Changes

- [#12](https://github.com/OpenZeppelin/openzeppelin-ui/pull/12) [`6e2e802`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/6e2e80226bfa421d88c9b7ed1cfcbee3fc1d01b7) Thanks [@pasevin](https://github.com/pasevin)! - Fix Calendar navigation buttons floating outside container by adding `position: relative` to the root element

- Updated dependencies [[`779a5fb`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/779a5fb82ae2611fb571f8015dae7a29177c4100)]:
  - @openzeppelin/ui-types@1.1.0

## 1.0.1

### Patch Changes

- [#1](https://github.com/OpenZeppelin/openzeppelin-ui/pull/1) [`8b96075`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/8b9607524611e5cf3b1b0a968460ece8c2aa5bd1) Thanks [@pasevin](https://github.com/pasevin)! - Separate CodeEditorField into dedicated entry point to prevent CSS import issues in test environments.

  **Breaking Change for CodeEditorField users:**

  The `CodeEditorField` component is no longer exported from the main package entry point. Import it from the new dedicated entry point:

  ```typescript
  // Before
  import { CodeEditorField } from '@openzeppelin/ui-components';

  // After
  import { CodeEditorField } from '@openzeppelin/ui-components/code-editor';
  ```

  This change prevents the `@uiw/react-textarea-code-editor` CSS import from causing "Unknown file extension .css" errors in Node.js test environments.
