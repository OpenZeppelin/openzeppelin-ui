---
'@openzeppelin/ui-components': minor
---

Add `Timeline`: ordered steps with a tone each (`pending`, `active`, `success`, `warning`, `failure`) for deploy or job progress. Use `warning` for a step that is paused or stopped without failing. Tone is shown by an icon and exposed as status text, not colour alone. `statusLabel` replaces the default status text, and an empty `statusLabel` renders none. The list is an `ol` and the active step is marked `aria-current="step"`. Updating one item's tone does not remount the others when items carry stable keys.
