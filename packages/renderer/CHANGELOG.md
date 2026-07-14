# @openzeppelin/ui-renderer

## 3.2.0

### Minor Changes

- [#185](https://github.com/OpenZeppelin/openzeppelin-ui/pull/185) [`564235a`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/564235ae4408b046ed581b8d5bd0a59af9661dc0) Thanks [@pasevin](https://github.com/pasevin)! - Reverse-resolution display gate in `AddressNameResolutionProvider` now keys on the chain-agnostic base `ResolutionProvenance.scopedToNetworkId` (absent = global/mainnet identity, shows on any network-bound row; present and not equal to the row network = network-local, withheld), replacing the prior wallet-active-network vs row-network suppression. Display-only; no public API change. Complements openzeppelin-adapters 002, which emits `scopedToNetworkId`.

## 3.1.0

### Minor Changes

- [#180](https://github.com/OpenZeppelin/openzeppelin-ui/pull/180) [`290dc8f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/290dc8f751247e3634e0ab9a6e580c2ef60a5d12) Thanks [@pasevin](https://github.com/pasevin)! - Add ENS-aware address input validation and inline resolution (SF-3, Rev-2/3).

  `@openzeppelin/ui-components` gains a headless name-resolution seam: `NameResolverProvider`, `useNameResolver`, and `useInjectedNameResolution` let `AddressField` resolve typed names inline when a forward resolver is injected — submitting the **resolved hex**, never the name, never a silently-coerced hex. The correctness spine is a shadow-state model: the React Hook Form value is the resolved hex, the typed name lives only in local display state, and `field.onChange(hex)` fires at exactly one site, only when resolution succeeds _and_ the resolved name still matches what the user typed. In every other state the value is `''`, so submit is gated by `formState.isValid` with no async validator. Pasted hex addresses pass through and validate exactly as before. Each resolution failure surfaces a distinct, per-code message in a dedicated `aria-live` region, with a retry affordance for transient errors only. The headless `useAddressSuggestionField` hook and presentational `AddressSuggestionList` component are extracted from `AddressField`'s inline dropdown logic so suggestion behavior is shared with zero regression.

  `@openzeppelin/ui-utils` gains two pure, framework-free helpers: `classifyAddressInput` (a dependency-injected, chain-neutral classifier — `empty` / `hex` / `name-candidate` / `malformed`) and `nameResolutionMessageForCode` (a per-code message mapper covering all seven resolution error codes with no generic catch-all — the single i18n seam).

  `@openzeppelin/ui-renderer` keeps the `blockchain-address` field registry mapped to the base `AddressField` (the Rev-1 `ResolvingAddressField` fork is retired). `TransactionForm` mounts `NameResolverProvider` ambiently via `useRuntimeNameResolver` from `@openzeppelin/ui-react`, so dynamic-form address fields gain inline ENS resolution with no integrator registry swap and no `WalletStateProvider` requirement at the field layer.

- [#180](https://github.com/OpenZeppelin/openzeppelin-ui/pull/180) [`290dc8f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/290dc8f751247e3634e0ab9a6e580c2ef60a5d12) Thanks [@pasevin](https://github.com/pasevin)! - Add opt-in ENS name resolution to the AddressBookWidget. A new optional `enableNameResolution` flag (default `false`) gates both the Add-alias dialog's ENS-aware address field (auto-suggest alias from the resolved name) and per-row reverse-ENS display. When the flag is off, neither the dialog seam nor any row reverse-resolution provider mounts — no resolution calls and no `WalletStateProvider` required (backward-compatible default). When the flag is on without a wallet provider, resolution degrades gracefully (unsupported-network / hex fallback) rather than throwing. Existing manual-alias flows, search, and export/import (no auto re-resolution on import) are unchanged.

- [#180](https://github.com/OpenZeppelin/openzeppelin-ui/pull/180) [`290dc8f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/290dc8f751247e3634e0ab9a6e580c2ef60a5d12) Thanks [@pasevin](https://github.com/pasevin)! - Add reverse-ENS address display (SF-4, Rev-2/3).

  `@openzeppelin/ui-components` `<AddressDisplay>` gains an optional, purely presentational `avatar?: React.ReactNode` leading slot (rendered before the label/address block, vertically centered) and now exports its `AddressDisplayProps` type. The synchronous value seam `AddressNameProvider` / `useAddressName` lets descendants read a pre-resolved `ResolvedName` without importing capabilities — progressive enhancement: the correct hex renders immediately, and the name + avatar swap in only when the supplied record is forward-verified; every other state degrades to truncated hex. Both changes are additive: when `avatar` is omitted — its default, and the value at every existing call-site — the rendered DOM and layout are byte-for-byte identical to before, in both the labeled and unlabeled branches. The component stays chain-agnostic (the slot is a `ReactNode`, not a capability).

  `@openzeppelin/ui-renderer` gains `AddressNameResolutionProvider` — an async→sync bridge that owns `useResolveAddress` (SF-2) and feeds descendant `<AddressDisplay>` instances through `AddressNameProvider`. Label precedence is explicit `label` > address-book alias > forward-verified ENS name > hex. `EoaConfigDetails` always wraps the base `<AddressDisplay>` in this provider; `AliasRow` mounts it only when `enableNameResolution` is on (flag off = byte-identical, no provider). The Rev-1 `ResolvedAddressDisplay` component is retired.

### Patch Changes

- Updated dependencies [[`290dc8f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/290dc8f751247e3634e0ab9a6e580c2ef60a5d12), [`290dc8f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/290dc8f751247e3634e0ab9a6e580c2ef60a5d12), [`290dc8f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/290dc8f751247e3634e0ab9a6e580c2ef60a5d12), [`290dc8f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/290dc8f751247e3634e0ab9a6e580c2ef60a5d12)]:
  - @openzeppelin/ui-utils@3.2.0
  - @openzeppelin/ui-components@3.4.0
  - @openzeppelin/ui-types@3.2.0
  - @openzeppelin/ui-react@3.1.0

## 3.0.1

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
  - @openzeppelin/ui-components@3.3.1
  - @openzeppelin/ui-react@3.0.1
  - @openzeppelin/ui-utils@3.1.1

## 3.0.0

### Major Changes

- [#113](https://github.com/OpenZeppelin/openzeppelin-ui/pull/113) [`6f09f66`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/6f09f66fe3e647ae234bb507795e0caa362b29aa) Thanks [@pasevin](https://github.com/pasevin)! - Migrate shared UI packages from monolithic adapter APIs to capability-based runtime APIs.

  BREAKING CHANGE: shared component props, helper types, and React context exports now use
  narrow capability interfaces and runtime-oriented names instead of `ContractAdapter` and
  `FullContractAdapter` surfaces.

### Patch Changes

- Updated dependencies [[`5fc43ce`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/5fc43cead09bff7a54951c2cd9911641158017b9), [`6f09f66`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/6f09f66fe3e647ae234bb507795e0caa362b29aa), [`f88f86b`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/f88f86bb9be61fdb42c58143164df7267671a027)]:
  - @openzeppelin/ui-types@3.0.0
  - @openzeppelin/ui-components@3.0.0
  - @openzeppelin/ui-react@3.0.0
  - @openzeppelin/ui-utils@3.0.0

## 2.0.1

### Patch Changes

- [#132](https://github.com/OpenZeppelin/openzeppelin-ui/pull/132) [`536d982`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/536d9827002b21336fa51de161e55d7503bcac12) Thanks [@pasevin](https://github.com/pasevin)! - fix(renderer): resolve initial addressing in `AddAliasDialog` for the preselected network

  `AddAliasDialog` previously seeded `activeAddressing` from the explicit
  `addressing` prop only. When opened with a preselected network (via
  `currentNetworkId` + `resolveNetwork`) and a `resolveAddressing` resolver, the
  network-specific `AddressingCapability` was never applied until the user
  manually changed the network selector. As a result, `AddressField` had no
  network validator on first render and silently treated any non-empty input as
  valid (e.g., accepting `"adad"` as a valid Stellar Testnet address).

  The open-effect now also calls `resolveAddressing(initialNetwork)` and
  `resolveAddressPlaceholder(initialNetwork)` when the matching resolvers are
  provided, then re-triggers validation on the address field once the validator
  is in place. Behavior with no `initialNetwork`, no resolvers, or an explicit
  `addressing` default is preserved.

## 2.0.0

### Major Changes

- [#113](https://github.com/OpenZeppelin/openzeppelin-ui/pull/113) [`52f2823`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/52f2823734d1a123b607f1ce8804b0f6d57cf728) Thanks [@pasevin](https://github.com/pasevin)! - Migrate shared UI packages from monolithic adapter APIs to capability-based runtime APIs.

  BREAKING CHANGE: shared component props, helper types, and React context exports now use
  narrow capability interfaces and runtime-oriented names instead of `ContractAdapter` and
  `FullContractAdapter` surfaces.

### Patch Changes

- Updated dependencies [[`52f2823`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/52f2823734d1a123b607f1ce8804b0f6d57cf728), [`52f2823`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/52f2823734d1a123b607f1ce8804b0f6d57cf728), [`52f2823`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/52f2823734d1a123b607f1ce8804b0f6d57cf728)]:
  - @openzeppelin/ui-types@2.0.0
  - @openzeppelin/ui-components@2.0.0
  - @openzeppelin/ui-react@2.0.0
  - @openzeppelin/ui-utils@2.0.0

## 1.2.0

### Minor Changes

- [#100](https://github.com/OpenZeppelin/openzeppelin-ui/pull/100) [`4ef354a`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/4ef354a1c7da7c31e9ff0e18e617904c5029dc4c) Thanks [@pasevin](https://github.com/pasevin)! - Add optional `onTransactionSuccess` callback to `TransactionForm` so host apps can run side effects (for example analytics) when a transaction completes successfully. The callback receives `network_id`, `ecosystem`, `execution_method`, and optionally `transaction_hash` when the adapter provides one.

### Patch Changes

- Updated dependencies [[`4ef354a`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/4ef354a1c7da7c31e9ff0e18e617904c5029dc4c)]:
  - @openzeppelin/ui-types@1.13.0

## 1.1.1

### Patch Changes

- [#78](https://github.com/OpenZeppelin/openzeppelin-ui/pull/78) [`8c646a8`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/8c646a8859ffa8d37cb59499fb5695abd6cb2cb2) Thanks [@pasevin](https://github.com/pasevin)! - Add optional `title` prop to AddressBookWidget for customizable card header

- Updated dependencies [[`8c646a8`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/8c646a8859ffa8d37cb59499fb5695abd6cb2cb2)]:
  - @openzeppelin/ui-types@1.11.1

## 1.1.0

### Minor Changes

- [#76](https://github.com/OpenZeppelin/openzeppelin-ui/pull/76) [`a25f306`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/a25f306ac50c5dfb9dffb23aea6a023b9eaa9e06) Thanks [@pasevin](https://github.com/pasevin)! - Add AddressBookWidget component for managing address aliases with search, inline edit, import/export, and clear-all support

### Patch Changes

- Updated dependencies [[`c3cc7d1`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/c3cc7d1f5fa2a2c1663f0c54449f51f321d78919), [`0c32886`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/0c328867950dc15282e31ed59c9fb0e1ad886ff9), [`0c32886`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/0c328867950dc15282e31ed59c9fb0e1ad886ff9), [`c3cc7d1`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/c3cc7d1f5fa2a2c1663f0c54449f51f321d78919), [`4a2ba22`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/4a2ba22b7df523c6ef7de52786ae0c1656da4746), [`c3cc7d1`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/c3cc7d1f5fa2a2c1663f0c54449f51f321d78919), [`58a7136`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/58a7136dfee6f7b0a3d201a4b4c216ef08c2d7f0), [`58a7136`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/58a7136dfee6f7b0a3d201a4b4c216ef08c2d7f0)]:
  - @openzeppelin/ui-types@1.11.0
  - @openzeppelin/ui-components@1.4.0

## 1.0.4

### Patch Changes

- [#72](https://github.com/OpenZeppelin/openzeppelin-ui/pull/72) [`78c3ae9`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/78c3ae9247b743a6a6fa0805e5a6db2d99de411e) Thanks [@pasevin](https://github.com/pasevin)! - Add network service feature gate mechanism
  - Add optional `requiredFeature` property to `NetworkServiceForm` interface
  - Add `filterEnabledServiceForms()` utility that gates forms behind `AppConfigService` feature flags
  - Apply filtering in `NetworkSettingsDialog` to hide service tabs when the feature flag is not enabled

- Updated dependencies [[`78c3ae9`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/78c3ae9247b743a6a6fa0805e5a6db2d99de411e)]:
  - @openzeppelin/ui-types@1.10.0
  - @openzeppelin/ui-utils@1.3.0

## 1.0.3

### Patch Changes

- [#57](https://github.com/OpenZeppelin/openzeppelin-ui/pull/57) [`b62aab7`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/b62aab793843d25797717feba6b9a0630df9ebac) Thanks [@pasevin](https://github.com/pasevin)! - Add exactBytes validation for fixed-size bytes types (bytes32, bytes4, etc.) to properly validate exact byte length requirements

- Updated dependencies [[`b62aab7`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/b62aab793843d25797717feba6b9a0630df9ebac)]:
  - @openzeppelin/ui-utils@1.2.1
  - @openzeppelin/ui-components@1.2.1

## 1.0.2

### Patch Changes

- [#6](https://github.com/OpenZeppelin/openzeppelin-ui/pull/6) [`3a24b04`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/3a24b04b48967d9eede253fc81ca163b45b6f97b) Thanks [@pasevin](https://github.com/pasevin)! - Export `rendererConfig` from the renderer package

  The `rendererConfig` object defines core and field-specific dependencies used by the export system to determine which packages to include in exported forms. This was previously only available internally but is now exported for use by consuming applications with form export functionality.

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

- Updated dependencies [[`8b96075`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/8b9607524611e5cf3b1b0a968460ece8c2aa5bd1)]:
  - @openzeppelin/ui-components@1.0.1
