---
'@openzeppelin/ui-components': patch
---

`SidebarButton`: a long string label now truncates on one line instead of wrapping, so the badge and `trailing` slot stay at the end of the row. Behaviour change: the row no longer wraps its content onto a second line. A non-string label shrinks but is not truncated for you.
