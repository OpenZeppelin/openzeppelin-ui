# @openzeppelin/ui-utils

## 3.3.0

### Minor Changes

- [#188](https://github.com/OpenZeppelin/openzeppelin-ui/pull/188) [`b4eab15`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/b4eab1593a31035a54368ae9a845c359377613dc) Thanks [@pasevin](https://github.com/pasevin)! - Add cross-network fallback disclaimer display (initiative 003, SF-2 + SF-3).

  `@openzeppelin/ui-utils` adds pure classifiers `isCrossNetworkFallback` and `getFallbackNetworks` reading only base `ResolutionProvenance` fallback fields (Principle II — no ENS adapter imports), plus copy helpers `networkDisplayName`, `nameResolutionCrossNetworkFallbackMessage`, and `crossNetworkFallbackMessageNames` for mechanism-neutral disclaimer text.

  `@openzeppelin/ui-components` surfaces the disclaimer when the complete fallback triplet is present. **Reverse (`AddressDisplay`):** a small amber `TriangleAlert` icon inline immediately after the verified name; the locked copy appears in a tooltip on hover and keyboard focus via a focusable button whose `aria-label` is the full message. **Forward (`AddressField`):** a muted `role="note"` line under the resolved success template. Both components expose `showCrossNetworkFallbackDisclaimer?: boolean` (default `true`) to suppress presentation entirely. Classification uses SF-2 helpers only; `002` scope-gate behavior (`isChainScopeMismatch` / `scopedToNetworkId`) is unchanged — the disclaimer is additive copy, not a suppression gate. Optional `resolveNetworkLabel` threads through `AddressNameProvider`, `NameResolverProvider`, and related context types.

  `@openzeppelin/ui-renderer` forwards `resolveNetworkLabel` from `AddressNameResolutionProvider`; `TransactionForm` wires a reference resolver via `activeRuntime.networkCatalog`.

### Patch Changes

- Updated dependencies [[`b4eab15`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/b4eab1593a31035a54368ae9a845c359377613dc)]:
  - @openzeppelin/ui-types@3.3.0

## 3.2.0

### Minor Changes

- [#180](https://github.com/OpenZeppelin/openzeppelin-ui/pull/180) [`290dc8f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/290dc8f751247e3634e0ab9a6e580c2ef60a5d12) Thanks [@pasevin](https://github.com/pasevin)! - Add ENS-aware address input validation and inline resolution (SF-3, Rev-2/3).

  `@openzeppelin/ui-components` gains a headless name-resolution seam: `NameResolverProvider`, `useNameResolver`, and `useInjectedNameResolution` let `AddressField` resolve typed names inline when a forward resolver is injected — submitting the **resolved hex**, never the name, never a silently-coerced hex. The correctness spine is a shadow-state model: the React Hook Form value is the resolved hex, the typed name lives only in local display state, and `field.onChange(hex)` fires at exactly one site, only when resolution succeeds _and_ the resolved name still matches what the user typed. In every other state the value is `''`, so submit is gated by `formState.isValid` with no async validator. Pasted hex addresses pass through and validate exactly as before. Each resolution failure surfaces a distinct, per-code message in a dedicated `aria-live` region, with a retry affordance for transient errors only. The headless `useAddressSuggestionField` hook and presentational `AddressSuggestionList` component are extracted from `AddressField`'s inline dropdown logic so suggestion behavior is shared with zero regression.

  `@openzeppelin/ui-utils` gains two pure, framework-free helpers: `classifyAddressInput` (a dependency-injected, chain-neutral classifier — `empty` / `hex` / `name-candidate` / `malformed`) and `nameResolutionMessageForCode` (a per-code message mapper covering all seven resolution error codes with no generic catch-all — the single i18n seam).

  `@openzeppelin/ui-renderer` keeps the `blockchain-address` field registry mapped to the base `AddressField` (the Rev-1 `ResolvingAddressField` fork is retired). `TransactionForm` mounts `NameResolverProvider` ambiently via `useRuntimeNameResolver` from `@openzeppelin/ui-react`, so dynamic-form address fields gain inline ENS resolution with no integrator registry swap and no `WalletStateProvider` requirement at the field layer.

### Patch Changes

- Updated dependencies [[`290dc8f`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/290dc8f751247e3634e0ab9a6e580c2ef60a5d12)]:
  - @openzeppelin/ui-types@3.2.0

## 3.1.1

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

## 3.1.0

### Minor Changes

- [#165](https://github.com/OpenZeppelin/openzeppelin-ui/pull/165) [`c3f393b`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/c3f393b8c50553fa0733060e19288211330014ae) Thanks [@pasevin](https://github.com/pasevin)! - Add `AddressListField` for bulk address paste workflows with delimiter parsing, live validation preview, and removable list rows. Export address-list parsing helpers from `@openzeppelin/ui-utils` and showcase the field in the basic-react-app examples gallery.

## 3.0.1

### Patch Changes

- [#161](https://github.com/OpenZeppelin/openzeppelin-ui/pull/161) [`adb3d75`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/adb3d7543158ae4d94fe74cb9bd1e9ea4adefeaa) Thanks [@pasevin](https://github.com/pasevin)! - Add network availability policy for hosted deployments: disable mainnet networks via `mainnet_networks_disabled`, per-network blocklist via `disabledNetworkIds`, shared resolution helpers, disabled `NetworkSelector` items, and a self-host notice banner.

- Updated dependencies [[`adb3d75`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/adb3d7543158ae4d94fe74cb9bd1e9ea4adefeaa)]:
  - @openzeppelin/ui-types@3.1.1

## 3.0.0

### Major Changes

- [#113](https://github.com/OpenZeppelin/openzeppelin-ui/pull/113) [`6f09f66`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/6f09f66fe3e647ae234bb507795e0caa362b29aa) Thanks [@pasevin](https://github.com/pasevin)! - Migrate shared UI packages from monolithic adapter APIs to capability-based runtime APIs.

  BREAKING CHANGE: shared component props, helper types, and React context exports now use
  narrow capability interfaces and runtime-oriented names instead of `ContractAdapter` and
  `FullContractAdapter` surfaces.

### Patch Changes

- Updated dependencies [[`5fc43ce`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/5fc43cead09bff7a54951c2cd9911641158017b9), [`6f09f66`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/6f09f66fe3e647ae234bb507795e0caa362b29aa), [`f88f86b`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/f88f86bb9be61fdb42c58143164df7267671a027)]:
  - @openzeppelin/ui-types@3.0.0

## 2.0.0

### Major Changes

- [#113](https://github.com/OpenZeppelin/openzeppelin-ui/pull/113) [`52f2823`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/52f2823734d1a123b607f1ce8804b0f6d57cf728) Thanks [@pasevin](https://github.com/pasevin)! - Migrate shared UI packages from monolithic adapter APIs to capability-based runtime APIs.

  BREAKING CHANGE: shared component props, helper types, and React context exports now use
  narrow capability interfaces and runtime-oriented names instead of `ContractAdapter` and
  `FullContractAdapter` surfaces.

### Patch Changes

- Updated dependencies [[`52f2823`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/52f2823734d1a123b607f1ce8804b0f6d57cf728), [`52f2823`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/52f2823734d1a123b607f1ce8804b0f6d57cf728), [`52f2823`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/52f2823734d1a123b607f1ce8804b0f6d57cf728)]:
  - @openzeppelin/ui-types@2.0.0

## 1.4.0

### Minor Changes

- [#96](https://github.com/OpenZeppelin/openzeppelin-ui/pull/96) [`b7f6eb5`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/b7f6eb5d8c1c0a0090f8cc22370c1c397435d71a) Thanks [@pasevin](https://github.com/pasevin)! - Add VERSION export to all public packages for runtime peer compatibility validation. Each package now exports a `VERSION` constant that reflects the package version at build time, enabling consuming libraries (such as adapters) to verify compatible versions are installed and throw actionable errors on mismatch.

### Patch Changes

- Updated dependencies [[`b7f6eb5`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/b7f6eb5d8c1c0a0090f8cc22370c1c397435d71a)]:
  - @openzeppelin/ui-types@1.12.0

## 1.3.0

### Minor Changes

- [#72](https://github.com/OpenZeppelin/openzeppelin-ui/pull/72) [`78c3ae9`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/78c3ae9247b743a6a6fa0805e5a6db2d99de411e) Thanks [@pasevin](https://github.com/pasevin)! - Add network service feature gate mechanism
  - Add optional `requiredFeature` property to `NetworkServiceForm` interface
  - Add `filterEnabledServiceForms()` utility that gates forms behind `AppConfigService` feature flags
  - Apply filtering in `NetworkSettingsDialog` to hide service tabs when the feature flag is not enabled

### Patch Changes

- Updated dependencies [[`78c3ae9`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/78c3ae9247b743a6a6fa0805e5a6db2d99de411e)]:
  - @openzeppelin/ui-types@1.10.0

## 1.2.2

### Patch Changes

- [#68](https://github.com/OpenZeppelin/openzeppelin-ui/pull/68) [`5bd3406`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/5bd3406e1c6a766bb95ca2b3571ff6e2c9066d01) Thanks [@pasevin](https://github.com/pasevin)! - Add `formatSecondsToReadable` to format a duration in seconds as a human-readable string (e.g. "1 day", "24 hours", "30 minutes").

## 1.2.1

### Patch Changes

- [#57](https://github.com/OpenZeppelin/openzeppelin-ui/pull/57) [`b62aab7`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/b62aab793843d25797717feba6b9a0630df9ebac) Thanks [@pasevin](https://github.com/pasevin)! - Add exactBytes validation for fixed-size bytes types (bytes32, bytes4, etc.) to properly validate exact byte length requirements

## 1.2.0

### Minor Changes

- [#48](https://github.com/OpenZeppelin/openzeppelin-ui/pull/48) [`0cb85e7`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/0cb85e720dbd8bbac660227d1213acad4247ff92) Thanks [@pasevin](https://github.com/pasevin)! - Added service error detection utilities for identifying and categorizing network service connection errors (RPC, Explorer, Indexer, etc.)

### Patch Changes

- Updated dependencies [[`0cb85e7`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/0cb85e720dbd8bbac660227d1213acad4247ff92)]:
  - @openzeppelin/ui-types@1.5.0

## 1.1.1

### Patch Changes

- [#43](https://github.com/OpenZeppelin/openzeppelin-ui/pull/43) [`2fece05`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/2fece05af7e8bb1fa6be12605b3c57e8b0bcf883) Thanks [@pasevin](https://github.com/pasevin)! - Update logger comments to reference tsdown instead of tsup after build tool migration

- Updated dependencies [[`c7a6a61`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/c7a6a61af83cda327c6b655936907ac709c199f3)]:
  - @openzeppelin/ui-types@1.4.0

## 1.1.0

### Minor Changes

- [#33](https://github.com/OpenZeppelin/openzeppelin-ui/pull/33) [`20856cf`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/20856cf7b7bfee4868ea12f1ace963e54049a93d) Thanks [@pasevin](https://github.com/pasevin)! - Add customization support for wallet components

  **@openzeppelin/ui-types:**
  - Add `WalletComponentSize` type (`'sm' | 'default' | 'lg' | 'xl'`)
  - Add `WalletComponentVariant` type (`'default' | 'outline' | 'ghost' | 'secondary'`)
  - Extend `BaseComponentProps` with `size`, `variant`, and `fullWidth` properties

  **@openzeppelin/ui-react:**
  - Add `useWalletComponents()` hook for direct access to adapter wallet components
  - Add `connectButtonProps`, `accountDisplayProps`, and `networkSwitcherProps` to `WalletConnectionUI`
  - Export `WalletConnectionUIProps` type

  **@openzeppelin/ui-utils:**
  - Add shared wallet component sizing utilities:
    - `getWalletButtonSizeProps()` - Maps size to button styling props
    - `getWalletAccountDisplaySizeProps()` - Maps size to account display styling
    - `getWalletNetworkSwitcherSizeProps()` - Maps size to network switcher styling
  - Export `WalletButtonSizeProps`, `WalletAccountDisplaySizeProps`, `WalletNetworkSwitcherSizeProps` types

### Patch Changes

- Updated dependencies [[`20856cf`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/20856cf7b7bfee4868ea12f1ace963e54049a93d)]:
  - @openzeppelin/ui-types@1.2.0
