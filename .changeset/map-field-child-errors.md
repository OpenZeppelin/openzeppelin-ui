---
'@openzeppelin/ui-components': patch
---

`MapField` now notices validation errors on an entry's key or value and shows the map's required message for them. They used to go unnoticed, so the map showed no error while a row was invalid. Behaviour change: a required map whose key or value has an error now shows its required text.
