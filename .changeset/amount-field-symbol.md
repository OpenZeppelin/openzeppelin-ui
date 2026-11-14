---
'@openzeppelin/ui-components': patch
---

`AmountField`: the `symbol` now sits in the input's adornment slot, so the text is padded to fit the symbol instead of a fixed 32px and a long value never runs under it. This holds in default mode, exact-entry mode and with `groupedDisplay`. Fields without a `symbol` render as before.

Behaviour change: the symbol uses the theme's muted text colour (`text-muted-foreground`, which meets 4.5:1 contrast in light and dark) instead of `text-gray-500`, at the input's text size, and dims with the input on a disabled field. It is rendered as `<span id="{id}-symbol">`, and that id is now listed first in the input's `aria-describedby`, so screen readers announce the symbol with the value. CSS or tests that targeted the old `span.text-gray-500` next to the input should target `#{id}-symbol` instead. Switching `symbol` between empty and non-empty remounts the input, so a focused field loses focus; the value is kept.
