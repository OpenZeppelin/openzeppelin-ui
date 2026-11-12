---
'@openzeppelin/ui-components': minor
---

`RadioGroup`: two new variants. Radio semantics and keyboard behaviour are the same as the default circle presentation, which is unchanged.

- `variant="card"` shows each `RadioGroupItem` as a selectable card with a `title` and a supporting `description`. The title is the item's accessible name and the description its accessible description.
- `variant="segmented"` renders a single-row segmented control for two or three short options, such as Automatic / Manual. Each item's children are its label. Segments share the width equally and truncate rather than wrap.
