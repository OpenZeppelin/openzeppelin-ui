---
"@openzeppelin/ui-components": minor
---

Add `showTooltip`, `variant`, and `untruncateOnHover` props to AddressDisplay

- `showTooltip` shows the full address in a tooltip on hover when truncated.
- `variant` accepts `"chip"` (default) or `"inline"` for use inside existing
  styled containers like wallet bars.
- `untruncateOnHover` reveals the full address inline on hover (desktop) or
  tap (touch devices).
- Fix TooltipContent to render inside a Portal, preventing layout shifts.
