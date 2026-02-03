# @openzeppelin/ui-renderer

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
