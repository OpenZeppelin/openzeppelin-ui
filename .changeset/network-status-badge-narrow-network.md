---
'@openzeppelin/ui-components': patch
---

`NetworkStatusBadge`: the `network` prop also accepts an object with only `ecosystem`, `name`, `type` and the optional `iconComponent`, so an app whose network object has no RPC URL can pass it. A full `NetworkConfig`, as a variable or an inline object, compiles as before.
