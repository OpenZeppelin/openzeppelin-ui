---
'@openzeppelin/ui-components': patch
---

`LoadingButton` keeps keyboard focus while loading. Before, a focused button lost focus to the page when `loading` turned on, because loading made it natively disabled.

Behaviour change: while `loading`, the button is no longer natively `disabled`. It stays focusable, sets `aria-disabled="true"` and `aria-busy="true"`, and ignores clicks, Enter, Space and implicit form submission: `onClick` is not called and the click's default action, such as submitting the form, is cancelled. Other handlers, such as `onKeyDown`, still run. A button with `disabled` is still natively disabled, with or without `loading`. Code that finds a loading button with `:disabled` or `toBeDisabled()` should check `[aria-busy="true"]` or `aria-disabled` instead.
