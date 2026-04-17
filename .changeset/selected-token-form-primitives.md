---
"@openzeppelin/ui-components": patch
---

Adopt `--selected` token in form primitives and selection surfaces

Follow-up to the `--selected` / `--selected-foreground` token introduction. Migrates the remaining
components whose selection/active semantics were expressed via `primary`, `accent`, or hard-coded
Tailwind palette literals onto the new `selected` token, so every selection cue in the library
now shares a single upstream source of truth.

- `Checkbox`: the `data-[state=checked]` box (background, foreground, and border) switches from
  `primary` to `selected`. Focus-visible ring is left on the existing `ring` token since it is a
  focus affordance, not a selection affordance.
- `RadioGroup` (primitive): the indicator's `text-primary` — which colors the filled `Circle` via
  `text-current` — switches to `text-selected`.
- `Tabs`: the active `TabsTrigger`'s label color switches from `text-foreground` to
  `text-selected`, giving the raised pill a subtle selection accent while preserving the existing
  Shadcn pill design.
- `Calendar`: the selected day, the range-middle bar, and the `day` wrapper cell's
  `[&:has([aria-selected])]` backgrounds switch from `bg-accent`/`bg-zinc-200`/`bg-zinc-700`
  literals to `bg-selected` (solid for the selected day) and `bg-selected/15` /
  `bg-selected/10` (for the range-middle fill and the aria-selected-outside-day fill). The
  `today` highlight is intentionally left on `bg-accent text-accent-foreground` because today is
  a distinct semantic from selection.
- `DateRangePicker`: inherits all of its day styling from `Calendar`, so the migration flows
  through without any direct change.
- `NetworkSelector`: the multi-select row's tick box previously rendered an identical
  `border border-primary` square whether checked or not (relying solely on the presence of the
  `Check` glyph as a cue). It now mirrors the updated `Checkbox` primitive:
  `border-selected bg-selected text-selected-foreground` when selected,
  `border-input bg-background` otherwise. The single-select row's trailing `Check` glyph is
  tinted `text-selected` so the selection cue is consistent across the selector.

No public API changes; purely visual.
