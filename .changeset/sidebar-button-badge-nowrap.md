---
'@openzeppelin/ui-components': patch
---

`SidebarButton`: a string badge no longer wraps onto a second line. Behaviour change: the badge stays on one line (`shrink-0 whitespace-nowrap`) while a long label truncates first; a badge wider than the sidebar may overflow rather than wrap.
