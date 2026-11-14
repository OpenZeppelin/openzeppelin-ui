---
'@openzeppelin/ui-components': minor
---

`RadioGroup`: two new variants. Radio semantics and keyboard behaviour are the same as the default circle presentation, which is unchanged.

- `variant="card"` shows each `RadioGroupItem` as a selectable card with a `title` and a supporting `description`. The title is the item's accessible name and the description its accessible description. In the dark theme, unchecked card borders and the radio ring meet WCAG AA non-text contrast. The title sits level with the radio, and a title can hold a chip such as a `Badge` without making its card taller; a long title wraps and the radio stays level with its first line.
- `variant="segmented"` renders a single-row segmented control for two or three short options, such as Automatic / Manual. Each item's children are its label. Segments share the width equally and truncate rather than wrap.
