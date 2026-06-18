---
'@openzeppelin/ui-components': minor
---

`AddressListField`: default to single-address entry with address-book support via `AddressField`, and add an inline toggle for bulk paste mode. Only one entry mode is active at a time.

Adds two props:

- `defaultEntryMode` (`'single' | 'bulk'`, default `'single'`) — chooses the view shown on mount.
- `allowModeToggle` (`boolean`, default `true`) — set to `false` to hide the toggle and lock the field to `defaultEntryMode`.
