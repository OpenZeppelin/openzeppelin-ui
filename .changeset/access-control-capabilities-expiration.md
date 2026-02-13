---
'@openzeppelin/ui-types': minor
---

Add chain-agnostic capability flags, expiration metadata, and new service methods

- Add optional capability flags to `AccessControlCapabilities`: `hasRenounceOwnership`, `hasRenounceRole`, `hasCancelAdminTransfer`, `hasAdminDelayManagement`
- Add `ExpirationMetadata` interface with `mode` ('required' | 'none' | 'contract-managed'), `label`, `unit`, and `currentValue`
- Add `AdminDelayInfo` interface and optional `delayInfo` field to `AdminInfo`
- Add optional methods to `AccessControlService`: `renounceOwnership`, `renounceRole`, `cancelAdminTransfer`, `changeAdminDelay`, `rollbackAdminDelay`, `getExpirationMetadata`
