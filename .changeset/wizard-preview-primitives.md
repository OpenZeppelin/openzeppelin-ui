---
'@openzeppelin/ui-components': minor
---

Add preview-oriented layout primitives for generated-project UIs:

- **`BottomSheet`** on the main entry — a non-modal bottom panel that keeps the page behind it interactive, with drag-resizable height and a labelled portalled region (not dialog semantics). An optional `header` prop renders content beside the close button, outside the scrolling body, for a title or status notice. An optional `layout` prop (`'overlay'` default, or `'inset'`) lets the host reserve space for the sheet: in `inset` mode the rendered height is published as `--bottom-sheet-inset` on `<html>` so viewport-height layouts can shrink instead of being covered, and stays published until the closing sheet finishes its exit transition so the host's layout does not spring back underneath it. `defaultBottomSheetHeight` accepts `{ ratio }` to seed a different share of the viewport than the 60% default.
- **`@openzeppelin/ui-components/code-view`** — a read-only syntax-highlighted code pane with no character-size cutoff. An optional `decorateToken` callback lets you customize how individual highlighted tokens render; omit it for standard highlighting with no added decoration.
- **`@openzeppelin/ui-components/file-tree`** — a file-tree pane for browsing a generated project. **`@pierre/trees` is an optional peer** — install and pin it in your app; the subpath surfaces the native resolver diagnostic if the peer is missing. This subpath is **ESM-only at runtime**: the CJS build resolves, but `@pierre/trees` publishes an `import` condition only, so `require('@openzeppelin/ui-components/file-tree')` fails under Node. Bundler consumers are unaffected. Every other entry point, including `./code-view`, honours both conditions.

`CodeView` memoizes its rendered output, so a host that re-renders on every pointer move (a drag-resizable container) no longer reconciles the whole file each frame. `FileTree` moves keyboard focus only when the controlled `selectedPath` changes, so an unrelated parent re-render no longer discards the row the user arrow-keyed to.

Development-only diagnostics from `BottomSheet` and `FileTree` now go through the kit `logger` from `@openzeppelin/ui-utils` instead of `console`, so they carry the standard `[ERROR][BottomSheet]` / `[ERROR][FileTree]` prefix and honour logger configuration. Production builds still skip the checks entirely.

All additions are additive. No existing exports changed.
