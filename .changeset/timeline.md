---
'@openzeppelin/ui-components': minor
---

Add `Timeline`: ordered steps with a tone each (`pending`, `active`, `success`, `failure`) for deploy or job progress. Tone is shown by an icon and exposed as status text, not colour alone; the list is an `ol` and the active step is marked `aria-current="step"`. Updating one item's tone does not remount the others when items carry stable keys.
