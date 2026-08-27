# FileTree — Integration Guide

How to put `FileTree` into a real screen. Two patterns cover the intended uses: a
generated-project preview beside a code pane, and the same preview with rows marked
when a wizard step changes them. The [common mistakes](#common-mistakes) at the end
account for most first-run bugs.

## Prerequisites

1. Both packages installed, the second at the exact version:

   ```bash
   pnpm add @openzeppelin/ui-components
   pnpm add @pierre/trees@1.0.0-beta.6
   ```

   Your `package.json` should then show `"@pierre/trees": "1.0.0-beta.6"` with no `^`
   or `~`. If you see a resolution error mentioning `@pierre/trees` on first build, this
   step was skipped.

2. React 19 (already a peer of the kit).

3. A place in your layout with a real height for the tree to fill.

## Pattern 1: Generated-project preview

The tree on the left lists the files; a code pane on the right shows the selected one.
The parent grid supplies the height, the tree fills its column, and selection is
ordinary component state.

```tsx
import { useMemo, useState } from 'react';
import { FileTree } from '@openzeppelin/ui-components/file-tree';

type GeneratedProject = Record<string, string>; // path -> contents

export function ProjectPreview({ files }: { files: GeneratedProject }) {
  const paths = useMemo(() => Object.keys(files), [files]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const selectedContents = selectedPath ? files[selectedPath] : undefined;

  return (
    <div className="grid h-[32rem] grid-cols-[16rem_1fr] gap-4">
      <FileTree
        aria-label="Generated project files"
        className="h-full min-h-0 border-r"
        paths={paths}
        selectedPath={selectedPath}
        onSelectedPathChange={setSelectedPath}
      />
      <pre className="min-h-0 overflow-auto text-sm">
        {selectedContents ?? 'Select a file to view it.'}
      </pre>
    </div>
  );
}
```

What to notice:

- `h-[32rem]` on the grid is the only height in the example. The tree's
  `className="h-full min-h-0"` inherits it. Delete the grid height and the tree renders
  as a zero-height strip.
- `setSelectedPath` is passed straight through. When the user regenerates and the
  selected file no longer exists, the tree calls it with `null` once; the code pane
  falls back to its placeholder without extra handling.
- `paths` is memoised on `files`, but that is a courtesy, not a requirement — the tree
  compares contents, so a fresh array with the same paths costs nothing.

## Pattern 2: Marking what a step changed

A wizard regenerates the project as the user edits. To show which files the current step
touched, snapshot the project on step entry and pass the paths whose contents differ.

```tsx
import { useMemo, useRef, useState } from 'react';
import { FileTree } from '@openzeppelin/ui-components/file-tree';

type GeneratedProject = Record<string, string>;

function diffPaths(before: GeneratedProject, after: GeneratedProject): string[] {
  return Object.keys(after).filter((path) => before[path] !== after[path]);
}

export function StepPreview({
  stepId,
  files,
}: {
  stepId: string;
  files: GeneratedProject; // regenerated on every edit
}) {
  // Snapshot the project when the step changes.
  const snapshotRef = useRef<{ stepId: string; files: GeneratedProject } | null>(null);
  if (snapshotRef.current?.stepId !== stepId) {
    snapshotRef.current = { stepId, files };
  }

  const paths = useMemo(() => Object.keys(files), [files]);
  const changedPaths = useMemo(
    () => diffPaths((snapshotRef.current ?? { files }).files, files),
    [files]
  );
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  return (
    <div className="flex h-[32rem] flex-col">
      <h2 id="preview-title" className="mb-2 text-base font-medium">
        Project files
      </h2>
      <FileTree
        aria-labelledby="preview-title"
        className="min-h-0 flex-1"
        paths={paths}
        selectedPath={selectedPath}
        onSelectedPathChange={setSelectedPath}
        changedPaths={changedPaths}
      />
    </div>
  );
}
```

What to notice:

- `changedPaths` is recomputed on every regeneration. Files that revert to their
  snapshot contents drop out of the array and their mark disappears — clearing is
  absence, there is no separate call.
- A file that did not exist at step entry and exists now is in `changedPaths` and shows
  the same *modified* mark as an edited file. The tree has one mark kind. If your product
  needs "new" distinguished from "edited", that is a kit change, not a prop you are
  missing.
- `aria-labelledby` points at a heading that is in the document when the tree mounts. If
  the heading rendered later or under a different `id`, development would log
  `[FileTree] aria-labelledby="preview-title" does not match any element in the document.`
- The flex column: `flex-1` gives the tree the remaining height, `min-h-0` lets it
  scroll instead of pushing the column taller.

## Inside a drawer or sheet that unmounts its content

Many drawers (including the kit's `BottomSheet`) render children only while open. Each
open therefore mounts a new `FileTree`: folders start expanded again and scroll returns
to the top. Selection does not reset, because `selectedPath` is your state, not the
tree's. If you want expansion to persist across opens, keep the tree mounted (hide it)
rather than expecting the component to remember.

## Common Mistakes

- **Import fails with an error about `@pierre/trees`.** The optional peer is not
  installed. Run `pnpm add @pierre/trees@1.0.0-beta.6`. This is the expected failure mode
  for a missing peer, not a kit bug; the kit does not bundle the tree runtime.
- **Widening the pin.** `"@pierre/trees": "^1.0.0-beta.6"` may resolve to a build the kit
  was never tested against. Keep it exact and bump it only alongside a kit release that
  bumps its peer.
- **Empty-looking tree.** The host has no height. Add `className="h-full min-h-0"` under
  a sized parent, or size the parent. Check the host `div` in devtools: if its height is
  `0`, this is the cause.
- **Tree grows instead of scrolling.** Missing `min-h-0` on a flex child. Flex items
  default to `min-height: auto`, which is content height.
- **Passing `/src/lib.rs` or `src\lib.rs`.** Paths are project-relative with forward
  slashes and no leading slash.
- **Expecting a callback on folder click.** Folders expand or collapse; only files call
  `onSelectedPathChange`.
- **Expecting a fallback selection.** When the selected file disappears you get `null`
  once. Choose the next file yourself if you want one.
- **Both `aria-label` and `aria-labelledby`.** Type error by design. Pick one.
- **Styling the rows from outside.** Row markup is internal and not part of the
  compatibility promise. Style the host via `className`.
- **Importing from the main entry.** `FileTree` is not on `@openzeppelin/ui-components`;
  only on `@openzeppelin/ui-components/file-tree`. That separation is what keeps the tree
  runtime out of apps that never render a tree.
