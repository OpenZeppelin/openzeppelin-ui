/**
 * CodeEditorField entry point
 *
 * This component is exported separately because it imports CSS from
 * @uiw/react-textarea-code-editor which can cause issues in test environments
 * that don't handle CSS imports (like Node.js ESM).
 *
 * Usage:
 * ```typescript
 * import { CodeEditorField } from '@openzeppelin/ui-components/code-editor';
 * ```
 */
export * from './components/fields/CodeEditorField';
