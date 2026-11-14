---
'@openzeppelin/ui-components': minor
---

Export `Spinner`, the loading spinner `LoadingButton` uses. It takes its colour from `currentColor` and its size from `className`. Pass `label` and the spinner is wrapped in a `role="status"` element named by the label, with the label as visually hidden text so screen readers have something to read; without `label` it is decorative and hidden from assistive tech. `LoadingButton` now renders this `Spinner`, so its spinner is hidden from assistive tech too.
