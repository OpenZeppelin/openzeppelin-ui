# BottomSheet

> A non-modal, resizable panel anchored to the bottom of the viewport. The page behind
> it stays fully usable: focus does not move, the tab cycle is not trapped, scrolling is
> not locked, and clicking outside does nothing.

## Overview

`BottomSheet` puts a labelled region over the bottom of the page, above your content and
below any open dialog, and lets the user drag or key its height. It exists for the case
where a form and a live preview of that form's output need to be on screen and
interactive at the same time — the RWA Wizard's generated-code drawer is the first
consumer. You own everything that changes: whether it is open, how tall it is, and what
is inside.

**It is not a dialog, and that is the point.** If you want the user's attention held on
one task — confirm, choose, fill in a required field — use the kit's `Dialog`, which
traps focus, locks the page, and closes on outside click. `BottomSheet` deliberately does
none of those things, so reaching for it with dialog expectations produces a component
that feels broken. The two stack correctly: a `Dialog` opened while the sheet is up
paints above it.

The single most important integration point is the pair of controlled props:
`open`/`onOpenChange` and `height`/`onHeightChange`. All four are required. There is no
uncontrolled mode.

## Quick Start

```bash
pnpm add @openzeppelin/ui-components
```

`BottomSheet` ships on the package's main entry. Nothing extra to install.

```tsx
import { useState } from 'react';
import { BottomSheet, Button, defaultBottomSheetHeight } from '@openzeppelin/ui-components';

export function PreviewDrawer({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [height, setHeight] = useState(() => defaultBottomSheetHeight(window.innerHeight));

  return (
    <>
      <Button
        aria-expanded={open}
        aria-controls={open ? 'code-preview' : undefined}
        onClick={() => setOpen(true)}
      >
        View code
      </Button>

      <BottomSheet
        id="code-preview"
        aria-label="Generated project preview"
        open={open}
        onOpenChange={setOpen}
        height={height}
        onHeightChange={setHeight}
      >
        {children}
      </BottomSheet>
    </>
  );
}
```

To put a title or notice beside the close button, add `header={<…/>}`; see
[integration-guide § Header beside the close button](./integration-guide.md#pattern-4-header-beside-the-close-button).

Four things that snippet does that every consumer must do:

- **Names the region.** Exactly one of `aria-label` or `aria-labelledby`. The type
  requires one; in development, a blank or doubled name logs a kit `logger.error`. The kit
  never invents a title.
- **Owns `open`.** The sheet calls `onOpenChange(false)` from its close button and from
  Escape pressed inside it. It never opens itself and never closes on outside click.
- **Owns `height` and stores what it is told.** `defaultBottomSheetHeight(window.innerHeight)`
  seeds roughly 60% of the viewport. From then on, the sheet calls `onHeightChange` with
  the clamped pixel value it actually rendered — after a drag, a keypress, a viewport
  resize, or an out-of-range prop — and you store that value verbatim.
- **Builds the trigger.** There is no trigger component. Wire `aria-expanded` yourself,
  and set `aria-controls` only while open — the region is not in the document when
  closed, so a permanent reference would point at nothing.

The snippet reads `window.innerHeight` in a `useState` initializer, which is fine in a
client-only app such as a Vite SPA. If your framework renders on the server, see
[Server rendering](#server-rendering).

## Key Concepts

**Non-modal, by construction.** The sheet is rendered through a portal into a
full-viewport layer that has `pointer-events: none`; only the sheet itself has
`pointer-events: auto`. That one CSS pair is the entire mechanism. There is no `inert`,
no `aria-hidden` on your app, no body scroll lock, no focus trap, and no document-level
listeners while idle. Opening the sheet while a text field is focused leaves the field
focused and typeable. Tab moves from your page into the sheet's controls and back out
as ordinary document order.

**Controlled only.** `open`, `onOpenChange`, `height`, and `onHeightChange` are all
required. There is no `defaultOpen`, no `defaultHeight`, and no way to hand the sheet
its own state. This is deliberate: the sheet's height is something products persist
across steps and reloads, and a second, internal copy of it would be a second thing to
keep in sync. Hosts that want a fresh start each mount simply seed with
`defaultBottomSheetHeight`.

**Clamp-and-report.** Whatever `height` you pass, the sheet renders a clamped value:
never shorter than 160px, never taller than the viewport. When the clamped value differs
from your prop, the sheet calls `onHeightChange` with the clamped value so your state
converges on what is on screen. Store the callback's argument. Do not keep an unclamped
copy alongside it — after a viewport shrink, the two would disagree and the next drag
would jump.

**Viewport wins.** On a viewport shorter than 160px the floor yields and the sheet is
clamped to the viewport height. A sheet taller than the window is worse than a sheet
shorter than its nominal minimum.

**Non-finite is invalid, not out of range.** `NaN`, `Infinity`, and `-Infinity` — the
typical result of a corrupted persisted value — are replaced by
`defaultBottomSheetHeight(viewport)`, reported through `onHeightChange`, and warned about
once in development. The fallback is the 60% default rather than the 160px floor because
the default is what a broken restore *meant*.

**The close-button row can carry your header.** Pass `header` to render a title, the
selected file's path, or a status notice beside the close button, above the scrolling
body. Without it the row holds only the button; with it the row grows to fit. This is
the place for content that must stay visible while the body scrolls.

**Overlay or inset — your call.** By default the sheet floats over the page. With
`layout="inset"` it also publishes its rendered height as `--bottom-sheet-inset` on
`<html>` while open, so an app shell can subtract it from its viewport-height
containers and keep the form and sidebar fully reachable above the sheet. See
[integration-guide § Inset layout](./integration-guide.md#pattern-5-inset-layout-shrink-the-page-instead-of-covering-it).

**Children are opaque.** The sheet renders whatever you pass inside a scrolling
container. It does not catch errors thrown by children; those propagate through the
portal to the nearest error boundary *above the `BottomSheet` element in your tree*. If
you have none, the throw takes down the app. Put a boundary around preview content
yourself, and put it inside the sheet if you want the sheet to survive.

## Server rendering

`BottomSheet` renders nothing until it has mounted in a browser and measured the
viewport, so the component itself is SSR-safe. The `height` seed is the part that needs
care: `window` is absent on the server, and seeding `0` is wrong — `0` clamps to the 160px
floor, the sheet reports 160, and your state converges on a short sheet instead of a
tall one.

Seed any finite placeholder on the server, then re-seed in a mount effect:

```tsx
const [height, setHeight] = useState(480); // any finite number; replaced on mount

useEffect(() => {
  setHeight(defaultBottomSheetHeight(window.innerHeight));
}, []);
```

Client-only apps can skip the effect and seed directly from `window.innerHeight`, as the
Quick Start does.

## API Reference

See [api-reference.md](./api-reference.md) for `BottomSheet`, `BottomSheetProps`,
`BottomSheetHeightPx`, and `defaultBottomSheetHeight`.

## Integration Guide

See [integration-guide.md](./integration-guide.md) for the form-plus-preview pattern,
persisting height across sessions, an error boundary around preview content, and the
common mistakes.

## Safety

- **Not a dialog.** No focus trap, no scroll lock, no outside-click dismiss, no
  `aria-modal`, no `role="dialog"`. Use `Dialog` for modal work. Do not wrap the sheet in
  a `Dialog`, set `aria-modal` on it, or apply `inert` to the page to fake modality.
- **Accessible name is on you.** Exactly one of `aria-label` / `aria-labelledby`. A
  missing, blank, or doubled name logs a kit `logger.error` in development and mounts an
  unnamed region in production. An `aria-labelledby` id that matches no element also
  logs; the attribute is left as-is.
- **Store the reported height.** `onHeightChange` delivers the clamped value that is on
  screen. Your `height` state should be exactly what the callback last gave you.
- **Trigger is yours.** Set `aria-expanded={open}` and `aria-controls={open ? id : undefined}`.
  The region is unmounted when closed.
- **Exceptions propagate.** Children that throw during render are not caught. Mount your
  own error boundary.
- **Dismissal is scoped.** Escape closes the sheet only when focus is inside it and the
  keypress was not already `defaultPrevented` by a child. Escape elsewhere on the page,
  and clicks anywhere outside, do nothing.
- **Instances are independent.** Two mounted sheets have distinct ids, heights, and
  listeners. Whether two should be open at once is a product decision the kit does not
  enforce.
- **Stacking.** The sheet paints at `z-40`; kit `Dialog` paints at `z-50` and covers it.
  Position your own fixed elements relative to those values.
- **Styling prerequisite.** Like every component in this package, `BottomSheet` is styled
  with Tailwind utility classes and expects the consuming app's Tailwind build to scan
  `@openzeppelin/ui-components` (see the package README's *Styling* section). Without
  that scan, the layer's `pointer-events: none` is not applied and the page behind the
  sheet becomes unclickable — the most visible symptom of a missing scan.

## License

AGPL-3.0, as the rest of `@openzeppelin/ui-components`.
