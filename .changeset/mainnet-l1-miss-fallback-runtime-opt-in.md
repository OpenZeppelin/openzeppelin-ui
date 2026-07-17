---
'@openzeppelin/ui-react': minor
---

Add mainnet-L1 miss-fallback consumer opt-in runtime wiring (initiative 003, SF-4).

Exports `createResolveRuntime`, `useResolveRuntime`, `DEFAULT_RUNTIME_CREATION_CONFIG`, `buildCreateRuntimeOptions`, and `isMainnetL1MissFallbackEnabled`. Opt-in threads `enableMainnetL1MissFallback: true` to `EcosystemExport.createRuntime` only when explicitly enabled; default OFF omits the `nameResolution` slice entirely.

`RuntimeProvider` now fully disposes cached runtimes when the `resolveRuntime` callback identity changes (INV-218) — registry flush, loading reset, and deferred `dispose()` — so toggling fallback opt-in or swapping factory wiring cannot serve stale adapter capabilities from a prior config.

Resolution query cache keys now include a stable per-active-runtime-instance id via `getRuntimeInstanceId` (INV-230), so toggling the opt-in — which recreates runtimes through INV-218 — forces forward and reverse re-resolution instead of serving stale cached names (fixes stale reverse displays and one-way toggle behavior).
