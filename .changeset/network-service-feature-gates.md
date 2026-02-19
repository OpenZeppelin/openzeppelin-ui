---
"@openzeppelin/ui-types": minor
"@openzeppelin/ui-utils": minor
"@openzeppelin/ui-renderer": patch
---

Add network service feature gate mechanism

- Add optional `requiredFeature` property to `NetworkServiceForm` interface
- Add `filterEnabledServiceForms()` utility that gates forms behind `AppConfigService` feature flags
- Apply filtering in `NetworkSettingsDialog` to hide service tabs when the feature flag is not enabled
