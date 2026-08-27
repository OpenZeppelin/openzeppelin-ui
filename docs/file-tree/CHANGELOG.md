# Changelog — FileTree

## Unreleased (targets the next `@openzeppelin/ui-components` minor)

### Added

- New subpath export `@openzeppelin/ui-components/file-tree` with `FileTree` and the
  types `FileTreeProps`, `FileTreePath`, `FileTreeAccessibleName`.
- New **optional** peer dependency `@pierre/trees` at the exact version `1.0.0-beta.6`,
  declared in `peerDependencies` and marked optional in `peerDependenciesMeta`.

### Changed

- Nothing on the main entry. `@openzeppelin/ui-components` exports the same members as
  before and does not load `@pierre/trees`.

### Migration Guide

- **Existing consumers:** no action. If your package manager warns about an unmet
  optional peer `@pierre/trees`, that is informational; you do not need it unless you
  import the `file-tree` subpath.
- **New `FileTree` consumers:** add `@pierre/trees@1.0.0-beta.6` (exact) to your
  dependencies before importing the subpath, and give the component a sized host. See
  [README](./README.md).
