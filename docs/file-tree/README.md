# FileTree

> A read-only file tree for showing a generated project: a flat list of paths in, one
> selected file out, with optional "changed" marks on the rows you name.

## Overview

`FileTree` renders a project's file paths as an expandable tree, lets the user pick one
file, and reports that pick to you. You own the data: the list of paths, which file is
selected, and which files count as changed. The component holds none of it between
renders.

**It is for** apps that generate code and want to show the result before download — the
RWA Wizard's live preview drawer is the first consumer. **It does** folders, single file
selection by pointer or keyboard, and a per-row change annotation. **It does not do**
search, rename, drag-and-drop, context menus, multi-select, or file contents; pair it
with a code view for that.

Two things you must know before the first render, because neither is guessable from
the props:

1. **Install the optional peer.** The tree is rendered by `@pierre/trees`, an exact
   optional peer of this kit. Importing the subpath without it fails at module
   resolution. See [Install](#install).
2. **Give it a height.** The tree fills whatever height its host has. Mount it in an
   unsized parent and you get an empty-looking box. See [Layout](#layout).

## Install

`FileTree` ships on its own subpath so that apps which never render a tree never load the
tree runtime:

```bash
pnpm add @openzeppelin/ui-components
pnpm add @pierre/trees@1.0.0-beta.6
```

The version is **exact** — `1.0.0-beta.6`, not `^1.0.0-beta.6`. `@pierre/trees` is a
prerelease that carries its own rendering runtime (Preact) into your bundle. The kit's
wrapper is tested against one build of it, and consumers and the kit move to a new build
together: a kit release that bumps the peer moves every consumer with it, and no consumer
can drift to a newer Pierre without a kit release. A caret range on a prerelease would not
give you that; prerelease semver does not promise compatibility between betas.

```tsx
import { FileTree } from '@openzeppelin/ui-components/file-tree';
```

If `@pierre/trees` is not installed, that import fails when your bundler (or Node)
resolves the module, and the error names `@pierre/trees`. That is the intended
diagnostic — there is no kit error class and no async fallback. Install the peer at the
version above and the import resolves.

Importing the main entry, `@openzeppelin/ui-components`, never touches `@pierre/trees`.
Only this subpath does.

## Quick Start

```tsx
import { useState } from 'react';
import { FileTree } from '@openzeppelin/ui-components/file-tree';

const paths = ['Cargo.toml', 'src/lib.rs', 'src/contract.rs', 'README.md'];

export function ProjectFiles() {
  const [selected, setSelected] = useState<string | null>('src/lib.rs');

  return (
    <div className="h-96">
      <FileTree
        aria-label="Generated project files"
        className="h-full"
        paths={paths}
        selectedPath={selected}
        onSelectedPathChange={setSelected}
      />
    </div>
  );
}
```

Three things that snippet does that every consumer must do:

- **`aria-label`** (or `aria-labelledby`) — the tree needs an accessible name. The type
  requires one of the two; in development, a blank name logs a kit `logger.error`.
- **Controlled selection** — `selectedPath` is what the tree shows, `onSelectedPathChange`
  is how the tree asks you to change it. Store it yourself.
- **A sized host** — the outer `h-96` plus `className="h-full"` on the tree.

To mark rows as changed, add `changedPaths`:

```tsx
<FileTree
  aria-label="Generated project files"
  className="h-full"
  paths={paths}
  selectedPath={selected}
  onSelectedPathChange={setSelected}
  changedPaths={['src/contract.rs']}
/>
```

## Layout

`FileTree` does not set its own height. Its inner tree measures the space the host
element actually occupies (its *used* box) and lays rows out inside that. If the host's
used height is zero, the tree has nowhere to draw.

Give it height in one of two ways:

- **Class on the component** — `className="h-full min-h-0"` inside a parent with a real
  height (fixed, percentage of a sized ancestor, or a flex/grid track).
- **Sized parent** — a parent with `h-96`, `height: 400px`, or a flex column where the
  tree is the growing child.

`min-h-0` matters in flex columns: without it, a flex child's minimum height is its
content height, and the tree will grow instead of scrolling.

There is deliberately no `style` prop; a class produces the same used box, and keeping
layout in classes keeps the tree consistent with the rest of the kit.

## Key Concepts

**Paths are flat, project-relative strings.** `src/lib.rs`, not `/src/lib.rs` and not a
nested object. Folders are inferred from the slashes. This is the shape a code generator
already has (`Object.keys(files)`), so nothing needs translating.

**Selection is controlled and file-only.** Clicking a folder expands or collapses it and
does not call `onSelectedPathChange`. Clicking a file, or pressing Enter or Space on it,
calls `onSelectedPathChange(path)`. If the selected path stops existing in `paths`
(you regenerated and the file went away), the tree calls `onSelectedPathChange(null)`
once and then waits for you. It never picks a replacement for you.

**Change marks are a set of paths.** `changedPaths` is "these files differ from some
baseline you chose." Each listed path that also exists in `paths` gets the tree's native
*modified* annotation; paths not in `paths` are ignored. Omit the prop or pass `[]` for
no marks. To clear one, leave it out of the next array — there is no separate clear call.

**Content, not identity.** You can pass a fresh array every render. The tree compares
the *contents* of `paths` and `changedPaths` as sets and only touches its internal model
when a set actually changed. Regenerating on every keystroke and handing over
`Object.keys(result)` does not reset expansion or scroll.

**Expansion resets on mount.** Folders start open. Expansion state lives inside the tree
and is not a prop; when the component unmounts (a drawer closes) and mounts again, it
starts fresh. Selection survives because you own it.

## API Reference

See [api-reference.md](./api-reference.md).

## Integration Guide

See [integration-guide.md](./integration-guide.md) for the preview-drawer pattern, a
step-diff pattern, and the common mistakes.

## Safety

- **Accessible name is on you.** The component forwards `aria-label` /
  `aria-labelledby` to the tree host, which carries `role="tree"` with per-row
  `treeitem` semantics. It never invents a label. A missing or blank name logs a
  `console.error` in development and mounts unnamed in production.
- **Exceptions propagate.** If the tree runtime throws during render, the component does
  not catch it. Mount `FileTree` inside whatever error boundary guards the rest of your
  preview surface.
- **Two mounts, two trees.** There is no shared state between `FileTree` instances.
- **Peer pin is exact and kit-owned.** Do not widen `@pierre/trees` to a range in your
  app. When the kit bumps the peer, bump your pin to match in the same change.

## License

AGPL-3.0, as the rest of `@openzeppelin/ui-components`.
