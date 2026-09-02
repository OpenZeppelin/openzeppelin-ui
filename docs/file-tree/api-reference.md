# FileTree — API Reference

Everything exported from `@openzeppelin/ui-components/file-tree`. There are four
exports: one component and three types. Nothing else on this subpath is public, and the
main entry `@openzeppelin/ui-components` exports none of them.

```ts
import {
  FileTree,
  type FileTreeProps,
  type FileTreePath,
  type FileTreeAccessibleName,
} from '@openzeppelin/ui-components/file-tree';
```

**Install requirement.** This subpath has a required, exact, optional peer:
`@pierre/trees@1.0.0-beta.6`. Without it, the import fails at module resolution with an
error naming `@pierre/trees`. See the [README](./README.md#install).

---

## `FileTree`

```ts
const FileTree: React.ForwardRefExoticComponent<
  FileTreeProps & React.RefAttributes<HTMLElement>
>;
```

A controlled, read-only file tree. Renders `paths` as folders and files, shows
`selectedPath` as the current file, marks `changedPaths` rows, and reports user file
picks through `onSelectedPathChange`.

Synchronous React component; no Promise anywhere in the surface.

### Props (`FileTreeProps`)

```ts
type FileTreeProps = FileTreeAccessibleName & {
  paths: readonly FileTreePath[];
  selectedPath: FileTreePath | null;
  onSelectedPathChange: (path: FileTreePath | null) => void;
  changedPaths?: readonly FileTreePath[];
  className?: string;
  id?: string;
};
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `aria-label` / `aria-labelledby` | see [`FileTreeAccessibleName`](#filetreeaccessiblename) | one of the two | Accessible name for the tree. |
| `paths` | `readonly FileTreePath[]` | yes | Every file in the project, as project-relative slash paths. Folders are derived. Duplicates are collapsed. An empty array renders an empty, still-labelled tree. |
| `selectedPath` | `FileTreePath \| null` | yes | The file currently shown as selected. `null` for none. If the value is not present in `paths`, the tree calls `onSelectedPathChange(null)` once and displays no selection. |
| `onSelectedPathChange` | `(path: FileTreePath \| null) => void` | yes | Called with a file path when the user selects a file by pointer, Enter, or Space; called with `null` once when the current `selectedPath` disappears from `paths`. Never called for folder clicks. The latest function you pass is always the one invoked. |
| `changedPaths` | `readonly FileTreePath[]` | no | Files to show with the *modified* annotation. Entries not present in `paths` are ignored; duplicates are collapsed. Omitted and `[]` are equivalent. The whole set is replaced on each change — to clear a mark, omit it from the next array. |
| `className` | `string` | no | Applied to the kit host element. Use it to supply height (`h-full min-h-0`). The host already has `flex min-h-0 min-w-0 flex-col`. |
| `id` | `string` | no | `id` attribute of the kit host element. |

### Ref

`ref` attaches to the kit's host `HTMLElement` — the outer `div` that carries `id` and
`className`. It is a normal DOM element you can measure or scroll into view. It is not a
tree model handle; there is no imperative API.

### Behaviour

- **Selection is single and file-only.** Folder rows expand and collapse on click,
  Enter, ArrowRight/ArrowLeft; they never emit a selection.
- **Selection disappearance emits once.** When `selectedPath` is absent from `paths`,
  you get exactly one `onSelectedPathChange(null)`. Passing the same absent path on later
  renders is quiet. If the path comes back and disappears again, you get one more.
- **Prop updates are compared by set contents, not array identity.** A new `paths` or
  `changedPaths` array with the same members is a no-op inside the tree: expansion,
  scroll position, and focus are untouched. Only a real change in membership updates the
  model.
- **Folders start expanded.** Expansion is internal state; it is not exposed as a prop
  and resets when the component mounts.
- **Nothing is retained across unmounts.** Mount creates the tree; unmount destroys it.
  Two `FileTree` elements are fully independent.
- **Rendering errors propagate.** The component has no internal error boundary.

### Accessibility

- The tree host carries the `aria-label` or `aria-labelledby` you pass; it has
  `role="tree"` and each row is a `treeitem` with `aria-level`, `aria-posinset`, and
  `aria-setsize`.
- Keyboard: ArrowUp/ArrowDown move between rows; ArrowRight/ArrowLeft expand and collapse
  folders; Enter and Space select the focused file.
- A changed row exposes its state as `data-item-git-status="modified"` and carries an
  accessible description in addition to the visual mark, so change state is not conveyed
  by colour alone.
- Development-only diagnostics, both emitted at error level through the kit `logger`
  (`@openzeppelin/ui-utils`), neither throws:
  - `[ERROR][FileTree] Accessible name required: provide a nonblank aria-label or aria-labelledby.`
  - `[ERROR][FileTree] aria-labelledby="<id>" does not match any element in the document.`

  Production builds skip both checks and mount regardless.

---

## `FileTreePath`

```ts
type FileTreePath = string;
```

A project-relative, slash-separated path: `src/contract.rs`, `Cargo.toml`. No leading
slash, no backslashes. This is a plain `string` alias, not a branded type, so the keys
of a generated `Record<string, string>` are already valid.

---

## `FileTreeAccessibleName`

```ts
type FileTreeAccessibleName =
  | { 'aria-label': string; 'aria-labelledby'?: never }
  | { 'aria-labelledby': string; 'aria-label'?: never };
```

Exactly one of `aria-label` or `aria-labelledby`. Supplying both, or neither, is a type
error. An empty or whitespace-only string is treated as missing at runtime (dev
diagnostic). This type is defined on the subpath itself so that importing it does not
pull the main entry into your bundle.

---

## Not exported

For readers checking what they can rely on: the tree library's own types, the internal
model, the wrapper's hooks, and any shadow-DOM structure are implementation details.
They are not exported, are not covered by the kit's compatibility promise, and can change
in a patch release. Style the host through `className`; do not target the tree's
internals from CSS.

---

## Package metadata

```jsonc
// @openzeppelin/ui-components/package.json (excerpt)
"exports": {
  "./file-tree": {
    "types":   { "import": "./dist/file-tree.d.mts", "require": "./dist/file-tree.d.cts" },
    "import":  "./dist/file-tree.mjs",
    "require": "./dist/file-tree.cjs"
  }
},
"peerDependencies": {
  "@pierre/trees": "1.0.0-beta.6"
},
"peerDependenciesMeta": {
  "@pierre/trees": { "optional": true }
}
```

ESM and CJS builds are both published, and in both `@pierre/trees` stays an external
import — it is never inlined into the kit bundle, which is why your own install of it
is required.

### This subpath is ESM-only at runtime

Unlike the rest of the kit, `require('@openzeppelin/ui-components/file-tree')` does not
work under Node. The CJS build exists and resolves, but it re-exports `@pierre/trees`,
which publishes an `import` condition only:

```jsonc
// @pierre/trees/package.json (excerpt)
"type": "module",
"exports": {
  "./react": { "types": "./dist/react/index.d.ts", "import": "./dist/react/index.js" }
}
```

So a `require()` of the CJS build fails in Node with `ERR_PACKAGE_PATH_NOT_EXPORTED`
when it reaches the peer. Bundler consumers (Vite, webpack, Next.js) are unaffected —
they resolve the `import` condition regardless of the importing file's format, which is
the only way this subpath is consumed in practice.

Use `import` for this subpath. Every other kit entry point, including `./code-view`,
honours both conditions under Node.
