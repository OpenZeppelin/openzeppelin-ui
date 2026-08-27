# BottomSheet — Integration Guide

How to put `BottomSheet` into a real screen. Three patterns cover the intended uses: a
form with a live preview beneath it, a sheet whose height survives reloads, and a sheet
whose content can fail without taking the page down. The
[common mistakes](#common-mistakes) at the end account for most first-run bugs, and
almost all of them come from expecting a dialog.

Every snippet imports from the main entry and type-checks against the current
`BottomSheetProps`.

- [Prerequisites](#prerequisites)
- [Pattern 1: Form with a live preview](#pattern-1-form-with-a-live-preview)
- [Pattern 2: Persist the height](#pattern-2-persist-the-height)
- [Pattern 3: Guard the content with an error boundary](#pattern-3-guard-the-content-with-an-error-boundary)
- [Pattern 4: Header beside the close button](#pattern-4-header-beside-the-close-button)
- [Pattern 5: Inset layout — shrink the page instead of covering it](#pattern-5-inset-layout-shrink-the-page-instead-of-covering-it)
- [When to use Dialog instead](#when-to-use-dialog-instead)
- [Common mistakes](#common-mistakes)

## Prerequisites

1. `@openzeppelin/ui-components` installed; React 19 (already a peer of the kit).
2. Your Tailwind build scanning the kit package (see the package README's *Styling*
   section). The layer's `pointer-events: none` is a Tailwind class; without the scan the
   page behind the sheet is unclickable.
3. Somewhere to keep two pieces of state: `open: boolean` and `height: number`.

## Pattern 1: Form with a live preview

The reason the component exists. The user edits a form; the sheet shows what the form
produces; both stay interactive. Focus stays in the field the user was typing in when the
sheet opens, and typing continues to update the preview.

```tsx
import { useState } from 'react';
import { BottomSheet, Button, defaultBottomSheetHeight } from '@openzeppelin/ui-components';

const SHEET_ID = 'generated-preview';

export function TokenForm() {
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);
  const [height, setHeight] = useState(() => defaultBottomSheetHeight(window.innerHeight));

  const generated = `[package]\nname = "${name || 'token'}"\n`;

  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <label>
        Token name
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <Button
        type="button"
        variant="outline"
        aria-expanded={open}
        aria-controls={open ? SHEET_ID : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? 'Hide code' : 'View code'}
      </Button>

      <BottomSheet
        id={SHEET_ID}
        aria-label="Generated project preview"
        open={open}
        onOpenChange={setOpen}
        height={height}
        onHeightChange={setHeight}
      >
        <pre className="p-4 text-sm">{generated}</pre>
      </BottomSheet>
    </form>
  );
}
```

What to notice:

- **The trigger is an ordinary button you write.** `aria-expanded` tells assistive
  technology the button controls something that is currently shown or hidden.
  `aria-controls` is set only while open because the region element does not exist when
  closed; an id reference to a missing element is an accessibility error.
- **`setOpen` and `setHeight` are passed straight through.** The sheet only ever calls
  `onOpenChange(false)`; toggling open is the trigger's job. `onHeightChange` delivers a
  clamped pixel value and `setHeight` stores it — nothing to transform.
- **The sheet lives where the state lives, not where the trigger lives.** It portals to
  `document.body`, so its position in your tree only affects context and error-boundary
  scope. The trigger can be in a header while the sheet is rendered from a page.
- **`generated` recomputes every render**, and the sheet re-renders its children like any
  other React element. There is nothing to memoise for the sheet's sake.

## Pattern 2: Persist the height

A product that remembers the drawer height across steps or reloads stores the value
`onHeightChange` reports and restores it on next mount. The sheet's clamp handles a
stored value that no longer fits (the window is smaller now), and its non-finite fallback
handles a value that was corrupted in storage.

```tsx
import { useEffect, useState } from 'react';
import { BottomSheet, defaultBottomSheetHeight } from '@openzeppelin/ui-components';

const STORAGE_KEY = 'preview-sheet-height';

function readStoredHeight(): number | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw == null ? null : Number(raw); // may be NaN; the sheet handles that
  } catch {
    return null;
  }
}

export function usePersistedSheetHeight(): [number, (h: number) => void] {
  const [height, setHeight] = useState(
    () => readStoredHeight() ?? defaultBottomSheetHeight(window.innerHeight)
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(height));
    } catch {
      // storage unavailable; the in-memory value still drives the sheet
    }
  }, [height]);

  return [height, setHeight];
}

export function PersistentPreview({ open, onOpenChange, children }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const [height, setHeight] = usePersistedSheetHeight();

  return (
    <BottomSheet
      aria-label="Generated project preview"
      open={open}
      onOpenChange={onOpenChange}
      height={height}
      onHeightChange={setHeight}
    >
      {children}
    </BottomSheet>
  );
}
```

What to notice:

- **Store exactly what the callback gives you.** If the stored `900` no longer fits a
  `700px` window, the sheet renders `700` and calls `onHeightChange(700)`; the effect
  writes `700` back. State, storage, and screen agree. Had the host kept the `900`
  "for later", the next drag would start from a height the user never saw.
- **`Number('garbage')` is `NaN`, and that is fine.** The sheet replaces a non-finite
  `height` with `defaultBottomSheetHeight(viewport)`, reports it, and the effect
  overwrites the bad storage entry. In development you also get one `console.warn`
  naming the bad value.
- **Persist the value, not a viewport fraction.** The sheet speaks pixels. If you want
  "60% of whatever the window is" on every open, do not persist at all — seed with
  `defaultBottomSheetHeight` each mount.

## Pattern 3: Guard the content with an error boundary

The sheet does not catch errors from its children. A render throw inside the sheet
propagates to the nearest boundary above the `BottomSheet` element in *your* tree; with
no boundary, React unmounts the whole app. Put a boundary inside the sheet so the sheet,
its close button, and the rest of the page survive a failing preview.

```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { BottomSheet } from '@openzeppelin/ui-components';

class PreviewBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('preview failed', error, info.componentStack);
  }

  render() {
    return this.state.failed ? (
      <p role="alert" className="p-4 text-sm text-destructive">
        The preview could not be rendered. Your form is unaffected.
      </p>
    ) : (
      this.props.children
    );
  }
}

export function GuardedPreview(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  height: number;
  onHeightChange: (height: number) => void;
  children: ReactNode;
}) {
  const { children, ...sheet } = props;
  return (
    <BottomSheet aria-label="Generated project preview" {...sheet}>
      <PreviewBoundary>{children}</PreviewBoundary>
    </BottomSheet>
  );
}
```

What to notice:

- **The boundary is inside the sheet.** A boundary *around* the sheet would also catch
  the error, but its fallback would replace the sheet, close button included, and the
  user would have no way to dismiss it. Inside, the chrome stays and the fallback fills
  the content area.
- **Boundaries reset on remount.** Because `open={false}` unmounts the children, closing
  and reopening the sheet gives the preview a fresh attempt. That is usually the recovery
  you want.
- **The spread is safe here** because `sheet` is a plain object with known keys. Do not
  spread an untyped bag of attributes into `BottomSheet`; see
  [Common mistakes](#common-mistakes).

## Pattern 4: Header beside the close button

The sheet's own chrome is a resize handle and a close button, each with a 44px hit area.
The row that holds the close button is otherwise empty; `header` lets you use it. The
content renders outside the scrolling body, so it stays visible while the body scrolls,
and the row grows to fit whatever you pass.

```tsx
import { BottomSheet, Banner } from '@openzeppelin/ui-components';

export function PreviewWithHeader(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  height: number;
  onHeightChange: (height: number) => void;
  selectedPath: string;
  placeholderKeys: readonly string[];
  children: React.ReactNode;
}) {
  const { selectedPath, placeholderKeys, children, ...sheet } = props;

  return (
    <BottomSheet
      aria-label="Generated project preview"
      {...sheet}
      header={
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="truncate font-mono text-sm">{selectedPath}</span>
          {placeholderKeys.length > 0 ? (
            <Banner variant="info" dismissible={false} className="min-w-0 flex-1 px-3 py-1.5">
              Preview placeholders (not in your draft): {placeholderKeys.join(', ')}
            </Banner>
          ) : null}
        </div>
      }
    >
      {children}
    </BottomSheet>
  );
}
```

What to notice:

- **`header` is optional and inert when absent.** `undefined`, `null`, or `false` render
  the plain close-button row, byte-for-byte the same as before the prop existed.
- **You own the typography.** The kit centres single-line content against the button and
  lets taller content grow the row; it applies no font, colour, or spacing of its own.
  `min-w-0` on your wrapper is what lets long paths truncate instead of pushing the
  close button off the row.
- **The close button is never covered.** It sits after the header in the same flex row
  and keeps its 44px target and accessible name. Do not absolutely-position header
  content over it.
- **It is not the region's accessible name.** `header` is visual. Keep `aria-label` (or
  point `aria-labelledby` at an element with an `id` you render inside `header`).

## Pattern 5: Inset layout — shrink the page instead of covering it

An overlay sheet is right when the page behind is mostly reference material. When the
page is a form the user is still filling in — the wizard case — a sheet that covers the
bottom third hides fields and primary buttons, and the user closes the preview to reach
them. `layout="inset"` fixes that without the sheet knowing anything about your layout:
while open it publishes its rendered height, and your shell reserves the space.

```tsx
// App shell — subtract the inset from every viewport-height container.
export function AppShell({ sidebar, children }: { sidebar: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex h-[calc(100dvh-var(--bottom-sheet-inset,0px))] overflow-hidden transition-[height] duration-200 ease-out motion-reduce:transition-none [html[data-bottom-sheet-inset=resizing]_&]:transition-none">
      <aside className="w-64 shrink-0 overflow-y-auto">{sidebar}</aside>
      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

// Anywhere below: the sheet, in inset mode.
<BottomSheet aria-label="Generated project preview" layout="inset" {...sheet}>
  {preview}
</BottomSheet>
```

What to notice:

- **The sheet is unchanged.** It still portals, still sits at `z-40`, still resizes the
  same way. `inset` only adds two side effects on `<html>`: the `--bottom-sheet-inset`
  custom property (the clamped pixel height, e.g. `480px`) and a
  `data-bottom-sheet-inset` attribute. Both go away on close or unmount.
- **Use `var(--bottom-sheet-inset, 0px)` with the fallback.** When the sheet is closed
  the property is absent, and the fallback keeps the container full-height.
- **Apply it to every fixed-height column** — sidebar and content alike — or one of them
  keeps rendering under the sheet.
- **Drag resize is live.** The property updates on every reported height, so the layout
  follows the handle.
- **Animate the height to match the slide.** The sheet slides over 200ms; give your
  container `transition-[height] duration-200 ease-out` so it eases at the same rate
  instead of jumping. Suspend that transition while the user drags — the attribute
  reads `resizing` then — so the layout tracks the handle 1:1:
  `[html[data-bottom-sheet-inset=resizing]_&]:transition-none`. Add
  `motion-reduce:transition-none` alongside.
- **One inset sheet at a time.** Two mounted `inset` sheets would overwrite each other.
- **Normal-flow pages** can instead style `html[data-bottom-sheet-inset] body { padding-bottom: var(--bottom-sheet-inset) }`.

## When to use Dialog instead

| You need… | Use |
|---|---|
| The user to finish one thing before touching anything else | `Dialog` |
| Focus moved into the overlay on open and returned on close | `Dialog` |
| Escape and outside-click to dismiss from anywhere | `Dialog` |
| The page behind to stay editable while the overlay is up | `BottomSheet` |
| A user-resizable panel that remembers its size | `BottomSheet` |
| A preview that updates as the user types in the page behind | `BottomSheet` |

They compose: a `Dialog` opened from inside an open sheet paints above the sheet (`z-50`
over `z-40`), traps focus as usual, and returns focus into the sheet on close. Do not try
to make one component do both jobs.

## Common mistakes

- **Expecting it to close on outside click.**
  It never does. Add a visible close affordance — the built-in button is one; your
  trigger toggling `open` is a natural second — and let Escape from inside do the rest.
  Outside-click dismiss was left out because the page behind is *meant* to be clicked.

- **Expecting focus to move into the sheet on open.**
  It does not, on purpose: the user who clicked "View code" while filling a field keeps
  their caret. If a specific flow needs focus in the sheet, call `.focus()` on an element
  inside it from your own effect after `open` becomes `true`. Query it in that effect,
  not in the click handler that set `open`: the region is portalled in after layout
  effects run.

- **Seeding `height` with `0` (or reading `window` on the server).**
  `0` clamps to the 160px floor and the sheet reports `160`; you get a short sheet, not
  the 60% default. Seed with `defaultBottomSheetHeight(window.innerHeight)` on the
  client, or a finite placeholder plus a mount effect under SSR
  ([README § Server rendering](./README.md#server-rendering)).

- **Keeping an unclamped copy of the height.**
  Store what `onHeightChange` gives you and nothing else. Two sources of truth diverge
  the first time the window shrinks.

- **Ignoring `onHeightChange`.**
  The handle drags, the sheet does not move, and nothing errors. That is the controlled
  contract — the same as a `<input value>` with no `onChange`. Wire the callback to state.

- **Passing both `aria-label` and `aria-labelledby`, or neither.**
  Type error by design. Pick one. At runtime a blank string counts as missing and logs a
  `console.error` in development.

- **Spreading an untyped attribute bag into the sheet.**
  `<BottomSheet {...props}>` where `props` is `Record<string, unknown>` or a loose DOM
  attributes type defeats the exactly-one-name check and can pass both names at once.
  Spread only objects whose type is `BottomSheetProps` or a known subset.

- **Leaving `aria-controls` on the trigger while closed.**
  The region is unmounted, so the id points at nothing. Use
  `aria-controls={open ? id : undefined}`.

- **Wrapping the sheet in `Dialog`, adding `aria-modal`, or applying `inert` to the page.**
  Each of these re-creates the modal behaviour the component was built to avoid, and
  none of them are supported combinations. If you want modality, use `Dialog` directly.

- **Looking for `minHeight` / `maxHeight` / `defaultOpen` / `snapPoints`.**
  Not props. Bounds are 160px to viewport, kit-owned. Open and height are controlled.
  There are no snap points and no swipe-to-dismiss.

- **Using `className` to reposition or size the sheet.**
  `className` is merged before the kit's classes, so `bottom-0`, `inset-x-0`, `z-40`,
  and the inline `height` win. Use it for padding, colours, and borders. Size through
  `height`; the sheet is always full-width and bottom-anchored.

- **Rendering the sheet inside a transformed or `overflow: hidden` ancestor and
  wondering why that does not matter.**
  It portals to `document.body`, so ancestor layout never clips it. That also means
  ancestor CSS variables and `position: relative` contexts do not apply. Only React
  context flows through.

- **Page behind is unclickable.**
  The consuming app's Tailwind build is not scanning `@openzeppelin/ui-components`, so
  the layer's `pointer-events-none` class has no CSS. Run `oz-ui-dev tailwind doctor`
  (see the package README).
