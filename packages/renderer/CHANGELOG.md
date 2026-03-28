# @openzeppelin/ui-renderer

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
