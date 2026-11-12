---
'@openzeppelin/ui-components': patch
---

`MapField` now notices validation errors on an entry's key or value and shows the map's required message for them. They used to go unnoticed, so the map showed no error while a row was invalid. A `MapField` with a dotted `name`, such as a map inside a struct in a renderer form, no longer re-renders without end when it shows an error. Behaviour change: a required map whose key or value has an error now shows its required text.
