---
'@openzeppelin/ui-components': minor
---

Export `Spinner`, the loading spinner `LoadingButton` uses. It takes its colour from `currentColor` and its size from `className`. Pass `label` and it is announced as `role="status"` with that name; without `label` it is decorative and hidden from assistive tech. `LoadingButton` now renders this `Spinner`, so its spinner is hidden from assistive tech too.
