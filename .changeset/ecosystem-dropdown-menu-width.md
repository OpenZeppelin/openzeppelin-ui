---
'@openzeppelin/ui-components': patch
---

`EcosystemDropdown`: the menu now matches its trigger's width, as intended, and still keeps its 200px minimum. Before, the width class did not apply, so the menu only ever used the minimum.

Behaviour change: when the trigger is wider than 200px, the menu is now as wide as the trigger instead of 200px.
