---
'@openzeppelin/ui-types': minor
'@openzeppelin/ui-renderer': minor
---

Add opt-in ENS name resolution to the AddressBookWidget. A new optional `enableNameResolution` flag (default `false`) gates both the Add-alias dialog's ENS-aware address field (auto-suggest alias from the resolved name) and per-row reverse-ENS display. When the flag is off, neither the dialog seam nor any row reverse-resolution provider mounts — no resolution calls and no `WalletStateProvider` required (backward-compatible default). When the flag is on without a wallet provider, resolution degrades gracefully (unsupported-network / hex fallback) rather than throwing. Existing manual-alias flows, search, and export/import (no auto re-resolution on import) are unchanged.
