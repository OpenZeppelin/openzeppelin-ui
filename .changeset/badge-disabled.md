---
'@openzeppelin/ui-components': minor
---

`Badge`: new optional `disabled` for an interactive badge (one with `onActivate`). The button gets the native `disabled` attribute, leaves the tab order, never calls `onActivate`, and dims like a disabled `Button`; `aria-pressed` is still exposed on a toggle chip. A static badge ignores it.

`Badge`: new optional `readOnly` for an interactive badge. The button stays focusable and in full colour, keeps `aria-pressed`, and ignores click, Enter and Space so `onActivate` never fires. Read-only is announced with a visually hidden "Read-only" description referenced by `aria-describedby` (not `aria-readonly` or `aria-disabled`). `disabled` wins when both are set. A static badge ignores it.
