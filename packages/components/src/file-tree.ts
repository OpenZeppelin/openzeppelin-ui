/**
 * FileTree entry point.
 *
 * Exported separately so consumers that do not import this subpath never bundle
 * `@pierre/trees` or its Preact runtime.
 *
 * Usage:
 * ```typescript
 * import { FileTree } from '@openzeppelin/ui-components/file-tree';
 * ```
 *
 * Requires an exact consumer pin of `@pierre/trees@1.0.0-beta.6`.
 */
export {
  FileTree,
  type FileTreeAccessibleName,
  type FileTreePath,
  type FileTreeProps,
} from './components/file-tree';
