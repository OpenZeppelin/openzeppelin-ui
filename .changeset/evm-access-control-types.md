---
'@openzeppelin/ui-types': minor
---

Add EVM access control support to unified types

- Make `expirationBlock` optional in `PendingOwnershipTransfer` and `PendingAdminTransfer` (EVM has no expiration)
- Make `expirationBlock` parameter `number | undefined` in `transferOwnership()` and `transferAdminRole()` signatures
- Add `ADMIN_TRANSFER_CANCELED`, `ADMIN_DELAY_CHANGE_SCHEDULED`, `ADMIN_DELAY_CHANGE_CANCELED` to `HistoryChangeType`
- Add `accessControlIndexerUrl` to `BaseNetworkConfig` for feature-specific indexer endpoints across all ecosystems
