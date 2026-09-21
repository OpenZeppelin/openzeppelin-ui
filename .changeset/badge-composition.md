---
'@openzeppelin/ui-components': minor
---

Extend `Badge` with additive composition for Role Manager–parity chips: `variant="solid"` (opaque semantic fills on the existing `BadgeTone` set), `onActivate` (renders a native `<button type="button">`; omitted host stays a non-interactive `<span>`), `forwardRef` plus rest-prop spreading so overlay triggers can wrap the chip with `asChild`, and optional `iconLabel` (visually hidden name; the graphic stays `aria-hidden`). Filled and outline stay the tinted/outlined defaults. There is no `Badge asChild`, polymorphic `as`, children label, or size prop.
