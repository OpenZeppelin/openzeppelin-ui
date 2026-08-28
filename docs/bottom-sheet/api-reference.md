# BottomSheet — API Reference

Everything this feature exports from the main entry of `@openzeppelin/ui-components`.
There are seven public members: one component, one function, three types, and two string constants. Nothing else
about the sheet — its clamp internals, resize hook, separator, or portal layer — is
public.

```ts
import {
  BottomSheet,
  BOTTOM_SHEET_INSET_ATTRIBUTE,
  BOTTOM_SHEET_INSET_PROPERTY,
  defaultBottomSheetHeight,
  type BottomSheetLayout,
  type BottomSheetProps,
  type BottomSheetHeightPx,
} from '@openzeppelin/ui-components';
```

- [`BottomSheet`](#bottomsheet) — the component
- [`BottomSheetProps`](#bottomsheetprops) — its props
- [`defaultBottomSheetHeight`](#defaultbottomsheetheight) — seeds a host's height state
- [`BottomSheetHeightPx`](#bottomsheetheightpx) — the pixel-height alias
- [Height rules](#height-rules) — how a `height` prop becomes a rendered height
- [Keyboard and pointer](#keyboard-and-pointer) — what the built-in controls do
- [Rendered DOM](#rendered-dom) — what the component puts on the page

---

## `BottomSheet`

```ts
const BottomSheet: React.ForwardRefExoticComponent<
  BottomSheetProps & React.RefAttributes<HTMLElement>
>;
```

A controlled, non-modal, resizable region anchored to the bottom of the viewport.
Rendered through a portal into `document.body` while `open` is `true`; renders nothing
while `open` is `false`.

Synchronous React component; no Promise anywhere in the surface.

### Props (`BottomSheetProps`)

```ts
type BottomSheetProps = (
  | { 'aria-label': string; 'aria-labelledby'?: undefined }
  | { 'aria-labelledby': string; 'aria-label'?: undefined }
) & {
  children: React.ReactNode;
  className?: string;
  id?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  height: BottomSheetHeightPx;
  onHeightChange: (height: BottomSheetHeightPx) => void;
  /** Accessible name of the close control. Default `'Close'`. */
  closeLabel?: string;
  /** Optional content rendered beside the close button, above the scrolling body. */
  header?: React.ReactNode;
  /** Overlay the page (default) or publish the height so the host can inset its layout. */
  layout?: 'overlay' | 'inset';
};
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `aria-label` / `aria-labelledby` | `string` | exactly one | Accessible name of the region. Passing both, or neither, is a type error. At runtime a blank string counts as missing. |
| `children` | `React.ReactNode` | yes | Content of the sheet, rendered inside a scrolling container below the resize handle and the close-button row. Opaque to the component. |
| `open` | `boolean` | yes | Whether the sheet is rendered. `false` unmounts the region entirely, including its children. |
| `onOpenChange` | `(open: boolean) => void` | yes | Called with `false` when the user activates the close button or presses Escape with focus inside the sheet. Never called with `true`. The latest function you pass is always the one invoked. |
| `height` | `BottomSheetHeightPx` | yes | Requested height in CSS pixels. The rendered height is the clamped value; see [Height rules](#height-rules). |
| `onHeightChange` | `(height: BottomSheetHeightPx) => void` | yes | Called with the clamped pixel height the sheet wants to render, after a drag, a keyboard resize, a viewport resize, or a `height` prop that had to be clamped or replaced. Store the argument as your new `height`. The latest function you pass is always the one invoked. |
| `id` | `string` | no | `id` of the region element. Generated with `useId` when omitted or blank. Use it as the target of your trigger's `aria-controls`. |
| `className` | `string` | no | Merged onto the region element with the kit's `cn()` helper, **before** the component's own classes, so the kit's positioning, height, stacking, and `pointer-events` classes win on conflict. Use it for surface styling (padding, background, border colour), not for geometry. |
| `closeLabel` | `string` | no | Accessible name of the close button. Defaults to `"Close"`; a blank string also falls back to `"Close"`. Localise here. |
| `layout` | `'overlay' \| 'inset'` | no | `'overlay'` (default): the sheet floats over the page and nothing else moves. `'inset'`: while open, the sheet also writes its **rendered** height to the CSS custom property `--bottom-sheet-inset` on `<html>` and sets `data-bottom-sheet-inset` (value `"resizing"` while the handle is being dragged, otherwise `""`); both are removed on close or unmount. The sheet itself renders identically in both modes — the host decides what to do with the value, typically `height: calc(100dvh - var(--bottom-sheet-inset, 0px))` on its viewport-height containers so form content and sidebars shrink instead of being covered. Mount at most one `inset` sheet at a time; two would overwrite each other's value. Exported as `BottomSheetLayout`, with the property/attribute names as `BOTTOM_SHEET_INSET_PROPERTY` / `BOTTOM_SHEET_INSET_ATTRIBUTE`. |
| `header` | `React.ReactNode` | no | Content for the row that holds the close button — a title, the selected file's path, a status notice. It renders **outside** the scrolling children container, so it stays put while the body scrolls, and the row grows to fit it (single-line content is vertically centred against the 44px close button). `null`, `false`, and `undefined` all mean "no header": the row then renders exactly as it does without the prop. The kit applies no typography; bring your own. |

There is no `defaultOpen`, `defaultHeight`, `minHeight`, `maxHeight`, `container`,
`onEscapeKeyDown`, `onPointerDownOutside`, or `modal` prop. The absence is by design, not
an omission awaiting a PR: the sheet is controlled-only, its bounds are kit-owned, and it
is never modal.

### Ref

`ref` attaches to the region element — the `<section>` that carries `id`, the accessible
name, and `className`. It is `null` while `open` is `false`. Use it to measure or scroll
into view; there is no imperative API.

### Behaviour

- **`open` is the only visibility authority.** Nothing the sheet does changes visibility
  on its own. Close button and Escape ask via `onOpenChange(false)`; if you do not
  update `open`, the sheet stays.
- **Slides in and out, and eases height changes.** On open the region mounts in its
  hidden position and slides up over 200ms (`BOTTOM_SHEET_TRANSITION_MS`); on close it
  slides down and is removed from the DOM after the same 200ms. A programmatic `height`
  change (e.g. a maximize toggle) or a keyboard resize eases over the same 200ms; during
  a pointer drag the transition is suspended so the sheet tracks the handle exactly. While exiting it carries `data-state="closed"` and
  `pointer-events: none`, so nothing inside it can be clicked. `prefers-reduced-motion`
  disables the transition (the region still lingers 200ms). Anything you tie to
  `open` — `aria-controls`, the inset property — flips immediately, not after the slide.
- **Appears after effects, not during render.** The sheet needs a mounted document and a
  measured viewport before it can portal and clamp, so it measures in a layout effect and
  the region lands in the DOM when that effect's update commits — before the browser
  paints, and within the same `act()` in tests. Code that reads the DOM synchronously
  inside the very same event handler that set `open` will not see it yet; read it from
  an effect.
- **Never moves focus.** Opening leaves `document.activeElement` untouched. Closing does
  not restore focus anywhere — if focus was inside the sheet, the browser drops it to
  `body`; return it to your trigger yourself if your product wants that.
- **Never locks the page.** No `inert`, no `aria-hidden` on siblings, no body
  `overflow` change, no focus trap. Pointer and keyboard reach the page around the sheet.
- **Escape is scoped.** Handled only when the keydown bubbles to the region from inside
  it and `event.defaultPrevented` is `false`. A child that calls `preventDefault()` on
  Escape (a nested menu, say) keeps the sheet open.
- **Outside pointer does nothing.** There is no outside-click or outside-focus handling.
- **Height is reported, not stored.** The sheet holds no height state. Drag and keyboard
  compute a clamped proposal and hand it to `onHeightChange`; the sheet moves when your
  `height` prop changes. A host that ignores the callback sees a sheet that does not
  resize — that is the controlled contract, not a bug.
- **Corrections are reported once per distinct situation.** The sheet remembers the last
  `(incoming height, rendered height)` pair it reported and does not re-report it. This
  is what stops an uncooperative host from producing a callback loop, and what lets a
  later viewport change with the same out-of-range prop still be reported.
- **Closing or unmounting mid-drag ends the drag.** Pointer capture is released and no
  further `onHeightChange` calls are made for that gesture.
- **Instances are isolated.** Each sheet has its own id, listeners, and correction
  memory. Two sheets never share state.
- **Rendering errors propagate.** There is no internal error boundary.
- **Development diagnostics only.** Name problems (kit `logger.error`) and non-finite
  heights (kit `logger.warn`) are reported once per distinct value in development builds
  and never in production. The component never throws for any prop combination.

---

## `defaultBottomSheetHeight`

```ts
function defaultBottomSheetHeight(
  viewportHeightPx: number,
  options?: { ratio?: number }
): BottomSheetHeightPx;
```

Returns the height a freshly opened sheet should have for a viewport of the given
height: `ratio` × viewport (default `BOTTOM_SHEET_DEFAULT_HEIGHT_RATIO`, 0.6), then
clamped by the same rules the component applies. Pure, synchronous, no DOM access. Call
it with `window.innerHeight` to seed your `height` state; pass `{ ratio: 0.5 }` for a
half-height default. A `ratio` outside `(0, 1]` or non-finite falls back to 0.6.

| `viewportHeightPx` | Returns | Why |
|---|---|---|
| `1000` | `600` | `0.6 × 1000`, inside `[160, 1000]`. |
| `200` | `160` | `0.6 × 200 = 120` is below the 160px floor. |
| `100` | `100` | Viewport is shorter than the floor; the floor yields and the viewport wins (`0.6 × 100 = 60` is raised to `min(160, 100) = 100`). |
| `0` | `0` | Degenerate viewport. Do not seed with this; see [Server rendering](./README.md#server-rendering). |
| `NaN`, `Infinity`, `-Infinity`, negative | `0` | Invalid viewport normalises to `0` so the function is total. |

The 160px floor and the viewport ceiling are kit constants and are not configurable. The
default ratio is exported as `BOTTOM_SHEET_DEFAULT_HEIGHT_RATIO` and can be overridden
per call through `options.ratio`; the options type is `DefaultBottomSheetHeightOptions`.

---

## `BottomSheetHeightPx`

```ts
type BottomSheetHeightPx = number;
```

A documenting alias for "a height in CSS pixels". It is not branded: any `number` is
assignable, and the component performs no unit checking. It exists so that `height`,
`onHeightChange`, and `defaultBottomSheetHeight` read as the same quantity in your code.

---

## Height rules

Every height the sheet renders passes through one clamp. The rules below describe that
clamp from the outside; they apply identically to the `height` prop, to drag, to
keyboard resize, to viewport resize, and to `defaultBottomSheetHeight`.

1. **Bounds.** For a viewport `V` pixels tall, the rendered height is in
   `[min(160, V), V]`. The floor is 160px when the viewport allows it.
2. **Viewport wins.** When `V < 160` the range is `[V, V]`: the sheet is exactly as tall
   as the viewport.
3. **Clamp-and-report.** If clamping changes your `height`, `onHeightChange(clamped)` is
   called after commit (never during render). Store it.
4. **Non-finite fallback.** A `height` of `NaN`, `Infinity`, or `-Infinity` is not
   clamped; it is replaced by `defaultBottomSheetHeight(V)`, which is then reported. A
   kit `logger.warn` fires once per distinct offending value in development.
5. **Viewport resize while open** re-clamps and reports if the rendered height changed.
   The listener exists only while `open` is `true`.
6. **Reported once per pair.** The same `(incoming, clamped)` pair is never reported
   twice in a row. A host that stores the reported value trivially satisfies this; a host
   that does not simply stops hearing about that pair.

---

## Keyboard and pointer

The sheet has two built-in controls. Both are in the tab order, both have visible focus
rings, both meet a 44px hit target.

**Resize handle** — a `role="separator"` element at the top edge, accessible name
`"Resize"`, `aria-orientation="horizontal"`, `aria-controls` pointing at the region,
`aria-valuemin` / `aria-valuenow` / `aria-valuemax` reflecting the live clamp bounds and
rendered height.

| Input | Effect |
|---|---|
| Pointer drag (primary button / primary touch) | Height follows the pointer: moving up grows, moving down shrinks. The pointer is captured on the handle for the duration, so the drag continues even when the pointer leaves the handle. Each move proposes a clamped height through `onHeightChange`. |
| Secondary mouse button, non-primary touch | Ignored. |
| `ArrowUp` | Propose `rendered + 16`, clamped. |
| `ArrowDown` | Propose `rendered − 16`, clamped. |
| `Home` | Propose the floor. |
| `End` | Propose the ceiling (viewport height). |
| `Enter`, `Space`, other keys | No effect. The handle does not collapse or toggle. |

**Close button** — a native `<button type="button">` with an `X` icon and accessible
name `closeLabel` (default `"Close"`). Activating it calls `onOpenChange(false)`.

**Escape** anywhere inside the region (not only on the controls) calls
`onOpenChange(false)` unless a child already `preventDefault()`ed the keydown.

---

## Rendered DOM

While `open` is `true`, the following is appended to `document.body`:

```html
<div data-slot="bottom-sheet-layer" class="pointer-events-none fixed inset-0 z-40">
  <section
    id="…"
    aria-label="Generated project preview"
    data-slot="bottom-sheet"
    data-state="open"
    class="{className} pointer-events-auto absolute inset-x-0 bottom-0 z-40 flex flex-col overflow-hidden border-t-2 border-border bg-background shadow-lg transition-[translate,opacity,height] duration-200 ease-out motion-reduce:transition-none translate-y-0 opacity-100"
    style="height: 600px"
  >
    <div data-slot="bottom-sheet-separator" role="separator" tabindex="0" aria-label="Resize"
         aria-orientation="horizontal" aria-controls="…"
         aria-valuemin="160" aria-valuenow="600" aria-valuemax="1000" class="min-h-11 cursor-ns-resize touch-none …">
      <div aria-hidden="true" class="flex flex-col gap-1">
        <div class="h-0.5 w-12 rounded-full bg-muted-foreground/30"></div>
        <div class="h-0.5 w-12 rounded-full bg-muted-foreground/30"></div>
      </div>
    </div>
    <div class="flex shrink-0 justify-end px-2">
      <button type="button" data-slot="bottom-sheet-close" aria-label="Close" class="size-11 …">
        <svg aria-hidden="true" …/>
      </button>
    </div>
    <!-- with `header`, the row above becomes: -->
    <div class="flex shrink-0 items-start gap-2 pr-2 pl-4">
      <div data-slot="bottom-sheet-header" class="flex min-h-11 min-w-0 flex-1 items-center py-1">{header}</div>
      <button type="button" data-slot="bottom-sheet-close" aria-label="Close" class="size-11 …">…</button>
    </div>
    <div class="min-h-0 flex-1 overflow-auto">
      {children}
    </div>
  </section>
</div>
```

- The **layer** covers the viewport but has `pointer-events: none`, so it is invisible to
  hit-testing: clicks land on your page.
- The **`<section>`** is the region. With an accessible name it has the implicit
  `region` role, which is what assistive technology announces. It carries `ref`, `id`,
  `className`, the inline `height`, and `pointer-events: auto`. It has no `role="dialog"`
  and no `aria-modal`.
- The **children container** scrolls internally (`overflow: auto`) and shrinks to fit
  (`min-h-0 flex-1`), so tall content scrolls inside the sheet rather than growing it.
- **`data-slot="bottom-sheet"` on the region is a stable hook** for styling and tests; it
  is the same element the forwarded `ref` reaches. The `bottom-sheet-layer`,
  `bottom-sheet-separator`, `bottom-sheet-close`, and `bottom-sheet-header` slots, and
  the element structure inside the region, are internal: they may change without a major version, so do not
  style or select against them.
