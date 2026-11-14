---
'@openzeppelin/ui-components': minor
---

`WizardNavigation`: new optional `previousLabel`, `previousDisabled`, `primaryLoading` and `primaryIcon`. The paged `WizardLayout` variants accept them too. An empty `previousLabel` leaves Back icon-only, and screen readers still announce it as "Previous". A loading primary button shows the kit spinner, sets `aria-busy` and ignores clicks while keeping focus. A disabled Back button uses `aria-disabled` and stays focusable. The navigation handlers (`onPrevious`, `onNext`, `onCancel`, `onLastStepSecondary`) now receive the click event, so you can restore focus after an async step. Existing zero-argument handlers still compile, and without the new props the navigation renders as before.
