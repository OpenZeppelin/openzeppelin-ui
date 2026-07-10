---
"@openzeppelin/ui-types": minor
"@openzeppelin/ui-renderer": minor
---

Add opt-in ENS name resolution to the AddressBookWidget. A new optional `enableNameResolution` flag (default `false`, fully backward-compatible) swaps the Add-alias dialog's address input to the ENS-resolving field, auto-suggests a user-overridable alias from the resolved name, and renders rows via the reverse-ENS display. When the flag is off, the widget is byte-identical to before and needs no `WalletStateProvider`. Existing manual-alias flows, search, and export/import (no auto re-resolution on import) are unchanged.
