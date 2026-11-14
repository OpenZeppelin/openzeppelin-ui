---
'@openzeppelin/ui-components': minor
---

`Input`: new optional `startAdornment` and `endAdornment` render an icon or short text inside the input's border, before or after the text. On that side the input's padding grows to the adornment's width plus the usual 12px inset and an 8px gap, so typed text never runs under it, and a click on the adornment focuses the input. Adornments add no accessible text by themselves: mark a decorative icon `aria-hidden`, or give text an id and list it in the input's `aria-describedby`. Without an adornment the input renders as before.
