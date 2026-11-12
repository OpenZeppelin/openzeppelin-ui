---
'@openzeppelin/ui-renderer': patch
---

`AddAliasDialog`: adding an alias with name resolution on no longer logs React's "Cannot update a component while rendering a different component" warning. The dialog now asks for the selected network's runtime in an effect instead of during render.
