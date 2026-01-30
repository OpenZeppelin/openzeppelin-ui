---
'@openzeppelin/ui-types': minor
---

Add `getDefaultServiceConfig` method to `ContractAdapter` interface

This new required method enables adapters to provide default service configuration values for proactive network service health checks. The method returns the default endpoint values for a given service (e.g., RPC URL, indexer URLs) extracted from the network configuration.

**New interface method:**

```typescript
getDefaultServiceConfig(serviceId: string): Record<string, unknown> | null;
```

This method is used by the UI Builder to test network service connectivity when a network is selected, displaying user-friendly error banners before users attempt operations that would fail due to service outages.
