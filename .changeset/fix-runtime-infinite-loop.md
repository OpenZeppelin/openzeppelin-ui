---
"@openzeppelin/ui-react": patch
---

Prevent infinite retry loop in RuntimeProvider when adapter loading fails

When `resolveRuntime` rejected (e.g. due to a peer-dependency version mismatch),
the provider would remove the network from `loadingNetworks`, which re-memoised
`getRuntimeForNetwork`, which re-triggered the consumer's effect, restarting the
failed load indefinitely. A `failedNetworksRef` now tracks permanently-failed
networks so they are not retried. The set resets when `resolveRuntime` changes,
allowing recovery after the host app fixes the underlying issue.
