/**
 * Project-relative slash-separated path as produced by the project generator
 * (e.g. `src/contract.rs`, not `/src/contract.rs`). Not localized. Not branded:
 * callers pass the path keys their generator returns.
 */
export type FileTreePath = string;

/**
 * Copied into this subpath on purpose. Do not import AccessibleName from the
 * main barrel. That import would pull the main entry into every FileTree
 * consumer and undo the optional-peer split.
 * Empty string is missing.
 */
export type FileTreeAccessibleName =
  | { 'aria-label': string; 'aria-labelledby'?: never }
  | { 'aria-labelledby': string; 'aria-label'?: never };

export type FileTreeProps = FileTreeAccessibleName & {
  paths: readonly FileTreePath[];
  selectedPath: FileTreePath | null;
  onSelectedPathChange: (path: FileTreePath | null) => void;
  changedPaths?: readonly FileTreePath[];
  className?: string;
  id?: string;
};

export interface ChangeStatusEntry {
  readonly path: FileTreePath;
  readonly status: 'modified';
}
