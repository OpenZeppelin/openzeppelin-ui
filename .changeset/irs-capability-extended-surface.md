---
"@openzeppelin/ui-types": minor
---

Extend `IRSCapability` with factory identity lookup, key-purpose probe, and holder management-key grant.

Adds `getFactoryIdentity`, `hasIdentityKeyPurpose`, and `grantHolderManagementKey` with discriminated read results (`read_failed` distinct from negative answers). Aligns the shared capability contract with adapter-evm 2.4.0+ so consumers no longer need structural casts at the IRS boundary.

**Breaking for implementors:** any external `IRSCapability` implementor must now provide all three members or fail to compile; consumers calling the capability are unaffected. No in-repo or in-adapters implementor is impacted today (only adapter-evm implements IRS, and it already ships these methods), so practical blast radius is limited to out-of-tree implementations.
