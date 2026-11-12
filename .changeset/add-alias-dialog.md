---
'@openzeppelin/ui-renderer': patch
---

`AddAliasDialog`: the network selector is now named by its "Network" label, so screen readers announce it, and adding an alias with name resolution on no longer logs React's "Cannot update a component while rendering a different component" warning.

Behaviour change: the selector's trigger gains that accessible name.
