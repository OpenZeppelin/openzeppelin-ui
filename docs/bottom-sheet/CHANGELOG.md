# Changelog — BottomSheet

## Unreleased (targets the next `@openzeppelin/ui-components` minor)

### Added

- `BottomSheet` on the main entry `@openzeppelin/ui-components`: a controlled,
  non-modal, drag- and keyboard-resizable region anchored to the bottom of the viewport.
- `defaultBottomSheetHeight(viewportHeightPx, { ratio? })` for seeding a host's height
  state at a share of the viewport (default 60%, `BOTTOM_SHEET_DEFAULT_HEIGHT_RATIO`),
  clamped.
- Types `BottomSheetProps` and `BottomSheetHeightPx`.
- Optional `header` prop: content rendered in the close-button row, outside the scrolling
  body. Absent, the row is unchanged.
- Enter/exit slide (200ms, `BOTTOM_SHEET_TRANSITION_MS`); the region lingers in the DOM,
  inert and `data-state="closed"`, for the exit. Height changes ease over the same
  200ms except during a pointer drag. Thicker top border (`border-t-2`).
- Optional `layout` prop (`'overlay'` default | `'inset'`). `inset` publishes the rendered
  height as `--bottom-sheet-inset` on `<html>` (plus `data-bottom-sheet-inset`, `"resizing"` during a drag) while open,
  so the host layout can shrink instead of being covered. Exported `BottomSheetLayout`,
  `BOTTOM_SHEET_INSET_PROPERTY`, `BOTTOM_SHEET_INSET_ATTRIBUTE`.
- An opt-in browser test script for kit contributors, `pnpm --filter
  @openzeppelin/ui-components test:browser` (Chromium via Playwright). The default `test`
  script is unchanged and stays in jsdom. No CI workflow runs the browser suite.

### Changed

- Nothing. `Dialog` and every other existing export are untouched. No new subpath, no new
  runtime dependency, no new peer.

### Migration Guide

- **Existing consumers:** no action.
- **New `BottomSheet` consumers:** it is controlled-only — supply `open`,
  `onOpenChange`, `height`, and `onHeightChange`, plus exactly one of `aria-label` /
  `aria-labelledby`. Seed `height` with `defaultBottomSheetHeight(window.innerHeight)`
  and store whatever `onHeightChange` reports. See the [README](./README.md).
- **Do not migrate `Dialog` callers.** `BottomSheet` is not a drop-in replacement for a
  non-modal `Dialog`; it has no focus management, no outside-click dismiss, and no
  uncontrolled mode. Dialog remains the right choice for modal work.
